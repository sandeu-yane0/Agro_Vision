import { MarketPrice, ChatMessage, Message } from "../types/index";
import { MARKET_DATA } from "../constants/data";

const BASE_URL = "http://localhost:8000/api/v1";

// ─── Réponses simulées intelligentes ───────────────────────────────────────

function getSimulatedResponse(message: string): string {
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("rentabilité") || lowerMsg.includes("superficie") || lowerMsg.includes("profit") || lowerMsg.includes("calcul")) {
    return `💰 **Calcul de Rentabilité**\n\nPour calculer votre rentabilité, j'ai besoin de quelques informations :\n\n1️⃣ Quelle est la superficie de votre exploitation ? (en hectares)\n2️⃣ Quelle culture souhaitez-vous analyser ?\n3️⃣ Quel est votre budget d'investissement estimé ?\n\nRépondez à ces questions et je ferai le calcul complet pour vous ! 📊`;
  }

  if (lowerMsg.includes("maladie") || lowerMsg.includes("tache") || lowerMsg.includes("jaune") || lowerMsg.includes("feuille") || lowerMsg.includes("photo") || lowerMsg.includes("analyser")) {
    return `📷 **Diagnostic de Maladie**\n\nPour diagnostiquer la maladie de votre culture, envoyez-moi une **photo** claire de la plante affectée.\n\nConseils pour une meilleure photo :\n• Prenez la photo en pleine lumière\n• Cadrez sur les zones touchées (feuilles, tiges, fruits)\n• La résolution doit être suffisante pour voir les détails\n\nAttendez mon analyse ! 🔬`;
  }

  if (lowerMsg.includes("engrais") || lowerMsg.includes("fertilisant") || lowerMsg.includes("npk")) {
    return `🌿 **Conseils Engrais**\n\nPour une fertilisation optimale au Cameroun :\n\n**Maïs :** NPK 20-10-10 au semis (200 kg/ha), puis Urée au tallage (100 kg/ha)\n\n**Manioc :** NPK 10-10-20 (150 kg/ha) — riche en potassium pour les tubercules\n\n**Cacao :** Fumure organique + NPK 12-12-17+2MgO (2 kg/pied/an)\n\n⚠️ Toujours incorporer l'engrais après une pluie ou irrigation pour éviter la brûlure.`;
  }

  if (lowerMsg.includes("planter") || lowerMsg.includes("semis") || lowerMsg.includes("période") || lowerMsg.includes("saison") || lowerMsg.includes("quand")) {
    return `📅 **Calendrier Agricole Cameroun**\n\n**Grande saison des pluies (mars–juin) :**\n• Maïs 🌽 — semis idéal en mars-avril\n• Arachides 🥜 — semis en mars-mai\n• Légumes verts — toute la saison\n\n**Petite saison (août–novembre) :**\n• Maïs 🌽 — 2ème cycle possible\n• Manioc 🥔 — plantation possible toute l'année\n\n**Saison sèche :** Privilégiez les cultures avec irrigation ou le stockage/transformation.`;
  }

  if (lowerMsg.includes("météo") || lowerMsg.includes("pluie") || lowerMsg.includes("climate") || lowerMsg.includes("climat")) {
    return `☁️ **Météo Agricole**\n\nLes prévisions météo agricoles pour votre région au Cameroun :\n\n🌧️ **Prochains 7 jours :** Pluies modérées attendues (15-25 mm)\n🌡️ **Températures :** 22–28°C (favorables)\n💨 **Vent :** Faible à modéré — bon pour la pollinisation\n\n✅ **Conseil :** Conditions favorables pour les traitements phytosanitaires. Évitez de traiter 24h avant les pluies prévues.\n\n⚠️ Consultez l'IRAD Cameroun pour des prévisions locales précises.`;
  }

  if (lowerMsg.includes("cacao") || lowerMsg.includes("café") || lowerMsg.includes("prix")) {
    return `📈 **Informations Prix**\n\nConsultez l'onglet **"Marché"** pour les prix en temps réel des cultures au Cameroun.\n\n**Tendances actuelles (2025) :**\n• Cacao : ~1 650 FCFA/kg (hausse mondiale)\n• Café Robusta : ~1 200 FCFA/kg (stable)\n• Maïs : ~185 FCFA/kg (bonne demande)\n\n💡 Les prix fluctuent selon les marchés locaux. Vérifiez régulièrement l'onglet Marché !`;
  }

  if (lowerMsg.includes("bonjour") || lowerMsg.includes("salut") || lowerMsg.includes("hello") || lowerMsg.includes("bonsoir")) {
    return `🌱 **Bonjour et bienvenue sur AgroVision !**\n\nJe suis votre agronome IA disponible 24h/24. Je peux vous aider avec :\n\n• 📷 **Diagnostic maladies** — Envoyez une photo\n• 💰 **Calcul rentabilité** — Analyse financière\n• 🌿 **Conseils culture** — Techniques et bonnes pratiques\n• ☁️ **Météo agricole** — Prévisions locales\n• 📈 **Prix du marché** — Cours en temps réel\n\nQue puis-je faire pour vous aujourd'hui ?`;
  }

  // Réponse générale agriculture camerounaise
  return `🌾 **Conseil AgroVision**\n\nMerci pour votre question sur l'agriculture camerounaise !\n\nPour vous donner les meilleurs conseils, pourriez-vous préciser :\n• Quelle est votre culture principale ?\n• Quelle est votre région (Centre, Littoral, Ouest, Nord, etc.) ?\n• Quel est le problème ou la demande spécifique ?\n\n💡 **Astuce :** Vous pouvez aussi envoyer une **photo** de votre culture pour un diagnostic précis, ou demander un **calcul de rentabilité** pour optimiser vos revenus.`;
}

// ─── API sendChatMessage ───────────────────────────────────────────────────

export async function sendChatMessage(
  message: string,
  imageUri: string | null,
  history: ChatMessage[]
): Promise<string> {
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, imageUri, history }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    return data.response ?? data.message ?? "Réponse reçue.";
  } catch {
    // Mode simulation : réponse intelligente basée sur mots-clés
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 800));
    return getSimulatedResponse(message);
  }
}

// ─── API getMarketPrices ───────────────────────────────────────────────────

export async function getMarketPrices(): Promise<MarketPrice[]> {
  try {
    const response = await fetch(`${BASE_URL}/market`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data: MarketPrice[] = await response.json();
    return data;
  } catch {
    // Fallback sur données statiques enrichies avec lastUpdated
    return MARKET_DATA.map((item) => ({
      ...item,
      lastUpdated: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    }));
  }
}

// ─── Génération du titre de conversation ──────────────────────────────────

export function generateConversationTitle(messages: Message[]): string {
  const firstUserMsg = messages.find((m) => m.role === "user");
  if (!firstUserMsg) return "Nouvelle conversation";

  const text = firstUserMsg.content.trim();
  const date = new Date().toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });

  return `${text.slice(0, 40)}${text.length > 40 ? "..." : ""} — ${date}`;
}
