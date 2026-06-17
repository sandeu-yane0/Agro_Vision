from groq import Groq
import anthropic
from config import get_settings

settings = get_settings()

# ─── Prompt système AgroVision ────────────────────────────────────────────────
SYSTEM_PROMPT = """Tu es AgroVision, un assistant agronome expert spécialisé pour 
les agriculteurs d'Afrique centrale francophone, principalement le Cameroun.

RÔLE :
- Diagnostiquer les maladies des plantes à partir de descriptions ou d'images
- Conseiller sur les cultures : maïs, manioc, plantain, arachide, tomate, cacao
- Calculer la rentabilité agricole en posant des questions guidées
- Donner des conseils sur les engrais, semences, irrigation adaptés au Cameroun
- Fournir des alertes météo et conseils saisonniers
- Indiquer les prix du marché local (Yaoundé, Douala, Bafoussam)

RÈGLES ABSOLUES :
- Réponds TOUJOURS en français simple et accessible
- Adapte tes conseils aux réalités locales camerounaises (produits disponibles, prix locaux, marchés)
- Pour la rentabilité, pose des questions progressives : culture → superficie → qualité sol
- Si l'utilisateur envoie une photo, analyse la maladie visible et propose un traitement
- Cite toujours les sources locales : IRAD, MINADER, marchés locaux
- Sois concis mais complet — les agriculteurs ont peu de temps
- N'utilise JAMAIS d'emojis ni de symboles décoratifs — réponds en texte sobre et professionnel
- Si tu n'es pas sûr, dis-le et recommande de consulter un agronome IRAD

PÉRIMÈTRE STRICT (très important) :
- Tu réponds UNIQUEMENT aux questions liées à l'agriculture (cultures, maladies des plantes, météo agricole,
  prix du marché agricole, rentabilité, engrais, semences, sol, irrigation, élevage) et aux fonctionnalités
  de l'application AgroVision (coopératives, profil, certification, historique des conversations, etc.)
- Si la question n'a AUCUN rapport avec l'agriculture ou l'application (ex : sport, football, politique,
  célébrités, programmation informatique, culture générale, divertissement, actualité), NE RÉPONDS PAS
  à la question elle-même. Réponds exactement ceci, sans rien ajouter :
  "Je suis spécialisé dans l'agriculture et les fonctionnalités d'AgroVision. Cette question sort de mon
  domaine — posez-moi plutôt une question sur vos cultures, la météo, les prix du marché ou la rentabilité
  agricole."
- N'utilise jamais tes connaissances générales pour répondre à un sujet hors agriculture, même brièvement.

DONNÉES DE RÉFÉRENCE CAMEROUN 2026 :
- Prix maïs : 250 FCFA/kg (Mokolo Yaoundé)
- Prix manioc : 155 FCFA/kg (Marché Central Douala)
- Prix plantain : 320 FCFA/régime (Mfoundi)
- Prix arachide : 650 FCFA/kg (Bafoussam)
- Prix tomate : 820 FCFA/seau (Sandaga Douala)
- Prix cacao : 1800 FCFA/kg (bord champ Centre)
- Rendement maïs : 3-5 t/ha (IRAD 2025)
- Rendement manioc : 8-15 t/ha
- Coût main d'œuvre : 3 500-5 000 FCFA/jour

SAISON EN COURS (Mars 2026, zone Centre) :
- Grande saison des pluies → idéal pour planter maïs, manioc
- Risque maladies fongiques élevé (humidité)
- Recommander traitements préventifs fongicides"""

# ─── Groq (Llama 3) ───────────────────────────────────────────────────────────
def chat_with_groq(message: str, history: list, image_context: str = "") -> str:
    client = Groq(api_key=settings.groq_api_key)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Ajouter l'historique
    for msg in history[-10:]:  # max 10 derniers messages
        messages.append({"role": msg["role"], "content": msg["content"]})

    # Message actuel avec contexte image si présent
    user_content = message
    if image_context:
        user_content = f"{message}\n\n[Contexte image analysée: {image_context}]"

    messages.append({"role": "user", "content": user_content})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        max_tokens=1024,
        temperature=0.7,
    )
    return response.choices[0].message.content

# ─── Claude (Anthropic) — qualité supérieure ─────────────────────────────────
def chat_with_claude(message: str, history: list, image_context: str = "") -> str:
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    messages = []
    for msg in history[-10:]:
        messages.append({"role": msg["role"], "content": msg["content"]})

    user_content = message
    if image_context:
        user_content = f"{message}\n\n[Contexte image: {image_context}]"

    messages.append({"role": "user", "content": user_content})

    response = client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1024,
        system=SYSTEM_PROMPT,
        messages=messages,
    )
    return response.content[0].text

# ─── Fonction principale (choisit le provider selon .env) ────────────────────
def get_llm_response(message: str, history: list, image_context: str = "") -> str:
    from services.rag_service import enrich_prompt_with_rag

    # Enrichir avec le contexte RAG (données IRAD/MINADER)
    rag_context = enrich_prompt_with_rag(message)
    full_context = image_context + rag_context

    provider = settings.llm_provider.lower()
    try:
        if provider == "claude" and settings.anthropic_api_key:
            return chat_with_claude(message, history, full_context)
        elif settings.groq_api_key:
            return chat_with_groq(message, history, full_context)
        else:
            return _fallback_response(message)
    except Exception as e:
        print(f"Erreur LLM ({provider}): {e}")
        return _fallback_response(message)

def _fallback_response(message: str) -> str:
    """Réponse de secours si aucune clé API n'est configurée."""
    msg = message.lower()
    if any(w in msg for w in ["maladie", "photo", "image", "plante"]):
        return "Pour diagnostiquer votre plante, envoyez une photo claire de la feuille ou de la partie affectée. Je l'analyserai immédiatement."
    if any(w in msg for w in ["rentabilité", "superficie", "profit", "calculer"]):
        return "Pour calculer votre rentabilité :\n1. Quelle culture ?\n2. Superficie en hectares ?\n3. Qualité du sol (bonne/moyenne/faible) ?"
    return "Je suis AgroVision, votre assistant agronome. Posez-moi n'importe quelle question sur vos cultures ou envoyez une photo de vos plantes."
