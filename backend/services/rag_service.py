"""
Service RAG (Retrieval-Augmented Generation) pour AgroVision.
Enrichit les réponses du LLM avec des données locales IRAD/MINADER.

Fonctionnement :
1. Base de connaissances locale (guides IRAD, bulletins MINADER)
2. Recherche par mots-clés dans la base
3. Injection du contexte pertinent dans le prompt LLM
"""

from typing import List, Dict

# ─── Base de connaissances locale IRAD/MINADER Cameroun ──────────────────────
# À enrichir progressivement avec les vrais bulletins PDF parsés
KNOWLEDGE_BASE: List[Dict] = [
    # ── Maïs ──────────────────────────────────────────────────────────────────
    {
        "tags": ["maïs", "mais", "plantation", "semis", "calendrier"],
        "source": "IRAD Cameroun — Guide cultural maïs 2024",
        "content": """CALENDRIER DE PLANTATION DU MAÏS AU CAMEROUN :
Zone Centre/Sud : Grande saison mars-avril, petite saison août-septembre.
Zone Littoral : Grande saison mars-avril, petite saison juillet-août.
Zone Ouest : Saison principale février-mars.
Zone Nord : Saison unique juin-juillet.
Espacement recommandé : 75cm entre lignes × 25cm entre plants (53 000 plants/ha).
Profondeur semis : 3-5 cm. Densité optimale : 2 graines/poquet.
Variétés IRAD recommandées : CMS 8704 (rendement 5-6t/ha), ATP-SR-Y, EVDT-W."""
    },
    {
        "tags": ["maïs", "mais", "engrais", "fertilisation", "npk"],
        "source": "MINADER — Recommandations fertilisation maïs 2025",
        "content": """FERTILISATION MAÏS (par hectare) :
Fumure de fond (à la plantation) : NPK 20-10-10 à 200 kg/ha.
Fumure d'entretien (30 jours après semis) : Urée 46% à 100 kg/ha.
2ème apport urée (60 jours) : 50 kg/ha.
Sol acide (pH < 5.5) : Chaulage préalable 1-2t/ha de calcaire.
Matière organique : Fumier composté 5-10t/ha recommandé.
Prix engrais Cameroun 2025 : NPK ~23 000 FCFA/sac 50kg, Urée ~18 000 FCFA/sac."""
    },
    {
        "tags": ["maïs", "mais", "maladie", "rouille", "blight", "traitement"],
        "source": "IRAD — Fiche phytosanitaire maïs",
        "content": """PRINCIPALES MALADIES DU MAÏS AU CAMEROUN :
1. Rouille commune (Puccinia sorghi) : Pustules orange sur feuilles.
   Traitement : Mancozèbe 2g/L ou Propiconazole 1mL/L. Coût ~5 000 FCFA/ha.
2. Brûlure foliaire (Exserohilum turcicum) : Lésions allongées grises.
   Traitement : Strobilurine + triazole. Traitement urgent.
3. Charbon (Ustilago maydis) : Masses noirâtres sur épi.
   Pas de traitement curatif. Arracher et brûler.
4. Chenille légionnaire (Spodoptera frugiperda) : Dégâts sur feuilles jeunes.
   Traitement : Coragen 20SC (0.4L/ha) ou Ampligo. Surveiller dès levée."""
    },
    # ── Manioc ────────────────────────────────────────────────────────────────
    {
        "tags": ["manioc", "plantation", "bouture", "calendrier"],
        "source": "IRAD — Guide cultural manioc 2024",
        "content": """CULTURE DU MANIOC AU CAMEROUN :
Plantation : Toute l'année en zone forêt, saison des pluies en zone soudano-sahélienne.
Boutures : 20-30 cm de longueur, 5-8 nœuds. Planter à 45° ou horizontalement.
Espacement : 1m × 1m (10 000 plants/ha) ou 1m × 0.8m (12 500 plants/ha).
Variétés résistantes mosaïque (IITA) : TMS 30572, IITA 8017, TME 419.
Durée cycle : 9-18 mois selon variété.
Rendement moyen : 8-15 t/ha (traditionnel 5-8 t/ha)."""
    },
    {
        "tags": ["manioc", "maladie", "mosaïque", "striure", "bactériose"],
        "source": "IRAD — Maladies manioc Cameroun",
        "content": """MALADIES MAJEURES DU MANIOC :
1. Mosaïque africaine (CMD) : Déformation et décoloration feuilles.
   Transmission par aleurodes. PAS de traitement curatif.
   Prévention : Boutures certifiées, variétés résistantes, lutte aleurodes.
2. Striure brune (CBSV) : Nécroses foliaires et tubéreuses.
   Très destructrice. Arracher immédiatement les plants atteints.
3. Bactériose (Xanthomonas) : Taches angulaires, exsudats gomme.
   Traitement cuivre préventif. Rotation 2-3 ans.
4. Cochenille farineuse : Colonies blanches sur tiges.
   Savon insecticide ou huile neem."""
    },
    # ── Cacao ─────────────────────────────────────────────────────────────────
    {
        "tags": ["cacao", "plantation", "entretien", "prix", "vente"],
        "source": "MINADER — Filière cacao Cameroun 2025",
        "content": """FILIÈRE CACAO CAMEROUN 2025 :
Prix bord champ (Centre) : 1 600-2 000 FCFA/kg selon qualité.
Prix officiel garanti : 1 500 FCFA/kg (MINADER).
Exportateurs agréés : SACO, TELCAR, CARGILL (régions Centre/Sud/Littoral).
Certification biologique : prime +200-400 FCFA/kg.
Récolte principale : octobre-mars (grande récolte).
Récolte intermédiaire : mai-juillet (petite récolte).
Rendement moyen : 400-600 kg/ha (potentiel 1 500 kg/ha avec bonnes pratiques).
Maladie principale : Pourriture brune (Phytophthora) — traiter au cuivre."""
    },
    # ── Rentabilité générale ───────────────────────────────────────────────────
    {
        "tags": ["rentabilité", "profit", "coût", "main d'oeuvre", "budget"],
        "source": "MINADER — Coûts de production Cameroun 2025",
        "content": """COÛTS DE PRODUCTION MOYENS CAMEROUN 2025 (par hectare) :
Main d'œuvre : 3 500-5 000 FCFA/jour. Labour mécanisé : 30 000-50 000 FCFA/ha.
Maïs : semences 15 000 + engrais 65 000 + MO 40 000 = ~120 000 FCFA/ha (hors mécanisation).
Manioc : boutures 10 000 + engrais 20 000 + MO 35 000 = ~65 000 FCFA/ha.
Tomate : semences 8 000 + engrais 60 000 + MO 80 000 = ~148 000 FCFA/ha.
Cacao (entretien) : engrais 25 000 + traitements 20 000 + MO 60 000 = ~105 000 FCFA/ha.
Crédit agricole : CAMCCUL, CCA, banques rurales (taux 12-18%/an)."""
    },
    # ── Météo agricole ────────────────────────────────────────────────────────
    {
        "tags": ["météo", "saison", "pluie", "irrigation", "climat"],
        "source": "Direction Météorologie Nationale Cameroun",
        "content": """SAISONS AGRICOLES CAMEROUN (zone Centre) :
Grande saison des pluies : mars-juin (400-600mm).
Petite saison sèche : juillet-août.
Petite saison des pluies : septembre-novembre.
Grande saison sèche : décembre-février.
Température moyenne Yaoundé : 23-26°C toute l'année.
Risques principaux : 
  - Saison pluies : maladies fongiques (mildiou, alternariose, rouille).
  - Saison sèche : stress hydrique, acariens, insectes piqueurs-suceurs.
Conseil : Appliquer fongicides préventifs en début saison pluies."""
    },
]

