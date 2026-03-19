import React, { useState, useRef } from "react";
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  KeyboardAvoidingView, Platform, ActivityIndicator
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { sendChatMessage, ChatMessage } from "../services/api";
import ChatBubble from "../components/ChatBubble";

const SUGGESTIONS = [
  "Quand planter le maïs ?",
  "Quel engrais pour le manioc ?",
  "Traitement contre les parasites ?"
];

export default function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Bonjour ! Je suis AgroVision, votre assistant agronome. Comment puis-je vous aider aujourd'hui ?" }
  ]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ChatMessage = { role: "user", content: text };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInputText("");
    setIsTyping(true);

    try {
      const responseContent = await sendChatMessage(text, messages);
      const botMessage: ChatMessage = { role: "assistant", content: responseContent };
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "Désolé, je rencontre des difficultés de connexion. Veuillez réessayer." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <ChatBubble
            key={index}
            message={msg.content}
            isUser={msg.role === "user"}
            timestamp={new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          />
        ))}
        {isTyping && (
          <View style={styles.typingContainer}>
            <Text style={styles.typingText}>L'assistant écrit...</Text>
            <ActivityIndicator size="small" color={colors.PRIMARY} style={styles.typingIndicator} />
          </View>
        )}
      </ScrollView>

      {messages.length === 1 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {SUGGESTIONS.map((suggestion, index) => (
              <TouchableOpacity 
                key={index} 
                style={styles.suggestionChip}
                onPress={() => handleSuggestionPress(suggestion)}
              >
                <Text style={styles.suggestionText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Posez votre question..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isTyping}
        >
          <Ionicons name="send" size={20} color={colors.CARD} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 24,
  },
  typingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    marginTop: 8,
  },
  typingText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    fontStyle: "italic",
  },
  typingIndicator: {
    marginLeft: 8,
  },
  suggestionsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.BACKGROUND,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  suggestionChip: {
    backgroundColor: colors.CARD,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.PRIMARY_LIGHT,
  },
  suggestionText: {
    color: colors.PRIMARY_DARK,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.CARD,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 48,
    color: colors.TEXT_MAIN,
  },
  sendButton: {
    backgroundColor: colors.PRIMARY,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  sendButtonDisabled: {
    backgroundColor: colors.BORDER,
  },
});
