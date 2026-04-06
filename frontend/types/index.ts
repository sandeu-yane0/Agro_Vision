// ╔══════════════════════════════════════════════════════════╗
// ║         AgroVision AI — Types TypeScript centralisés     ║
// ╚══════════════════════════════════════════════════════════╝

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string; // "HH:MM"
  imageUri?: string; // si l'utilisateur a joint une photo
  messageType: "text" | "diagnosis" | "calculator" | "info";
}

export interface Conversation {
  id: string;
  title: string; // ex: "Maladie du maïs - 18 mars"
  preview: string; // dernier message tronqué
  date: string;
  messages: Message[];
}

export interface MarketPrice {
  culture: string;
  emoji: string; // "🌽" "🥜" etc.
  prix_kg: number;
  unite: string;
  marche: string;
  tendance: "up" | "down" | "stable";
  variation: number; // ex: +5 ou -3 (FCFA)
  lastUpdated: string;
}

export interface DiagnosisResult {
  maladie: string;
  confiance: number;
  gravite: "LÉGER" | "MOYEN" | "CRITIQUE" | "SAIN";
  cause: string;
  traitement: string;
  prevention: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Suggestion {
  id: string;
  text: string;
  icon: string;
}
