from typing import Dict

# ─── Données réelles IRAD Cameroun 2025 ──────────────────────────────────────
RENDEMENTS_HA = {
    "maïs":     {"bon": 5000, "moyen": 3500, "faible": 2000},
    "manioc":   {"bon": 15000,"moyen": 10000,"faible": 6000},
    "plantain": {"bon": 12000,"moyen": 9000, "faible": 5000},
    "arachide": {"bon": 1500, "moyen": 1000, "faible": 600},
    "tomate":   {"bon": 25000,"moyen": 18000,"faible": 10000},
    "cacao":    {"bon": 900,  "moyen": 650,  "faible": 400},
}

COUTS_HA = {
    "maïs":     {"semences": 15000, "engrais": 45000, "main_oeuvre": 40000, "autres": 10000},
    "manioc":   {"semences": 10000, "engrais": 20000, "main_oeuvre": 35000, "autres": 8000},
    "plantain": {"semences": 25000, "engrais": 15000, "main_oeuvre": 45000, "autres": 12000},
    "arachide": {"semences": 20000, "engrais": 15000, "main_oeuvre": 30000, "autres": 7000},
    "tomate":   {"semences": 8000,  "engrais": 60000, "main_oeuvre": 80000, "autres": 20000},
    "cacao":    {"semences": 30000, "engrais": 25000, "main_oeuvre": 60000, "autres": 15000},
}

PRIX_MARCHE = {
    "maïs": 250, "manioc": 155, "plantain": 320,
    "arachide": 650, "tomate": 820, "cacao": 1800,
}

def calculate(culture: str, superficie: float, qualite: str = "moyen") -> Dict:
    """
    Calcule la rentabilité d'une culture.
    qualite: "bon" | "moyen" | "faible"
    """
    culture_key = culture.lower().strip()

    if culture_key not in RENDEMENTS_HA:
        return {"erreur": f"Culture '{culture}' non supportée. Cultures disponibles : " +
                ", ".join(RENDEMENTS_HA.keys())}

    qualite_key = qualite.lower()
    if qualite_key not in ["bon", "moyen", "faible"]:
        qualite_key = "moyen"

    # Calculs
    rendement_kg   = RENDEMENTS_HA[culture_key][qualite_key] * superficie
    couts          = COUTS_HA[culture_key]
    cout_total     = sum(couts.values()) * superficie
    prix_kg        = PRIX_MARCHE[culture_key]
    revenu         = rendement_kg * prix_kg
    profit         = revenu - cout_total
    point_mort_kg  = cout_total / prix_kg if prix_kg > 0 else 0
    marge_pct      = (profit / revenu * 100) if revenu > 0 else 0

    return {
        "culture":          culture.title(),
        "superficie":       superficie,
        "qualite_sol":      qualite_key,
        "rendement_estime": round(rendement_kg),
        "cout_semences":    round(couts["semences"] * superficie),
        "cout_engrais":     round(couts["engrais"] * superficie),
        "cout_main_oeuvre": round(couts["main_oeuvre"] * superficie),
        "cout_autres":      round(couts["autres"] * superficie),
        "cout_total":       round(cout_total),
        "prix_marche":      prix_kg,
        "revenu_estime":    round(revenu),
        "profit_net":       round(profit),
        "point_mort":       round(point_mort_kg),
        "marge_pourcentage": round(marge_pct, 1),
        "rentable":         profit > 0,
    }

def format_result_for_llm(result: Dict) -> str:
    """Formate le résultat pour présentation dans le chat."""
    if "erreur" in result:
        return result["erreur"]

    profit = result["profit_net"]
    rentable = "**Exploitation rentable.**" if result["rentable"] else "**Rentabilité négative** — optimisez vos intrants."

    return f"""**Résultats pour {result['superficie']} ha de {result['culture']}** (sol {result['qualite_sol']})

Rendement estimé : **{result['rendement_estime']:,} kg**

**Coûts de production :**
  • Semences : {result['cout_semences']:,} FCFA
  • Engrais : {result['cout_engrais']:,} FCFA
  • Main d'œuvre : {result['cout_main_oeuvre']:,} FCFA
  • Autres : {result['cout_autres']:,} FCFA
  • **Total : {result['cout_total']:,} FCFA**

Revenu estimé : **{result['revenu_estime']:,} FCFA**
Profit net : **{profit:,} FCFA**
Point mort : {result['point_mort']:,} kg à produire
Marge : {result['marge_pourcentage']}%
Prix marché : {result['prix_marche']} FCFA/kg

{rentable}

_Source : Données IRAD & MINADER Cameroun 2025_"""
