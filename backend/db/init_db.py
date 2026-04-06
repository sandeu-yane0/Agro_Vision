"""
Script d'initialisation de la base de données.
Crée toutes les tables et insère les données initiales.

Usage : python db/init_db.py
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import engine, Base, init_db
from db.models import MarketPriceDB
from sqlalchemy.orm import sessionmaker
from datetime import datetime

def seed_market_prices(session):
    """Insère les prix du marché initiaux."""
    from services.market_service import PRIX_BASE

    # Vérifier si déjà peuplé
    existing = session.query(MarketPriceDB).count()
    if existing > 0:
        print(f"   Prix déjà présents ({existing} entrées) — skip")
        return

    for item in PRIX_BASE:
        db_item = MarketPriceDB(
            culture   = item["culture"],
            emoji     = item["emoji"],
            prix_kg   = item["prix_kg"],
            unite     = item["unite"],
            marche    = item["marche"],
            tendance  = item["tendance"],
            variation = item["variation"],
        )
        session.add(db_item)

    session.commit()
    print(f"   ✅ {len(PRIX_BASE)} prix du marché insérés")

def main():
    print("🌱 Initialisation base de données AgroVision...")

    if not engine:
        print("❌ DATABASE_URL non configurée dans .env")
        print("   Copier .env.example → .env et remplir DATABASE_URL")
        return

    # Créer les tables
    print("\n1. Création des tables...")
    init_db()

    # Peupler les données initiales
    print("\n2. Insertion données initiales...")
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        seed_market_prices(session)
        print("\n✅ Base de données prête !")
        print("   Lance maintenant : uvicorn main:app --reload")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        session.rollback()
    finally:
        session.close()

if __name__ == "__main__":
    main()
