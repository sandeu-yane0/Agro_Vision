from fastapi import APIRouter, Query
from services.market_service import get_all_prices, get_price_by_culture
from typing import Optional

router = APIRouter()

@router.get("/market")
def get_market():
    """Retourne les prix de toutes les cultures."""
    return get_all_prices()

@router.get("/market/{culture}")
def get_culture_price(culture: str):
    """Retourne le prix d'une culture spécifique."""
    price = get_price_by_culture(culture)
    if not price:
        return {"erreur": f"Culture '{culture}' non trouvée"}
    return price
