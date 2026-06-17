try:
    import torch
    import torch.nn as nn
    from torchvision import models, transforms
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from PIL import Image
import json
import os
import io

MODEL_PATH   = os.path.join(os.path.dirname(__file__), "../ai/model/agrovision.pth")
CLASSES_PATH = os.path.join(os.path.dirname(__file__), "../ai/class_names.json")

# Clés = noms exacts des dossiers (PlantVillage + Cassava custom)
DISEASE_INFO_FR = {
    # ── Manioc (Cassava) ──────────────────────────────────────────────────────
    "Cassava___bacterial_blight": {
        "nom": "Bactériose du manioc", "gravite": "CRITIQUE",
        "cause": "Bactérie Xanthomonas axonopodis pv. manihotis. Se propage par boutures infectées.",
        "traitement": "Arracher et brûler les plants infectés. Bouillie bordelaise sur plants voisins.",
        "prevention": "Boutures certifiées saines, rotation 2-3 ans, éviter les blessures sur tiges.",
    },
    "Cassava___brown_streak_disease": {
        "nom": "Striure brune du manioc (CBSD)", "gravite": "CRITIQUE",
        "cause": "Virus CBSV/UCBSV transmis par l'aleurode Bemisia tabaci.",
        "traitement": "Aucun traitement curatif. Éliminer et brûler immédiatement les plants atteints.",
        "prevention": "Boutures certifiées IITA, contrôle des aleurodes (imidaclopride), variétés NASE 14.",
    },
    "Cassava___green_mottle": {
        "nom": "Marbrure verte du manioc", "gravite": "MOYEN",
        "cause": "Virus CMV transmis par pucerons. Favorisé par temps chaud.",
        "traitement": "Retirer les feuilles atteintes. Insecticide contre pucerons vecteurs.",
        "prevention": "Contrôle des pucerons au pyrèthre naturel. Éviter les monocultures.",
    },
    "Cassava___healthy": {
        "nom": "Manioc sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Fertilisation NPK équilibrée, désherbage, irrigation modérée.",
    },
    "Cassava___mosaic_disease": {
        "nom": "Mosaïque du manioc (CMD)", "gravite": "CRITIQUE",
        "cause": "Virus CMD transmis par aleurodes Bemisia tabaci. Maladie la plus dévastatrice du manioc en Afrique.",
        "traitement": "Arracher les plants atteints immédiatement. Pas de traitement curatif.",
        "prevention": "Boutures certifiées IITA TMS 30572. Lutte contre aleurodes. Ne jamais replanter depuis un champ infecté.",
    },
    # ── Maïs (Corn) ───────────────────────────────────────────────────────────
    "Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot": {
        "nom": "Cercosporiose du maïs", "gravite": "MOYEN",
        "cause": "Champignon Cercospora zeae-maydis. Humidité élevée et rosée nocturne.",
        "traitement": "Fongicide triazole ou strobilurine dès apparition des taches.",
        "prevention": "Rotation des cultures, variétés résistantes, bonne aération.",
    },
    "Corn_(maize)___Common_rust_": {
        "nom": "Rouille commune du maïs", "gravite": "MOYEN",
        "cause": "Champignon Puccinia sorghi, favorisé par temps humide et frais.",
        "traitement": "Mancozèbe (2g/L) ou propiconazole. Répéter tous les 10 jours.",
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
        "prevention": "Fertilisation équilibrée NPK, surveillance hebdomadaire.",
    },
    # ── Tomate (Tomato) ───────────────────────────────────────────────────────
    "Tomato___Bacterial_spot": {
        "nom": "Tache bactérienne de la tomate", "gravite": "MOYEN",
        "cause": "Bactérie Xanthomonas campestris pv. vesicatoria.",
        "traitement": "Bouillie bordelaise ou streptomycine. Retirer feuilles atteintes.",
        "prevention": "Semences saines, rotation, éviter arrosage foliaire.",
    },
    "Tomato___Early_blight": {
        "nom": "Alternariose de la tomate", "gravite": "MOYEN",
        "cause": "Champignon Alternaria solani.",
        "traitement": "Mancozèbe 2g/L ou chlorothalonil tous les 7 jours.",
        "prevention": "Espacement 50cm, paillage du sol, rotation.",
    },
    "Tomato___Late_blight": {
        "nom": "Mildiou de la tomate", "gravite": "CRITIQUE",
        "cause": "Oomycète Phytophthora infestans. Très contagieux par temps humide.",
        "traitement": "Métalaxyl + mancozèbe dès apparition. Urgence 24h.",
        "prevention": "Variétés résistantes, éviter excès humidité foliaire.",
    },
    "Tomato___Leaf_Mold": {
        "nom": "Moisissure foliaire de la tomate", "gravite": "MOYEN",
        "cause": "Champignon Passalora fulva. Favorisé par forte humidité.",
        "traitement": "Fongicide cuivre ou chlorothalonil. Aérer la serre.",
        "prevention": "Réduire humidité, taille des feuilles basses.",
    },
    "Tomato___Septoria_leaf_spot": {
        "nom": "Septoriose de la tomate", "gravite": "MOYEN",
        "cause": "Champignon Septoria lycopersici.",
        "traitement": "Mancozèbe ou cuivre toutes les semaines.",
        "prevention": "Éviter arrosage par aspersion, paillage.",
    },
    "Tomato___Spider_mites Two-spotted_spider_mite": {
        "nom": "Acarien tétranyque de la tomate", "gravite": "MOYEN",
        "cause": "Acarien Tetranychus urticae. Favorisé par sécheresse et chaleur.",
        "traitement": "Acaricide abamectine ou soufre mouillable.",
        "prevention": "Irrigation régulière, favoriser acariens prédateurs.",
    },
    "Tomato___Target_Spot": {
        "nom": "Tache cible de la tomate", "gravite": "MOYEN",
        "cause": "Champignon Corynespora cassiicola.",
        "traitement": "Fongicide triazole. Retirer feuilles atteintes.",
        "prevention": "Rotation, bonne aération, éviter blessures.",
    },
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus": {
        "nom": "Virus jaunissement feuilles tomate (TYLCV)", "gravite": "CRITIQUE",
        "cause": "Virus transmis par aleurodes Bemisia tabaci.",
        "traitement": "Aucun traitement curatif. Arracher plants infectés.",
        "prevention": "Insecticides contre aleurodes, filets anti-insectes, variétés résistantes.",
    },
    "Tomato___Tomato_mosaic_virus": {
        "nom": "Mosaïque de la tomate (ToMV)", "gravite": "CRITIQUE",
        "cause": "Virus très contagieux par contact, outils, mains.",
        "traitement": "Arracher et brûler plants infectés. Désinfecter outils.",
        "prevention": "Semences traitées, hygiène stricte, variétés résistantes.",
    },
    "Tomato___healthy": {
        "nom": "Tomate saine", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Surveillance hebdomadaire, fertilisation équilibrée.",
    },
    # ── Pomme de terre (Potato) ───────────────────────────────────────────────
    "Potato___Early_blight": {
        "nom": "Alternariose de la pomme de terre", "gravite": "MOYEN",
        "cause": "Champignon Alternaria solani.",
        "traitement": "Mancozèbe ou chlorothalonil tous les 7-10 jours.",
        "prevention": "Rotation 3 ans, variétés résistantes, drainage.",
    },
    "Potato___Late_blight": {
        "nom": "Mildiou de la pomme de terre", "gravite": "CRITIQUE",
        "cause": "Oomycète Phytophthora infestans. Maladie historique (famine irlandaise).",
        "traitement": "Métalaxyl + mancozèbe en urgence. Traitement préventif recommandé.",
        "prevention": "Semences certifiées, fongicide préventif, drainage du sol.",
    },
    "Potato___healthy": {
        "nom": "Pomme de terre saine", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Rotation des cultures, bonne fertilisation.",
    },
    # ── Poivron (Pepper) ──────────────────────────────────────────────────────
    "Pepper,_bell___Bacterial_spot": {
        "nom": "Tache bactérienne du poivron", "gravite": "MOYEN",
        "cause": "Bactérie Xanthomonas campestris.",
        "traitement": "Bouillie bordelaise ou streptomycine.",
        "prevention": "Semences saines, rotation, éviter arrosage foliaire.",
    },
    "Pepper,_bell___healthy": {
        "nom": "Poivron sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Surveillance régulière.",
    },
    # ── Raisin (Grape) ────────────────────────────────────────────────────────
    "Grape___Black_rot": {
        "nom": "Pourriture noire du raisin", "gravite": "CRITIQUE",
        "cause": "Champignon Guignardia bidwellii.",
        "traitement": "Fongicide captan ou myclobutanil dès débourrement.",
        "prevention": "Taille sanitaire, éliminer momies, bonne aération.",
    },
    "Grape___Esca_(Black_Measles)": {
        "nom": "Esca (rougeot parasitaire)", "gravite": "CRITIQUE",
        "cause": "Complexe fongique (Phaeomoniella, Phaeoacremonium).",
        "traitement": "Aucun traitement curatif. Tailler et brûler bois infecté.",
        "prevention": "Protéger les plaies de taille, arsénite de soude interdit.",
    },
    "Grape___Leaf_blight_(Isariopsis_Leaf_Spot)": {
        "nom": "Brûlure foliaire du raisin", "gravite": "MOYEN",
        "cause": "Champignon Pseudocercospora vitis.",
        "traitement": "Fongicide cuivre ou mancozèbe.",
        "prevention": "Bonne aération du feuillage, éviter excès humidité.",
    },
    "Grape___healthy": {
        "nom": "Raisin sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Taille régulière, surveillance.",
    },
    # ── Pomme (Apple) ─────────────────────────────────────────────────────────
    "Apple___Apple_scab": {
        "nom": "Tavelure du pommier", "gravite": "MOYEN",
        "cause": "Champignon Venturia inaequalis.",
        "traitement": "Fongicide dithiocarbamate ou triazole dès débourrement.",
        "prevention": "Ramasser feuilles mortes, variétés résistantes.",
    },
    "Apple___Black_rot": {
        "nom": "Pourriture noire du pommier", "gravite": "CRITIQUE",
        "cause": "Champignon Botryosphaeria obtusa.",
        "traitement": "Captan ou myclobutanil. Tailler parties infectées.",
        "prevention": "Taille sanitaire, éliminer bois mort.",
    },
    "Apple___Cedar_apple_rust": {
        "nom": "Rouille gymnosporange du pommier", "gravite": "MOYEN",
        "cause": "Champignon Gymnosporangium juniperi-virginianae.",
        "traitement": "Fongicide myclobutanil ou trifloxystrobine.",
        "prevention": "Éviter plantation près de cèdres/genévriers.",
    },
    "Apple___healthy": {
        "nom": "Pommier sain", "gravite": "SAIN",
        "cause": "Aucune maladie détectée.",
        "traitement": "Aucun traitement nécessaire.",
        "prevention": "Surveillance saisonnière, taille régulière.",
    },
    # ── Autres cultures saines ────────────────────────────────────────────────
    "Blueberry___healthy":              {"nom": "Myrtille saine",      "gravite": "SAIN", "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Surveillance régulière."},
    "Cherry_(including_sour)___healthy":{"nom": "Cerisier sain",       "gravite": "SAIN", "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Taille annuelle."},
    "Cherry_(including_sour)___Powdery_mildew": {
        "nom": "Oïdium du cerisier", "gravite": "MOYEN",
        "cause": "Champignon Podosphaera clandestina.",
        "traitement": "Soufre mouillable ou myclobutanil.",
        "prevention": "Bonne aération, éviter excès d'azote.",
    },
    "Orange___Haunglongbing_(Citrus_greening)": {
        "nom": "Huanglongbing (HLB) — maladie du verdissement", "gravite": "CRITIQUE",
        "cause": "Bactérie Candidatus Liberibacter asiaticus transmise par psylle.",
        "traitement": "Aucun traitement curatif. Arracher les arbres infectés.",
        "prevention": "Contrôle des psylles, plants certifiés, quarantaine stricte.",
    },
    "Peach___Bacterial_spot":   {"nom": "Tache bactérienne du pêcher", "gravite": "MOYEN",  "cause": "Xanthomonas arboricola.", "traitement": "Bouillie bordelaise.", "prevention": "Variétés résistantes."},
    "Peach___healthy":          {"nom": "Pêcher sain",                 "gravite": "SAIN",   "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Taille et surveillance."},
    "Raspberry___healthy":      {"nom": "Framboisier sain",            "gravite": "SAIN",   "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Bonne drainage."},
    "Soybean___healthy":        {"nom": "Soja sain",                   "gravite": "SAIN",   "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Rotation légumineuses."},
    "Squash___Powdery_mildew":  {"nom": "Oïdium du courge",            "gravite": "MOYEN",  "cause": "Champignon Podosphaera xanthii.", "traitement": "Soufre ou bicarbonate.", "prevention": "Aération, éviter excès humidité."},
    "Strawberry___Leaf_scorch": {"nom": "Brûlure foliaire de la fraise","gravite": "MOYEN", "cause": "Champignon Diplocarpon earlianum.", "traitement": "Captan ou myclobutanil.", "prevention": "Rotation, paillage."},
    "Strawberry___healthy":     {"nom": "Fraisier sain",               "gravite": "SAIN",   "cause": "Aucune maladie.", "traitement": "Aucun.", "prevention": "Surveillance régulière."},
}

_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
]) if TORCH_AVAILABLE else None

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
        result["note"] = "Modèle en cours d'entraînement — résultat de démonstration"
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
        "note":       "Modèle en cours d'entraînement — résultat de démonstration",
    }


def get_image_context_for_llm(diagnosis: dict) -> str:
    return (
        f"Maladie détectée : {diagnosis['maladie']} "
        f"(confiance {diagnosis['confiance']}%, gravité {diagnosis['gravite']}). "
        f"Cause : {diagnosis['cause']}"
    )
