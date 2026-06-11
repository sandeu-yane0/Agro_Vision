import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@agrovision_offline_queue";

export interface QueuedDiagnosis {
  id: string;
  conversationId: string;
  userMessageId: string;
  imageUri: string;
  createdAt: number;
}

export async function getQueue(): Promise<QueuedDiagnosis[]> {
  try {
    const data = await AsyncStorage.getItem(QUEUE_KEY);
    if (!data) return [];
    return JSON.parse(data) as QueuedDiagnosis[];
  } catch (error) {
    console.error("[OfflineQueue] getQueue:", error);
    return [];
  }
}

export async function addToQueue(item: QueuedDiagnosis): Promise<void> {
  try {
    const queue = await getQueue();
    queue.push(item);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error("[OfflineQueue] addToQueue:", error);
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  try {
    const queue = await getQueue();
    const filtered = queue.filter((item) => item.id !== id);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("[OfflineQueue] removeFromQueue:", error);
  }
}
