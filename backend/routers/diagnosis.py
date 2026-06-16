from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from services.vision_service import predict_disease, get_image_context_for_llm
from services.llm_service import get_llm_response

router = APIRouter()

class DiagnosisResponse(BaseModel):
    maladie: str
    confiance: float
    gravite: str
    cause: str
    traitement: str
    prevention: str
    conseil_llm: str

@router.post("/diagnosis", response_model=DiagnosisResponse)
async def diagnose(file: UploadFile = File(...)):
    """
    Analyse une image de plante et retourne le diagnostic de maladie.
    Utilise EfficientNet-B0 entraîné sur PlantVillage.
    """
    # Vérifier le type de fichier
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Le fichier doit être une image (JPEG, PNG, etc.)"
        )

    try:
        image_bytes = await file.read()

        # Prédiction vision IA
        diagnosis = predict_disease(image_bytes)

        # Enrichissement par le LLM (optionnel — dégradation gracieuse si hors-ligne)
        try:
            image_context = get_image_context_for_llm(diagnosis)
            conseil = get_llm_response(
                message=(
                    "En 2 à 3 phrases courtes, donne uniquement un conseil terrain concret et adapté "
                    "au contexte camerounais pour cette maladie. "
                    "Ne répète pas le diagnostic, la cause, le traitement ou la prévention déjà affichés. "
                    "Écris en prose simple, sans titre, sans liste, sans emojis."
                ),
                history=[],
                image_context=image_context,
            )
        except Exception:
            conseil = ""

        return DiagnosisResponse(
            maladie=diagnosis["maladie"],
            confiance=diagnosis["confiance"],
            gravite=diagnosis["gravite"],
            cause=diagnosis["cause"],
            traitement=diagnosis["traitement"],
            prevention=diagnosis["prevention"],
            conseil_llm=conseil,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur analyse image: {str(e)}")
