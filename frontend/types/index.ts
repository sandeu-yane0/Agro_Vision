// ╔══════════════════════════════════════════════════════════╗
// ║         AgroVision AI — Types TypeScript centralisés     ║
// ╚══════════════════════════════════════════════════════════╝

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  imageUri?: string;
  messageType: "text" | "diagnosis" | "calculator" | "info";
  pending?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  preview: string;
  date: string;
  messages: Message[];
}

export interface MarketPrice {
  culture: string;
  emoji: string;
  prix_kg: number;
  unite: string;
  marche: string;
  tendance: "up" | "down" | "stable";
  variation: number;
  lastUpdated: string;
}

export interface DiagnosisResult {
  maladie: string;
  confiance: number;
  gravite: "LÉGER" | "MOYEN" | "CRITIQUE" | "SAIN";
  cause: string;
  traitement: string;
  prevention: string;
  conseil_llm: string;
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

// ─── Profil agriculteur (Supabase) ────────────────────────────────────────

export interface FarmerProfile {
  id: string;
  full_name: string;
  region: string | null;
  cultures: string[];
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at?: string;
}

// ─── Messages directs entre agriculteurs ─────────────────────────────────

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export interface DMConversation {
  id: string;
  participant_1: string;
  participant_2: string;
  created_at: string;
  last_message_at: string;
  last_message: string | null;
}
