"""
Script de mise à jour des prix du marché en base de données.
À lancer manuellement chaque semaine pour mettre à jour les prix.

Usage : python scripts/seed_market.py
"""

import sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import engine, SessionLocal
from db.models import MarketPriceDB

# Prix mis à jour manuellement (source : bulletins MINADER hebdomadaires)
PRIX_ACTUELS = [
    {"culture": "Maïs",     "emoji": "🌽", "prix_kg": 250,  "unite": "kg",     "marche": "Marché Mokolo, Yaoundé",       "tendance": "stable", "variation": 0},
    {"culture": "Manioc",   "emoji": "🫚", "prix_kg": 155,  "unite": "kg",     "marche": "Marché Central, Douala",       "tendance": "down",   "variation": -5},
    {"culture": "Plantain", "emoji": "🍌", "prix_kg": 320,  "unite": "régime", "marche": "Marché du Mfoundi, Yaoundé",   "tendance": "up",     "variation": 20},
    {"culture": "Arachide", "emoji": "🥜", "prix_kg": 650,  "unite": "kg",     "marche": "Marché de Bafoussam",          "tendance": "up",     "variation": 50},
    {"culture": "Tomate",   "emoji": "🍅", "prix_kg": 820,  "unite": "seau",   "marche": "Marché Sandaga, Douala",       "tendance": "stable", "variation": 0},
    {"culture": "Cacao",    "emoji": "🍫", "prix_kg": 1800, "unite": "kg",     "marche": "Prix bord champ, Centre",      "tendance": "up",     "variation": 100},
]

def update_prices():
    if not engine:
        print("❌ Pas de base de données configurée")
        return

    session = SessionLocal()
    try:
        for item in PRIX_ACTUELS:
            existing = session.query(MarketPriceDB).filter_by(culture=item["culture"]).first()
            if existing:
                existing.prix_kg   = item["prix_kg"]
                existing.tendance  = item["tendance"]
                existing.variation = item["variation"]
                existing.marche    = item["marche"]
            else:
                session.add(MarketPriceDB(**item))

        session.commit()
        print(f"✅ {len(PRIX_ACTUELS)} prix mis à jour en base de données")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    update_prices()
