"""
Script d'entraînement AgroVision — EfficientNet-B0
Combine PlantVillage (38 classes) + Cassava local (5 classes) = 43 classes
"""

import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, Dataset, random_split
import os
import json
import time

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_PLANTVILLAGE = "ai/data/plantvillage/plantvillage dataset/color"
DATA_CUSTOM       = "ai/data/custom/data"
MODEL_OUTPUT      = "ai/model/agrovision.pth"
CHECKPOINT_PATH   = "ai/model/checkpoint.pth"
CLASSES_OUTPUT    = "ai/class_names.json"

IMG_SIZE    = 224
BATCH_SIZE  = 32
EPOCHS      = 15
LR          = 1e-3
LR_FINETUNE = 1e-4
MAX_PER_CLASS = None  # pas de limite : dataset complet (entraînement GPU)
DEVICE      = torch.device("cuda" if torch.cuda.is_available() else "cpu")

print(f"🔧 Appareil utilisé : {DEVICE}")

# ─── Transformations ──────────────────────────────────────────────────────────
train_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE + 20, IMG_SIZE + 20)),
    transforms.RandomCrop(IMG_SIZE),
    transforms.RandomHorizontalFlip(),
    transforms.RandomVerticalFlip(p=0.2),
    transforms.RandomRotation(20),
    transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
    transforms.RandomGrayscale(p=0.05),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

