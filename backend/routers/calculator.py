from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.calculator_service import calculate, format_result_for_llm

router = APIRouter()

class CalcRequest(BaseModel):
    culture: str
    superficie: float
    qualite: str = "moyen"   # "bon" | "moyen" | "faible"

@router.post("/calculator")
def calculator(req: CalcRequest):
    """Calcule la rentabilité d'une culture."""
    if req.superficie <= 0 or req.superficie > 1000:
        raise HTTPException(status_code=400, detail="Superficie invalide (0-1000 ha)")

    result = calculate(req.culture, req.superficie, req.qualite)

    if "erreur" in result:
        raise HTTPException(status_code=400, detail=result["erreur"])

    return {
        **result,
        "formatted": format_result_for_llm(result)
    }
