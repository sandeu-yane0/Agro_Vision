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

import { Message, Conversation, ChatMessage, Suggestion } from "../types/index";
import COLORS from "../constants/colors";
import { SUGGESTIONS } from "../constants/suggestions";
import ChatBubble from "../components/ChatBubble";
import TypingIndicator from "../components/TypingIndicator";
import { pickImage } from "../components/ImageAttachment";
import * as api from "../services/api";
import * as storage from "../services/storage";

// ─── Helpers ──────────────────────────────────────────────────────────────

function getTimestamp(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ─── Icônes suggestions ───────────────────────────────────────────────────

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  camera:      "camera-outline",
  calculator:  "calculator-outline",
  leaf:        "leaf-outline",
  flask:       "flask-outline",
  cloud:       "cloud-outline",
  "trending-up": "trending-up-outline",
};

// ─── Écran principal Chat ─────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();

  const [messages, setMessages]         = useState<Message[]>([]);
  const [inputText, setInputText]       = useState("");
  const [imageUri, setImageUri]         = useState<string | null>(null);
  const [isTyping, setIsTyping]         = useState(false);
  const [conversationId]                = useState(generateId());

  const scrollViewRef = useRef<ScrollView>(null);

  // Scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (messages.length > 0 || isTyping) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isTyping]);

  // ─── Envoi d'un message ─────────────────────────────────────────────────

  const handleSend = useCallback(
    async (text?: string) => {
      const content = (text ?? inputText).trim();
      if (!content && !imageUri) return;

      const userMessage: Message = {
        id:          generateId(),
        role:        "user",
        content:     content || "📷 Photo envoyée",
        timestamp:   getTimestamp(),
        imageUri:    imageUri ?? undefined,
        messageType: imageUri ? "diagnosis" : "text",
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInputText("");
      setImageUri(null);
      setIsTyping(true);

      try {
        const history: ChatMessage[] = newMessages.map((m) => ({
          role:    m.role,
          content: m.content,
        }));

        const response = await api.sendChatMessage(content, imageUri, history);

        const aiMessage: Message = {
          id:          generateId(),
          role:        "assistant",
          content:     response,
          timestamp:   getTimestamp(),
          messageType: "text",
        };

        const finalMessages = [...newMessages, aiMessage];
        setMessages(finalMessages);

        // Persister la conversation
        const conv: Conversation = {
          id:       conversationId,
          title:    storage.generateTitle(content),
          preview:  response.slice(0, 80),
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
          content:     "❌ Désolé, une erreur s'est produite. Vérifiez votre connexion et réessayez.",
          timestamp:   getTimestamp(),
          messageType: "text",
        };
        setMessages((prev) => [...prev, errMsg]);
      } finally {
        setIsTyping(false);
      }
    },
    [inputText, imageUri, messages, conversationId]
  );

  // ─── Nouvelle conversation ───────────────────────────────────────────────

  const handleNewConversation = useCallback(() => {
    if (messages.length === 0) return;
    Alert.alert(
      "Nouvelle conversation",
      "Voulez-vous démarrer une nouvelle conversation ? La conversation actuelle sera sauvegardée.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Nouvelle",
          style: "default",
          onPress: () => setMessages([]),
        },
      ]
    );
  }, [messages]);

  // ─── Sélection image ────────────────────────────────────────────────────

  const handlePickImage = useCallback(async () => {
    const uri = await pickImage();
    if (uri) setImageUri(uri);
  }, []);

  // ─── État initial : écran de bienvenue ──────────────────────────────────

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

  // ─── Rendu ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style="light" />

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

      {/* Zone de messages ou écran de bienvenue */}
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
          /* ─── État initial : bienvenue ─── */
          <View style={styles.welcomeContainer}>
            <View style={styles.aiAvatar}>
              <Text style={styles.aiAvatarEmoji}>🌱</Text>
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
          /* ─── Messages ─── */
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

      {/* ─── Miniature image sélectionnée ─── */}
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

      {/* ─── Barre d'input ─── */}
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
          placeholder="Message à AgroVision..."
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

  // ─── Bienvenue ───
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

  // ─── Messages ───
  messagesContainer: {
    width: "100%",
    paddingTop: 8,
  },

  // ─── Image preview ───
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

  // ─── Barre input ───
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
