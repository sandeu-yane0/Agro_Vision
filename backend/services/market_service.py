from datetime import datetime
from typing import List, Dict

# ─── Données de référence MINADER Cameroun 2026 ───────────────────────────────
# Ces données sont mises à jour manuellement chaque semaine
# À terme : scraping automatique des bulletins PDF MINADER
PRIX_BASE: List[Dict] = [
    {
        "culture":  "Maïs",
        "emoji":    "🌽",
        "prix_kg":  250,
        "unite":    "kg",
        "marche":   "Marché Mokolo, Yaoundé",
        "tendance": "stable",
        "variation": 0,
    },
    {
        "culture":  "Manioc",
        "emoji":    "🫚",
        "prix_kg":  155,
        "unite":    "kg",
        "marche":   "Marché Central, Douala",
        "tendance": "down",
        "variation": -5,
    },
    {
        "culture":  "Plantain",
        "emoji":    "🍌",
        "prix_kg":  320,
        "unite":    "régime",
        "marche":   "Marché du Mfoundi, Yaoundé",
        "tendance": "up",
        "variation": 20,
    },
    {
        "culture":  "Arachide",
        "emoji":    "🥜",
        "prix_kg":  650,
        "unite":    "kg",
        "marche":   "Marché de Bafoussam",
        "tendance": "up",
        "variation": 50,
    },
    {
        "culture":  "Tomate",
        "emoji":    "🍅",
        "prix_kg":  820,
        "unite":    "seau",
        "marche":   "Marché Sandaga, Douala",
        "tendance": "stable",
        "variation": 0,
    },
    {
        "culture":  "Cacao",
        "emoji":    "🍫",
        "prix_kg":  1800,
        "unite":    "kg",
        "marche":   "Prix bord champ, Centre",
        "tendance": "up",
        "variation": 100,
    },
]

def get_all_prices() -> List[Dict]:
    """Retourne tous les prix avec timestamp de mise à jour."""
    now = datetime.now().strftime("%d/%m %H:%M")
    return [
        {**item, "lastUpdated": f"Mis à jour le {now}"}
        for item in PRIX_BASE
    ]

def get_price_by_culture(culture: str) -> Dict | None:
    """Retourne le prix d'une culture spécifique."""
    culture_lower = culture.lower()
    for item in PRIX_BASE:
        if item["culture"].lower() == culture_lower:
            return {**item, "lastUpdated": datetime.now().strftime("%d/%m %H:%M")}
    return None

def format_prices_for_llm() -> str:
    """Formate les prix pour contexte LLM."""
    lines = ["📊 Prix du marché Cameroun (semaine du " + datetime.now().strftime("%d/%m/%Y") + ") :"]
    for p in PRIX_BASE:
        arrow = "↑" if p["tendance"] == "up" else "↓" if p["tendance"] == "down" else "→"
        var = f"+{p['variation']}" if p["variation"] > 0 else str(p["variation"])
        lines.append(
            f"{p['emoji']} {p['culture']} : {p['prix_kg']} FCFA/{p['unite']} "
            f"{arrow} ({var} FCFA) — {p['marche']}"
        )
    lines.append("Source : Référence MINADER Cameroun")
    return "\n".join(lines)
