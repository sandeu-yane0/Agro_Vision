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
  role: "agriculteur" | "admin";
  is_verified: boolean;
  is_suspended: boolean;
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

// ─── Signalements de comptes ──────────────────────────────────────────────

export interface AccountReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  reason: string;
  status: "pending" | "reviewed";
  created_at: string;
}

// ─── Coopératives agricoles ───────────────────────────────────────────────

export interface Cooperative {
  id: string;
  name: string;
  culture: string;
  description: string | null;
  founder_id: string;
  status: "active" | "suspended";
  created_at: string;
}

export interface CooperativeMember {
  id: string;
  cooperative_id: string;
  member_id: string;
  role: "founder" | "member";
  status: "pending" | "accepted" | "refused" | "requested";
  invited_at: string;
  responded_at: string | null;
}

export interface CooperativeMessage {
  id: string;
  cooperative_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

// ─── Notifications ─────────────────────────────────────────────────────────

export interface AppNotification {
  id: string;
  user_id: string;
  type:
    | "cooperative_invite"
    | "cooperative_join_request"
    | "cooperative_member_joined"
    | "cooperative_member_refused"
    | "certification_approved"
    | "certification_rejected"
    | "certification_revoked";
  title: string;
  body: string | null;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

// ─── Demandes de certification ────────────────────────────────────────────

export interface CertificationRequest {
  id: string;
  farmer_id: string;
  motivation: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  created_at: string;
  reviewed_at: string | null;
}
