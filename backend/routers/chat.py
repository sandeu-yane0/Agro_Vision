from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from services.llm_service import get_llm_response
from services.weather_service import get_weather_forecast, format_weather_for_llm
from services.market_service import format_prices_for_llm
from services.calculator_service import calculate, format_result_for_llm

router = APIRouter()

class ChatMessageIn(BaseModel):
    role: str      # "user" | "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    imageUri: Optional[str] = None
    history: List[ChatMessageIn] = []
    ville: Optional[str] = "yaoundé"

class ChatResponse(BaseModel):
    response: str

@router.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    """
    Endpoint principal du chat AgroVision.
    Gère : questions générales, météo, prix marché, calcul rentabilité.
    L'analyse d'image est gérée par /diagnosis.
    """
    try:
        msg = req.message.lower()
        history = [{"role": m.role, "content": m.content} for m in req.history]
        extra_context = ""

        # ── Contexte météo si demandé ──────────────────────────────────────────
        if any(w in msg for w in ["météo", "pluie", "temps", "climat", "température"]):
            weather = await get_weather_forecast(req.ville or "yaoundé")
            extra_context += "\n\n" + format_weather_for_llm(weather)

        # ── Contexte prix marché si demandé ───────────────────────────────────
        if any(w in msg for w in ["prix", "marché", "fcfa", "vente", "coût", "cout"]):
            extra_context += "\n\n" + format_prices_for_llm()

        # ── Calcul rentabilité automatique si données suffisantes ─────────────
        # Détecte les patterns : "1 ha de maïs" ou "superficie: 2ha, maïs"
        import re
        superficie_match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:ha|hectare)", msg)
        culture_match = None
        for culture in ["maïs", "mais", "manioc", "plantain", "arachide", "tomate", "cacao"]:
            if culture in msg:
                culture_match = culture.replace("mais", "maïs")
                break

        if superficie_match and culture_match:
            superficie = float(superficie_match.group(1).replace(",", "."))
            qualite = "bon" if "bon" in msg else "faible" if "faible" in msg else "moyen"
            result = calculate(culture_match, superficie, qualite)
            calc_context = format_result_for_llm(result)
            extra_context += f"\n\n[Calcul de rentabilité effectué automatiquement:\n{calc_context}]"

        # ── Appel LLM ─────────────────────────────────────────────────────────
        response = get_llm_response(
            message=req.message,
            history=history,
            image_context=extra_context,
        )

        return ChatResponse(response=response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur serveur: {str(e)}")