val_transform = transforms.Compose([
    transforms.Resize((IMG_SIZE, IMG_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
])

# ─── Dataset fusionné avec remappage correct des labels ───────────────────────
class MergedDataset(Dataset):
    """
    Combine plusieurs ImageFolder en remappant les labels pour éviter
    les conflits (chaque dataset a ses propres indices 0..N).
    """
    def __init__(self, folder_paths: list[str], transform=None, max_per_class: int | None = None):
        self.samples   = []   # (chemin_image, label_global)
        self.classes   = []   # liste de tous les noms de classes

        for folder in folder_paths:
            if not os.path.exists(folder):
                print(f"⚠️  Dossier ignoré (introuvable) : {folder}")
                continue

            ds = datasets.ImageFolder(folder)
            offset = len(self.classes)          # décalage labels pour ce dataset

            # Ajouter les classes (vérifier les doublons)
            for cls in ds.classes:
                if cls not in self.classes:
                    self.classes.append(cls)

            # Compter les images déjà ajoutées par classe locale (si limite active)
            count_per_class: dict[int, int] = {}

            # Ajouter les samples avec label global = label_local + offset
            kept = 0
            for path, label in ds.samples:
                if max_per_class is not None:
                    n = count_per_class.get(label, 0)
                    if n >= max_per_class:
                        continue
                    count_per_class[label] = n + 1
                global_label = label + offset
                self.samples.append((path, global_label))
                kept += 1

            print(f"   ✅ {folder} → {kept}/{len(ds)} images, {len(ds.classes)} classes (offset={offset})")

        self.transform = transform
        from PIL import Image as PILImage
        self._loader = PILImage.open

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        img = self._loader(path).convert("RGB")
        if self.transform:
            img = self.transform(img)
        return img, label


# ─── Chargement dataset ───────────────────────────────────────────────────────
def load_dataset():
    print("📂 Chargement des datasets...")
    full_ds = MergedDataset(
        folder_paths=[DATA_PLANTVILLAGE, DATA_CUSTOM],
        transform=train_transform,
        max_per_class=MAX_PER_CLASS,
    )

    if len(full_ds.classes) < 2:
        raise ValueError(f"Trop peu de classes ({len(full_ds.classes)}). Vérifiez les chemins.")

    print(f"\n📊 Total : {len(full_ds)} images | {len(full_ds.classes)} classes")
    return full_ds, full_ds.classes


# ─── Entraînement ─────────────────────────────────────────────────────────────
def train():
    os.makedirs("ai/model", exist_ok=True)

    full_dataset, classes = load_dataset()
    num_classes = len(classes)

    # Sauvegarder le mapping classes
    with open(CLASSES_OUTPUT, "w", encoding="utf-8") as f:
        json.dump({str(i): name for i, name in enumerate(classes)}, f, indent=2, ensure_ascii=False)
    print(f"✅ {num_classes} classes sauvegardées → {CLASSES_OUTPUT}")

    # Split train/val 80/20 (seed fixe pour reprise cohérente après interruption)
    torch.manual_seed(42)
    train_size = int(0.8 * len(full_dataset))
    val_size   = len(full_dataset) - train_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

    # Appliquer val_transform aux données de validation
    class ValWrapper(Dataset):
        def __init__(self, subset, transform):
            self.subset    = subset
            self.transform = transform
        def __len__(self): return len(self.subset)
        def __getitem__(self, idx):
            path, label = self.subset.dataset.samples[self.subset.indices[idx]]
            from PIL import Image as PILImage
            img = PILImage.open(path).convert("RGB")
            return self.transform(img), label

    val_ds_wrapped = ValWrapper(val_ds, val_transform)

    # num_workers=0 obligatoire sur Windows ; 2 workers sur Colab/Linux pour accélérer
    NUM_WORKERS = 0 if os.name == "nt" else 2
    train_loader = DataLoader(train_ds,         batch_size=BATCH_SIZE, shuffle=True,  num_workers=NUM_WORKERS)
    val_loader   = DataLoader(val_ds_wrapped,   batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS)

    print(f"🏋️  Train: {train_size} | Val: {val_size}\n")

    # ── Modèle EfficientNet-B0 (transfer learning) ────────────────────────────
    model = models.efficientnet_b0(weights="IMAGENET1K_V1")
    for param in model.features.parameters():
        param.requires_grad = False

    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, 512),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes),
    )
    model = model.to(DEVICE)

    criterion = nn.CrossEntropyLoss(label_smoothing=0.1)
    optimizer = torch.optim.Adam(model.classifier.parameters(), lr=LR)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

    best_acc     = 0.0
    start_epoch  = 0
    start_phase  = 1

    # ── Reprise depuis un checkpoint si disponible ────────────────────────────
    if os.path.exists(CHECKPOINT_PATH):
        ckpt = torch.load(CHECKPOINT_PATH, map_location=DEVICE)
        model.load_state_dict(ckpt["model_state"])
        best_acc = ckpt["best_acc"]
        if ckpt.get("phase") == 1:
            optimizer.load_state_dict(ckpt["optimizer_state"])
            scheduler.load_state_dict(ckpt["scheduler_state"])
            start_epoch = ckpt["epoch"] + 1
            print(f"♻️  Reprise Phase 1 à l'epoch {start_epoch + 1} (best_acc={best_acc:.3f})")
        else:
            start_phase = 2
            print(f"♻️  Phase 1 déjà terminée, reprise en Phase 2 (best_acc={best_acc:.3f})")

    print(f"🚀 Phase 1 — Entraînement tête ({EPOCHS} epochs)...\n")

    for epoch in range(start_epoch if start_phase == 1 else EPOCHS, EPOCHS):
        t0 = time.time()
        model.train()
        train_loss, train_correct = 0.0, 0

        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            train_loss    += loss.item()
            train_correct += (outputs.argmax(1) == labels).sum().item()

        model.eval()
        val_correct = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                val_correct += (model(images).argmax(1) == labels).sum().item()

        train_acc = train_correct / train_size
        val_acc   = val_correct   / val_size
        scheduler.step()
        elapsed = time.time() - t0

        print(f"Epoch {epoch+1:02d}/{EPOCHS} | Loss: {train_loss/len(train_loader):.3f} | "
              f"Train: {train_acc:.3f} | Val: {val_acc:.3f} | {elapsed:.0f}s")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), MODEL_OUTPUT)
            print(f"  💾 Meilleur modèle sauvegardé (val={val_acc:.3f})")

        # Checkpoint de reprise (à chaque epoch, même sans amélioration)
        torch.save({
            "phase": 1,
            "epoch": epoch,
            "model_state": model.state_dict(),
            "optimizer_state": optimizer.state_dict(),
            "scheduler_state": scheduler.state_dict(),
            "best_acc": best_acc,
        }, CHECKPOINT_PATH)

    # ── Phase 2 : Fine-tuning complet ─────────────────────────────────────────
    print(f"\n🔬 Phase 2 — Fine-tuning complet (5 epochs)...")
    for param in model.features.parameters():
        param.requires_grad = True

    optimizer2 = torch.optim.Adam(model.parameters(), lr=LR_FINETUNE)
    scheduler2 = torch.optim.lr_scheduler.StepLR(optimizer2, step_size=2, gamma=0.5)

    start_epoch2 = 0
    if start_phase == 2 and os.path.exists(CHECKPOINT_PATH):
        ckpt = torch.load(CHECKPOINT_PATH, map_location=DEVICE)
        if ckpt.get("phase") == 2:
            optimizer2.load_state_dict(ckpt["optimizer_state"])
            scheduler2.load_state_dict(ckpt["scheduler_state"])
            start_epoch2 = ckpt["epoch"] + 1
            print(f"♻️  Reprise Phase 2 à l'epoch {start_epoch2 + 1}")

    for epoch in range(start_epoch2, 5):
        model.train()
        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer2.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer2.step()

        model.eval()
        val_correct = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                val_correct += (model(images).argmax(1) == labels).sum().item()

        val_acc = val_correct / val_size
        scheduler2.step()
        print(f"Fine-tune {epoch+1}/5 | Val: {val_acc:.3f}")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), MODEL_OUTPUT)
            print(f"  💾 Modèle amélioré sauvegardé ({val_acc:.3f})")

        # Checkpoint de reprise
        torch.save({
            "phase": 2,
            "epoch": epoch,
            "model_state": model.state_dict(),
            "optimizer_state": optimizer2.state_dict(),
            "scheduler_state": scheduler2.state_dict(),
            "best_acc": best_acc,
        }, CHECKPOINT_PATH)

    # Entraînement terminé : on peut supprimer le checkpoint de reprise
    if os.path.exists(CHECKPOINT_PATH):
        os.remove(CHECKPOINT_PATH)

    print(f"\n✅ Entraînement terminé ! Meilleure précision : {best_acc:.3f}")
    print(f"📦 Modèle : {MODEL_OUTPUT}")


if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    train()
