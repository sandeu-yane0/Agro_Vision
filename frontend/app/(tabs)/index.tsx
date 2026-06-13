import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  FlatList,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { Message, Conversation, ChatMessage, Suggestion, DiagnosisResult } from "../../types/index";
import COLORS from "../../constants/colors";
import { SUGGESTIONS } from "../../constants/suggestions";
import ChatBubble from "../../components/ChatBubble";
import TypingIndicator from "../../components/TypingIndicator";
import { pickImage } from "../../components/ImageAttachment";
import * as api from "../../services/api";
import * as storage from "../../services/storage";
import * as offlineQueue from "../../services/offlineQueue";
import { QueuedDiagnosis } from "../../services/offlineQueue";
import { useNetworkStatus } from "../../lib/useNetworkStatus";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getTimestamp(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const GRAVITE_EMOJI: Record<string, string> = {
  SAIN: "✅",
  LÉGER: "🟡",
  MOYEN: "🟠",
  CRITIQUE: "🔴",
};

function formatDiagnosisMessage(diag: DiagnosisResult): string {
  const emoji = GRAVITE_EMOJI[diag.gravite] ?? "🔍";
  let text = `${emoji} **${diag.maladie}** — ${diag.confiance}% de confiance\n\n`;
  text += `**Gravité :** ${diag.gravite}\n`;
  text += `**Cause :** ${diag.cause}\n\n`;
  text += `**Traitement :** ${diag.traitement}\n\n`;
  text += `**Prévention :** ${diag.prevention}`;
  if (diag.conseil_llm) {
    text += `\n\n💬 ${diag.conseil_llm}`;
  }
  return text;
}

// â”€â”€â”€ IcÃ´nes suggestions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  camera:      "camera-outline",
  calculator:  "calculator-outline",
  leaf:        "leaf-outline",
  flask:       "flask-outline",
  cloud:       "cloud-outline",
  "trending-up": "trending-up-outline",
};

