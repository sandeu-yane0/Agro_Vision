from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import get_settings

settings = get_settings()

# Connexion PostgreSQL (Supabase)
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
) if settings.database_url else None

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine) if engine else None
Base = declarative_base()

def get_db():
    if not SessionLocal:
        yield None
        return
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Créer toutes les tables si elles n'existent pas."""
    if engine:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables base de données créées")
    else:
        print("⚠️  Pas de base de données configurée — mode sans DB")
