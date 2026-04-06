from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import chat, diagnosis, market, calculator, weather

app = FastAPI(
    title="AgroVision API",
    description="Backend IA agricole pour l'Afrique centrale francophone",
    version="1.0.0"
)

# CORS — autorise le frontend Expo (web + mobile)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(chat.router,       prefix="/api/v1", tags=["Chat"])
app.include_router(diagnosis.router,  prefix="/api/v1", tags=["Diagnostic"])
app.include_router(market.router,     prefix="/api/v1", tags=["Marché"])
app.include_router(calculator.router, prefix="/api/v1", tags=["Calculateur"])
app.include_router(weather.router,    prefix="/api/v1", tags=["Météo"])

@app.on_event("startup")
async def startup_event():
    """Initialisation au démarrage du serveur."""
    from db.database import init_db
    init_db()
    print("🌱 AgroVision API démarrée avec succès")

@app.get("/")
def root():
    return {
        "app": "AgroVision API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "ok"}