// â”€â”€â”€ Ã‰cran principal Chat â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ChatScreen() {
  const router = useRouter();

  const [messages, setMessages]         = useState<Message[]>([]);
  const [inputText, setInputText]       = useState("");
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [isTyping, setIsTyping]         = useState(false);
  const [conversationId, setConversationId] = useState(generateId());
  const isConnected                     = useNetworkStatus();

  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll vers le bas Ã  chaque nouveau message
  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  // ─── Mode hors-ligne : traitement de la file d'attente ─────────────────────

  const resolveQueuedDiagnosis = useCallback(
    async (item: QueuedDiagnosis, formatted: string) => {
      const aiMessage: Message = {
        id:          generateId(),
        role:        "assistant",
        content:     formatted,
        timestamp:   getTimestamp(),
        messageType: "diagnosis",
      };

      const conversations = await storage.getAllConversations();
      const conv = conversations.find((c) => c.id === item.conversationId);
      if (conv) {
        const msgIndex = conv.messages.findIndex((m) => m.id === item.userMessageId);
        if (msgIndex >= 0) conv.messages[msgIndex].pending = false;
        conv.messages.push(aiMessage);
        conv.preview = formatted.slice(0, 80);
        await storage.saveConversation(conv);
      }

      if (item.conversationId === conversationId) {
        setMessages((prev) => [
          ...prev.map((m) => (m.id === item.userMessageId ? { ...m, pending: false } : m)),
          aiMessage,
        ]);
      }
    },
    [conversationId]
  );

  const processOfflineQueue = useCallback(async () => {
    const queue = await offlineQueue.getQueue();
    for (const item of queue) {
      try {
        const diagnosis = await api.diagnoseImage(item.imageUri);
        const formatted = formatDiagnosisMessage(diagnosis);
        await resolveQueuedDiagnosis(item, formatted);
        await offlineQueue.removeFromQueue(item.id);
      } catch {
        // Toujours hors-ligne ou erreur rÃ©seau : on rÃ©essaiera plus tard
        break;
      }
    }
  }, [resolveQueuedDiagnosis]);

  useEffect(() => {
    if (isConnected) {
      processOfflineQueue();
    }
  }, [isConnected, processOfflineQueue]);

  // â”€â”€â”€ Envoi d'un message â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputText).trim();
      if (!content && !imageUri) return;

      const userMessage: Message = {
        id:          generateId(),
        role:        "user",
        content:     content || "ðŸ“· Photo envoyÃ©e",
        timestamp:   getTimestamp(),
        imageUri:    imageUri ?? undefined,
        messageType: imageUri ? "diagnosis" : "text",
      };

      // ── Hors-ligne avec photo : mise en file d'attente ──────────────────
      if (!isConnected && imageUri) {
        const pendingMessage: Message = { ...userMessage, pending: true };
        const messagesWithPending = [...messages, pendingMessage];
        setMessages(messagesWithPending);
        setInputText("");
        setImageUri(null);

        const conv: Conversation = {
          id:       conversationId,
          title:    storage.generateTitle(content),
          preview:  "📷 Diagnostic en attente de connexion",
          date:     new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          }),
          messages: messagesWithPending,
        };
        await storage.saveConversation(conv);

        await offlineQueue.addToQueue({
          id:              generateId(),
          conversationId,
          userMessageId:   pendingMessage.id,
          imageUri:        imageUri,
          createdAt:       Date.now(),
        });

        return;
      }

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInputText("");
      setImageUri(null);
      setIsTyping(true);

      try {
        let responsePreview: string;
        let aiMessage: Message;

        if (imageUri) {
          // ── Diagnostic photo ───────────────────────────────────────────
          const diagnosis = await api.diagnoseImage(imageUri);
          const formatted = formatDiagnosisMessage(diagnosis);

          aiMessage = {
            id:          generateId(),
            role:        "assistant",
            content:     formatted,
            timestamp:   getTimestamp(),
            messageType: "diagnosis",
          };
          responsePreview = formatted;
        } else {
          // ── Question texte ──────────────────────────────────────────────
          const history: ChatMessage[] = newMessages.map((m) => ({
            role:    m.role,
            content: m.content,
          }));

          const response = await api.sendChatMessage(content, imageUri, history);

          aiMessage = {
            id:          generateId(),
            role:        "assistant",
            content:     response,
            timestamp:   getTimestamp(),
            messageType: "text",
          };
          responsePreview = response;
        }

        const finalMessages = [...newMessages, aiMessage];
        setMessages(finalMessages);

        // Persister la conversation
        const conv: Conversation = {
          id:       conversationId,
          title:    storage.generateTitle(content),
          preview:  responsePreview.slice(0, 80),
          date:     new Date().toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
          }),
          messages: finalMessages,
        };
        await storage.saveConversation(conv);
      } catch {
        const errMsg: Message = {
          id:          generateId(),
          role:        "assistant",
          content:     "âŒ DÃ©solÃ©, une erreur s'est produite. VÃ©rifiez votre connexion et rÃ©essayez.",
          timestamp:   getTimestamp(),
          messageType: "text",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, imageUri, messages, conversationId, isConnected]
  );

  // â”€â”€â”€ Nouvelle conversation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handleNewConversation = useCallback(() => {
    if (messages.length === 0) return;
    Alert.alert(
      "Nouvelle conversation",
      "Voulez-vous dÃ©marrer une nouvelle conversation ? La conversation actuelle sera sauvegardÃ©e.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Nouvelle",
          style: "default",
          onPress: () => {
            setMessages([]);
            setConversationId(generateId());
          },
        },
      ]
    );
  }, [messages]);

  // â”€â”€â”€ SÃ©lection image â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const handlePickImage = useCallback(async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  }, []);

  // â”€â”€â”€ Ã‰tat initial : Ã©cran de bienvenue â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  const showWelcome = messages.length === 0;

  const renderSuggestion = ({ item }: { item: Suggestion }) => (
    <TouchableOpacity
      style={styles.chip}
      onPress={() => handleSend(item.text)}
      activeOpacity={0.75}
    >
      <Ionicons
        name={ICON_MAP[item.icon] ?? "chatbubble-outline"}
        size={16}
        color={COLORS.ACCENT}
      />
      <Text style={styles.chipText}>{item.text}</Text>
    </TouchableOpacity>
  );

  // â”€â”€â”€ Rendu â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style="light" />

      {/* Bandeau hors-ligne */}
      {!isConnected && (
        <View style={styles.offlineBanner}>
          <Ionicons name="cloud-offline-outline" size={16} color={COLORS.WARNING} />
          <Text style={styles.offlineBannerText}>
            Mode hors-ligne — les diagnostics photo seront analysés à la reconnexion
          </Text>
        </View>
      )}

      {/* Bouton "Nouvelle conversation" dans le header */}
      {messages.length > 0 && (
        <TouchableOpacity
          style={styles.newChatBtn}
          onPress={handleNewConversation}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.ACCENT} />
        </TouchableOpacity>
      )}

      {/* Zone de messages ou Ã©cran de bienvenue */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          showWelcome && styles.scrollContentCenter,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {showWelcome ? (
          /* â”€â”€â”€ Ã‰tat initial : bienvenue â”€â”€â”€ */
          <View style={styles.welcomeContainer}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarEmoji}>ðŸŒ±</Text>
            </View>

            <Text style={styles.welcomeTitle}>
              {"Bonjour ! Je suis AgroVision"}
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {"Votre agronome IA disponible 24h/24"}
            </Text>
            <Text style={styles.welcomeHint}>
              Envoyez une photo ou posez une question
            </Text>

            {/* Grille suggestions */}
            <FlatList
              data={SUGGESTIONS}
              renderItem={renderSuggestion}
              keyExtractor={(item) => item.id}
              numColumns={2}
              scrollEnabled={false}
              contentContainerStyle={styles.suggestionsGrid}
              columnWrapperStyle={styles.suggestionsRow}
            />
          </View>
        ) : (
          /* â”€â”€â”€ Messages â”€â”€â”€ */
          <View style={styles.messagesContainer}>
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                isUser={msg.role === "user"}
              />
            ))}
            {isTyping && <TypingIndicator />}
          </View>
        )}
      </ScrollView>

      {/* â”€â”€â”€ Miniature image sÃ©lectionnÃ©e â”€â”€â”€ */}
      {imageUri && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => setImageUri(null)}
          >
            <Ionicons name="close-circle" size={22} color={COLORS.DANGER} />
          </TouchableOpacity>
        </View>
      )}

      {/* â”€â”€â”€ Barre d'input â”€â”€â”€ */}
      <View style={styles.inputBar}>
        {/* Bouton photo */}
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={handlePickImage}
          activeOpacity={0.75}
        >
          <Ionicons name="camera" size={20} color={COLORS.ACCENT} />
        </TouchableOpacity>

        {/* TextInput */}
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Message Ã  AgroVision..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => handleSend()}
        />

        {/* Bouton envoyer */}
        <TouchableOpacity
          style={[
            styles.iconBtn,
            styles.sendBtn,
            (inputText.trim() || imageUri) ? styles.sendBtnActive : styles.sendBtnIdle,
          ]}
          onPress={() => handleSend()}
          activeOpacity={0.8}
          disabled={!inputText.trim() && !imageUri}
        >
          <Ionicons name="send" size={18} color={COLORS.WHITE} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },

  // Bandeau hors-ligne
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.WARNING,
  },

  // Bouton nouvelle conversation (overlay)
  newChatBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 12 : 8,
    right: 16,
    zIndex: 10,
    padding: 4,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContentCenter: {
    justifyContent: "center",
    alignItems: "center",
  },

  // â”€â”€â”€ Bienvenue â”€â”€â”€
  welcomeContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    width: "100%",
  },
  aiAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 8,
  },
  aiAvatarEmoji: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 6,
  },
  welcomeHint: {
    fontSize: 13,
    color: COLORS.TEXT_MUTED,
    textAlign: "center",
    marginBottom: 28,
  },

  // Suggestions
  suggestionsGrid: {
    width: "100%",
    gap: 10,
  },
  suggestionsRow: {
    gap: 10,
    justifyContent: "center",
  },
  chip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    minHeight: 48,
    maxWidth: "48%",
  },
  chipText: {
    fontSize: 12,
    color: COLORS.TEXT_PRIMARY,
    fontWeight: "500",
    flex: 1,
    flexWrap: "wrap",
  },

  // â”€â”€â”€ Messages â”€â”€â”€
  messagesContainer: {
    width: "100%",
    paddingTop: 8,
  },

  // â”€â”€â”€ Image preview â”€â”€â”€
  imagePreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  imagePreview: {
    width: 60,
    height: 60,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  removeImageBtn: {
    position: "absolute",
    top: -4,
    left: 52,
  },

  // â”€â”€â”€ Barre input â”€â”€â”€
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 28,
    margin: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BG_INPUT,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtn: {},
  sendBtnActive: {
    backgroundColor: COLORS.PRIMARY,
  },
  sendBtnIdle: {
    backgroundColor: COLORS.BG_INPUT,
    opacity: 0.6,
  },
  textInput: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    lineHeight: 20,
  },
});
