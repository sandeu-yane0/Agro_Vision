"""
Module d'inférence standalone AgroVision.
Utilisé par vision_service.py pour la prédiction de maladies.
"""

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import json
import os
import io

# ─── Chemins ──────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, "model", "agrovision.pth")
CLASSES_PATH = os.path.join(BASE_DIR, "class_names.json")

# ─── Transformation image ─────────────────────────────────────────────────────
TRANSFORM = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std= [0.229, 0.224, 0.225]
    ),
])

# ─── Chargement modèle (singleton) ───────────────────────────────────────────
_model       = None
_class_names = None
_model_ready = False

def _load():
    global _model, _class_names, _model_ready

    if not os.path.exists(MODEL_PATH):
        print(f"⚠️  Modèle introuvable : {MODEL_PATH}")
        print("   → Lancez : python ai/train.py")
        _model_ready = False
        return

    if not os.path.exists(CLASSES_PATH):
        print(f"⚠️  class_names.json introuvable : {CLASSES_PATH}")
        _model_ready = False
        return

    with open(CLASSES_PATH, "r") as f:
        _class_names = json.load(f)

    num_classes = len(_class_names)

    # Reconstruire exactement l'architecture d'entraînement
    _model = models.efficientnet_b0(weights=None)
    in_features = _model.classifier[1].in_features
    _model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, 512),
        nn.ReLU(),
        nn.Dropout(p=0.2),
        nn.Linear(512, num_classes),
    )
    _model.load_state_dict(
        torch.load(MODEL_PATH, map_location=torch.device("cpu"))
    )
    _model.eval()
    _model_ready = True
    print(f"✅ Modèle chargé — {num_classes} classes, prêt pour inférence")

# Charger au démarrage du module
_load()

# ─── Fonction principale de prédiction ───────────────────────────────────────
def predict(image_bytes: bytes) -> dict:
    """
    Prédit la maladie d'une plante à partir d'une image en bytes.

    Args:
        image_bytes: contenu binaire de l'image (JPEG, PNG, etc.)

    Returns:
        dict avec keys: disease (str), confidence (float), is_mock (bool)
    """
    if not _model_ready:
        return _mock_result()

    try:
        image  = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        tensor = TRANSFORM(image).unsqueeze(0)

        with torch.no_grad():
            outputs = _model(tensor)
            probs   = torch.softmax(outputs, dim=1)[0]

        top_idx    = int(probs.argmax().item())
        confidence = round(float(probs[top_idx].item()) * 100, 1)
        disease    = _class_names.get(str(top_idx), "Unknown")

        # Top-3 prédictions pour debug
        top3_idx  = torch.topk(probs, 3).indices.tolist()
        top3      = [
            {"classe": _class_names.get(str(i), "?"), "score": round(float(probs[i].item()) * 100, 1)}
            for i in top3_idx
        ]

        return {
            "disease":    disease,
            "confidence": confidence,
            "top3":       top3,
            "is_mock":    False,
        }

    except Exception as e:
        print(f"Erreur prédiction: {e}")
        return _mock_result()


def _mock_result() -> dict:
    """Résultat de démonstration quand le modèle n'est pas entraîné."""
    return {
        "disease":    "Corn_(maize)___Common_rust_",
        "confidence": 84.2,
        "top3": [
            {"classe": "Corn_(maize)___Common_rust_",        "score": 84.2},
            {"classe": "Corn_(maize)___Northern_Leaf_Blight", "score": 9.1},
            {"classe": "Corn_(maize)___healthy",              "score": 6.7},
        ],
        "is_mock": True,
    }


# ─── Test CLI ─────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python predict.py <chemin_image>")
        sys.exit(1)

    path = sys.argv[1]
    with open(path, "rb") as f:
        result = predict(f.read())

    print(f"\n🔍 Résultat : {result['disease']}")
    print(f"   Confiance : {result['confidence']}%")
    print(f"   Mock      : {result['is_mock']}")
    print("\nTop 3 :")
    for r in result["top3"]:
        print(f"  {r['score']:5.1f}% — {r['classe']}")
