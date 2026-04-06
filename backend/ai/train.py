"""
Script d'entraînement AgroVision — EfficientNet-B0 sur PlantVillage

ÉTAPES :
1. Télécharger PlantVillage : https://github.com/spMohanty/PlantVillage-Dataset
   ou via Kaggle : https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset
2. Placer les images dans : ai/data/plantvillage/
   Structure : ai/data/plantvillage/Tomato___Early_blight/image1.jpg ...
3. (Optionnel) Ajouter photos locales camerounaises dans ai/data/custom/
4. Lancer : python ai/train.py

Le modèle sera sauvegardé dans : ai/model/agrovision.pth
"""

import torch
import torch.nn as nn
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, random_split, ConcatDataset
import os
import json
import time

# ─── Configuration ────────────────────────────────────────────────────────────
DATA_PLANTVILLAGE = "ai/data/plantvillage"
DATA_CUSTOM       = "ai/data/custom"         # Photos camerounaises locales
MODEL_OUTPUT      = "ai/model/agrovision.pth"
CLASSES_OUTPUT    = "ai/class_names.json"

IMG_SIZE    = 224
BATCH_SIZE  = 32
EPOCHS      = 25
LR          = 1e-3
LR_FINETUNE = 1e-4
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

# ─── Chargement dataset ───────────────────────────────────────────────────────
def load_dataset():
    datasets_list = []

    if os.path.exists(DATA_PLANTVILLAGE):
        print(f"📂 Chargement PlantVillage depuis {DATA_PLANTVILLAGE}...")
        pv = datasets.ImageFolder(DATA_PLANTVILLAGE, transform=train_transform)
        datasets_list.append(pv)
        print(f"   → {len(pv)} images, {len(pv.classes)} classes")
    else:
        print(f"⚠️  PlantVillage non trouvé dans {DATA_PLANTVILLAGE}")
        print("   Téléchargez depuis : https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset")

    if os.path.exists(DATA_CUSTOM):
        print(f"📂 Chargement dataset local camerounais...")
        custom = datasets.ImageFolder(DATA_CUSTOM, transform=train_transform)
        datasets_list.append(custom)
        print(f"   → {len(custom)} images locales ajoutées")

    if not datasets_list:
        raise FileNotFoundError("Aucun dataset trouvé. Placez les images dans ai/data/plantvillage/")

    full_dataset = datasets_list[0] if len(datasets_list) == 1 else ConcatDataset(datasets_list)
    return full_dataset, datasets_list[0].classes

def train():
    os.makedirs("ai/model", exist_ok=True)

    # Charger dataset
    full_dataset, classes = load_dataset()
    num_classes = len(classes)

    # Sauvegarder le mapping classes
    class_to_idx = {str(i): name for i, name in enumerate(classes)}
    with open(CLASSES_OUTPUT, "w") as f:
        json.dump(class_to_idx, f, indent=2, ensure_ascii=False)
    print(f"✅ {num_classes} classes sauvegardées → {CLASSES_OUTPUT}")

    # Split train/val (80/20)
    train_size = int(0.8 * len(full_dataset))
    val_size   = len(full_dataset) - train_size
    train_ds, val_ds = random_split(full_dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, shuffle=True,  num_workers=2, pin_memory=True)
    val_loader   = DataLoader(val_ds,   batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)

    print(f"📊 Train: {train_size} images | Val: {val_size} images")

    # ── Modèle EfficientNet-B0 (transfer learning) ────────────────────────────
    model = models.efficientnet_b0(weights="IMAGENET1K_V1")

    # Phase 1 : geler toutes les couches de base
    for param in model.features.parameters():
        param.requires_grad = False

    # Remplacer la tête de classification
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

    best_acc = 0.0
    print(f"\n🚀 Phase 1 : Entraînement de la tête ({EPOCHS} epochs)...\n")

    for epoch in range(EPOCHS):
        t0 = time.time()

        # ── Entraînement ──
        model.train()
        train_loss, train_correct = 0.0, 0
        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer.step()
            train_loss += loss.item()
            train_correct += (model(images).argmax(1) == labels).sum().item()

        # ── Validation ──
        model.eval()
        val_correct = 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                val_correct += (model(images).argmax(1) == labels).sum().item()

        train_acc = train_correct / train_size
        val_acc   = val_correct / val_size
        scheduler.step()

        elapsed = time.time() - t0
        print(f"Epoch {epoch+1:02d}/{EPOCHS} | "
              f"Loss: {train_loss/len(train_loader):.3f} | "
              f"Train: {train_acc:.3f} | Val: {val_acc:.3f} | "
              f"{elapsed:.0f}s")

        if val_acc > best_acc:
            best_acc = val_acc
            torch.save(model.state_dict(), MODEL_OUTPUT)
            print(f"  💾 Meilleur modèle sauvegardé (val_acc={val_acc:.3f})")

    # ── Phase 2 : Fine-tuning complet ──────────────────────────────────────────
    print(f"\n🔬 Phase 2 : Fine-tuning complet (5 epochs)...")
    for param in model.features.parameters():
        param.requires_grad = True

    optimizer2 = torch.optim.Adam(model.parameters(), lr=LR_FINETUNE)
    scheduler2 = torch.optim.lr_scheduler.StepLR(optimizer2, step_size=2, gamma=0.5)

    for epoch in range(5):
        model.train()
        val_correct = 0
        for images, labels in train_loader:
            images, labels = images.to(DEVICE), labels.to(DEVICE)
            optimizer2.zero_grad()
            loss = criterion(model(images), labels)
            loss.backward()
            optimizer2.step()

        model.eval()
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

    print(f"\n✅ Entraînement terminé ! Meilleure précision : {best_acc:.3f}")
    print(f"📦 Modèle sauvegardé : {MODEL_OUTPUT}")

if __name__ == "__main__":
    train()