# ─── Fonction de recherche RAG ────────────────────────────────────────────────
def retrieve_context(query: str, max_results: int = 3) -> str:
    """
    Recherche les documents pertinents dans la base de connaissances.
    Retourne le contexte formaté pour injection dans le prompt LLM.
    """
    query_lower = query.lower()
    scored: List[tuple] = []

    for doc in KNOWLEDGE_BASE:
        score = sum(1 for tag in doc["tags"] if tag in query_lower)
        if score > 0:
            scored.append((score, doc))

    # Trier par pertinence décroissante
    scored.sort(key=lambda x: x[0], reverse=True)
    top_docs = [doc for _, doc in scored[:max_results]]

    if not top_docs:
        return ""

    context_parts = []
    for doc in top_docs:
        context_parts.append(
            f"[Source: {doc['source']}]\n{doc['content']}"
        )

    return "\n\n---\n\n".join(context_parts)


def enrich_prompt_with_rag(message: str) -> str:
    """
    Retourne le contexte RAG pertinent pour enrichir le prompt LLM.
    Retourne une chaîne vide si aucun contexte pertinent trouvé.
    """
    context = retrieve_context(message)
    if not context:
        return ""

    return f"\n\n📚 DONNÉES DE RÉFÉRENCE LOCALES (IRAD/MINADER) :\n{context}"
