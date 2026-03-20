# 🌱 AgroVision — Backend FastAPI

Backend IA agricole pour l'Afrique centrale francophone.

## Stack technique

- **FastAPI** — API REST ultra-rapide
- **Groq (Llama 3.1)** — LLM gratuit pour le chat
- **EfficientNet-B0** — Vision IA diagnostic maladies (PlantVillage)
- **PostgreSQL (Supabase)** — Base de données
- **Open-Meteo** — Météo gratuite sans clé API

---

## Installation

```bash
# 1. Créer un environnement virtuel Python
python -m venv venv

# Windows
venv\Scripts\activate

# Mac/Linux
source venv/bin/activate

# 2. Installer les dépendances
pip install -r requirements.txt

# 3. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env avec tes clés API

# 4. Lancer le serveur
uvicorn main:app --reload --port 8000
```

L'API est accessible sur : http://localhost:8000
Documentation interactive : http://localhost:8000/docs

---

## Obtenir les clés API gratuites

### Groq (LLM — gratuit)
1. Va sur https://console.groq.com
2. Crée un compte gratuit
3. Génère une clé API
4. Copie dans .env : `GROQ_API_KEY=gsk_...`

### Supabase (Base de données — gratuit)
1. Va sur https://supabase.com
2. Crée un projet gratuit
3. Copie l'URL de connexion dans .env : `DATABASE_URL=postgresql://...`

---

## Entraîner le modèle IA

```bash
# 1. Télécharger PlantVillage depuis Kaggle
# https://www.kaggle.com/datasets/abdallahalidev/plantvillage-dataset

# 2. Extraire dans :
ai/data/plantvillage/
  ├── Corn_(maize)___Common_rust_/
  ├── Tomato___Early_blight/
  └── ...

# 3. (Optionnel) Ajouter photos locales camerounaises
ai/data/custom/
  ├── Manioc_Mosaique/
  └── ...

# 4. Lancer l'entraînement (GPU recommandé, ~2h sur CPU)
python ai/train.py
```

---

## Endpoints API

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/` | Statut API |
| GET | `/health` | Health check |
| POST | `/api/v1/chat` | Chat avec l'IA agronome |
| POST | `/api/v1/diagnosis` | Diagnostic maladie par image |
| GET | `/api/v1/market` | Prix du marché |
| POST | `/api/v1/calculator` | Calcul rentabilité |

---

## Relier au frontend

Dans `frontend/services/api.ts`, changer :

```typescript
// Développement (backend local)
const BASE_URL = "http://localhost:8000/api/v1";

// Production (après déploiement Railway/Render)
const BASE_URL = "https://ton-app.railway.app/api/v1";
```

---

## Déploiement Railway (gratuit)

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Déployer
railway init
railway up
```

---

## Structure

```
backend/
├── main.py              # Point d'entrée FastAPI
├── config.py            # Settings (.env)
├── requirements.txt
├── routers/
│   ├── chat.py          # POST /chat
│   ├── diagnosis.py     # POST /diagnosis
│   ├── market.py        # GET /market
│   └── calculator.py    # POST /calculator
├── services/
│   ├── llm_service.py       # Groq + Claude
│   ├── vision_service.py    # EfficientNet-B0
│   ├── weather_service.py   # Open-Meteo
│   ├── market_service.py    # Prix MINADER
│   └── calculator_service.py
├── ai/
│   ├── train.py         # Entraînement modèle
│   ├── model/           # agrovision.pth (après entraînement)
│   ├── data/            # Datasets (non inclus dans git)
│   └── class_names.json # Classes après entraînement
└── db/
    ├── database.py      # Connexion PostgreSQL
    └── models.py        # Tables SQLAlchemy
```
