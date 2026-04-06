from fastapi import APIRouter, Query
from services.weather_service import get_weather_forecast, format_weather_for_llm

router = APIRouter()

@router.get("/weather")
async def weather(ville: str = Query(default="yaoundé", description="Ville camerounaise")):
    """
    Retourne les prévisions météo agricoles pour une ville camerounaise.
    Utilise Open-Meteo API (gratuit, aucune clé requise).
    
    Villes disponibles : yaoundé, douala, bafoussam, garoua, bertoua, ebolowa, bafia
    """
    data = await get_weather_forecast(ville)
    return data

@router.get("/weather/text")
async def weather_text(ville: str = Query(default="yaoundé")):
    """Retourne la météo formatée en texte pour le LLM."""
    data = await get_weather_forecast(ville)
    return {"text": format_weather_for_llm(data)}
