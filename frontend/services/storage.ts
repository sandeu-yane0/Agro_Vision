import AsyncStorage from "@react-native-async-storage/async-storage";
import { Conversation } from "../types/index";

const STORAGE_KEY_PREFIX = "@agrovision_conversations";

// Chaque agriculteur a son propre historique, cloisonné par son user.id Supabase.
// Sans userId (ex: avant connexion), on retombe sur une clé partagée "anonymous"
// pour ne jamais planter, mais cet historique n'est pas censé être consulté.
function storageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}_${userId}`;
}

// ─── Correction encodage double-UTF-8 ────────────────────────────────────────
// Corrige les chaînes stockées avec double encodage UTF-8 (ex: "ðŸ"·" → "📷")

function fixEncoding(str: string): string {
  if (!str || !/[-ÿ]/.test(str)) return str;
  try {
    const bytes = Uint8Array.from({ length: str.length }, (_, i) => str.charCodeAt(i) & 0xFF);
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded.length < str.length ? decoded : str;
  } catch {
    return str;
  }
}

function fixConversation(conv: Conversation): Conversation {
  return {
    ...conv,
    title:   fixEncoding(conv.title),
    preview: fixEncoding(conv.preview),
    messages: conv.messages.map((m) => ({
      ...m,
      content: fixEncoding(m.content),
    })),
  };
}


// ─── Sauvegarder une conversation ─────────────────────────────────────────

export async function saveConversation(userId: string, conv: Conversation): Promise<void> {
  try {
    const existing = await getAllConversations(userId);
    const index = existing.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      existing[index] = conv;
    } else {
      existing.unshift(conv);
    }
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(existing));
  } catch (error) {
    console.error("[Storage] saveConversation:", error);
  }
}

// ─── Récupérer toutes les conversations ───────────────────────────────────

export async function getAllConversations(userId: string): Promise<Conversation[]> {
  try {
    const data = await AsyncStorage.getItem(storageKey(userId));
    if (!data) return [];
    const convs = JSON.parse(data) as Conversation[];
    return convs.map(fixConversation);
  } catch (error) {
    console.error("[Storage] getAllConversations:", error);
    return [];
  }
}

// ─── Supprimer une conversation ───────────────────────────────────────────

export async function deleteConversation(userId: string, id: string): Promise<void> {
  try {
    const existing = await getAllConversations(userId);
    const filtered = existing.filter((c) => c.id !== id);
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(filtered));
  } catch (error) {
    console.error("[Storage] deleteConversation:", error);
  }
}

// ─── Supprimer toutes les conversations ───────────────────────────────────

export async function clearAllConversations(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(storageKey(userId));
  } catch (error) {
    console.error("[Storage] clearAllConversations:", error);
  }
}

// ─── Générer un titre à partir du premier message ─────────────────────────

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  return trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "");
}
