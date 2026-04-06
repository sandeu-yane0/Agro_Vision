import AsyncStorage from "@react-native-async-storage/async-storage";
import { Conversation } from "../types/index";

const STORAGE_KEY = "@agrovision_conversations";

// ─── Sauvegarder une conversation ─────────────────────────────────────────

export async function saveConversation(conv: Conversation): Promise<void> {
  try {
    const existing = await getAllConversations();
    const index = existing.findIndex((c) => c.id === conv.id);
    if (index >= 0) {
      existing[index] = conv;
    } else {
      existing.unshift(conv);
    }
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  } catch (error) {
    console.error("[Storage] saveConversation:", error);
  }
}

// ─── Récupérer toutes les conversations ───────────────────────────────────

export async function getAllConversations(): Promise<Conversation[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Conversation[];
  } catch (error) {
    console.error("[Storage] getAllConversations:", error);
    return [];
  }
}

// ─── Supprimer une conversation ───────────────────────────────────────────

export async function deleteConversation(id: string): Promise<void> {
  try {
    const existing = await getAllConversations();
    const filtered = existing.filter((c) => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[Storage] deleteConversation:", error);
  }
}

// ─── Supprimer toutes les conversations ───────────────────────────────────

export async function clearAllConversations(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("[Storage] clearAllConversations:", error);
  }
}

// ─── Générer un titre à partir du premier message ─────────────────────────

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  return trimmed.slice(0, 40) + (trimmed.length > 40 ? "..." : "");
}
