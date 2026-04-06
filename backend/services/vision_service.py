import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import json
import os
import io

MODEL_PATH   = os.path.join(os.path.dirname(__file__), "../ai/model/agrovision.pth")
CLASSES_PATH = os.path.join(os.path.dirname(__file__), "../ai/class_names.json")

DISEASE_INFO_FR = {
    "Corn_(maize)___Common_rust_": {
        "nom": "Rouille commune du maïs", "gravite": "MOYEN",
        "cause": "Champignon Puccinia sorghi, favorisé par temps humide et frais.",
        "traitement": "Appliquer mancozèbe (2g/L) ou propiconazole. Répéter tous les 10 jours.",
        "prevention": "Variétés résistantes IRAD CMS 8704, rotation des cultures.",
    },
    "Corn_(maize)___Northern_Leaf_Blight": {
        "nom": "Brûlure foliaire du maïs", "gravite": "CRITIQUE",
        "cause": "Champignon Exserohilum turcicum. Humidité élevée.",
        "traitement": "Fongicide strobilurine ou triazole dès apparition.",
        "prevention": "Rotation maïs/légumineuses, éviter irrigation par aspersion.",
    },
    "Corn_(maize)___healthy": {
        "nom": "Maïs sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Maintenir fertilisation équilibrée NPK.",
    },
    "Cassava___Bacterial_Blight": {
        "nom": "Bactériose du manioc", "gravite": "CRITIQUE",
        "cause": "Bactérie Xanthomonas axonopodis.",
        "traitement": "Arracher et brûler les plants infectés.",
        "prevention": "Boutures certifiées saines, rotation 2-3 ans.",
    },
    "Cassava___Brown_Streak_Disease": {
        "nom": "Striure brune du manioc", "gravite": "CRITIQUE",
        "cause": "Virus CBSV transmis par aleurodes.",
        "traitement": "Éliminer les plants atteints immédiatement.",
        "prevention": "Boutures certifiées, lutte contre aleurodes.",
    },
    "Cassava___Green_Mite": {
        "nom": "Acarien vert du manioc", "gravite": "MOYEN",
        "cause": "Acarien Mononychellus tanajoa, favorisé par sécheresse.",
        "traitement": "Acaricide soufre ou abamectine. Irriguer si possible.",
        "prevention": "Variétés tolérantes, favoriser prédateurs naturels.",
    },
    "Cassava___Mosaic_Disease": {
        "nom": "Mosaïque du manioc", "gravite": "CRITIQUE",
        "cause": "Virus CMD transmis par aleurodes.",
        "traitement": "Arracher les plants atteints. Pas de traitement curatif.",
        "prevention": "Boutures saines certifiées IITA TMS 30572.",
    },
    "Tomato___Early_blight": {
        "nom": "Alternariose de la tomate", "gravite": "MOYEN",
        "cause": "Champignon Alternaria solani.",
        "traitement": "Mancozèbe 2g/L ou chlorothalonil tous les 7 jours.",
        "prevention": "Espacement 50cm, paillage du sol.",
    },
    "Tomato___Late_blight": {
        "nom": "Mildiou de la tomate", "gravite": "CRITIQUE",
        "cause": "Champignon Phytophthora infestans.",
        "traitement": "Métalaxyl + mancozèbe dès apparition. Urgence 24h.",
        "prevention": "Variétés résistantes, éviter excès humidité foliaire.",
    },
    "Tomato___healthy": {
        "nom": "Tomate saine", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Surveillance hebdomadaire.",
    },
    "Pepper,_bell___Bacterial_spot": {
        "nom": "Tache bactérienne du poivron", "gravite": "MOYEN",
        "cause": "Bactérie Xanthomonas campestris.",
        "traitement": "Bouillie bordelaise ou streptomycine.",
        "prevention": "Semences saines, rotation cultures.",
    },
    "Pepper,_bell___healthy": {
        "nom": "Poivron sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Surveiller régulièrement.",
    },
}

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
])

def predict_disease(image_bytes: bytes) -> dict:
    """
    Analyse une image et retourne le diagnostic.
    Utilise ai/predict.py pour la prédiction brute,
    puis enrichit avec les infos en français.
    """
    try:
        from ai.predict import predict as raw_predict
        raw = raw_predict(image_bytes)
        class_key = raw["disease"]
        confidence = raw["confidence"]
        is_mock = raw["is_mock"]
    except Exception:
        return _mock_prediction()

    info = DISEASE_INFO_FR.get(class_key, {
        "nom":        class_key.replace("_", " "),
        "gravite":    "MOYEN",
        "cause":      "Pathogène détecté. Consultez un agronome IRAD.",
        "traitement": "Isoler la plante et consulter un technicien.",
        "prevention": "Surveillance régulière et bonnes pratiques culturales.",
    })

    result = {
        "maladie":    info["nom"],
        "confiance":  confidence,
        "gravite":    info["gravite"],
        "cause":      info["cause"],
        "traitement": info["traitement"],
        "prevention": info["prevention"],
        "classe_raw": class_key,
    }
    if is_mock:
        result["note"] = "⚠️ Modèle en cours d'entraînement — résultat de démonstration"
    return result


def _mock_prediction() -> dict:
    return {
        "maladie":    "Rouille commune du maïs",
        "confiance":  82.5,
        "gravite":    "MOYEN",
        "cause":      "Champignon Puccinia sorghi, favorisé par temps humide.",
        "traitement": "Appliquer mancozèbe (2g/L) tous les 10 jours.",
        "prevention": "Variétés résistantes et rotation des cultures.",
        "classe_raw": "Corn_(maize)___Common_rust_",
        "note":       "⚠️ Modèle en cours d'entraînement — résultat de démonstration",
    }


def get_image_context_for_llm(diagnosis: dict) -> str:
    return (
        f"Maladie détectée : {diagnosis['maladie']} "
        f"(confiance {diagnosis['confiance']}%, gravité {diagnosis['gravite']}). "
        f"Cause : {diagnosis['cause']}"
    )
