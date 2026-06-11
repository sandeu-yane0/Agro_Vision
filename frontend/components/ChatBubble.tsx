import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
} from "react-native";
import { Message } from "../types/index";
import COLORS from "../constants/colors";

interface ChatBubbleProps {
  message: Message;
  isUser: boolean;
}

export default function ChatBubble({ message, isUser }: ChatBubbleProps) {
  return (
    <View
      style={[
        styles.wrapper,
        isUser ? styles.wrapperUser : styles.wrapperAI,
      ]}
    >
      {/* Avatar IA à gauche */}
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarEmoji}>🌱</Text>
        </View>
      )}

      {/* Bulle */}
      <View
        style={[
          styles.bubble,
          isUser ? styles.bubbleUser : styles.bubbleAI,
        ]}
      >
        {/* Image attachée (au-dessus du texte) */}
        {message.imageUri ? (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.attachedImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Contenu texte */}
        <Text style={[styles.text, isUser ? styles.textUser : styles.textAI]}>
          {message.content}
        </Text>

        {/* Indicateur hors-ligne */}
        {message.pending ? (
          <Text style={styles.pendingLabel}>
             En attente de connexion — sera analysée automatiquement
          </Text>
        ) : null}

        {/* Timestamp */}
        <Text
          style={[
            styles.timestamp,
            isUser ? styles.timestampUser : styles.timestampAI,
          ]}
        >
          {message.timestamp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  wrapperUser: {
    justifyContent: "flex-end",
  },
  wrapperAI: {
    justifyContent: "flex-start",
  },

  // Avatar IA
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 4,
  },
  avatarEmoji: {
    fontSize: 14,
  },

  // Bulles
  bubble: {
    maxWidth: "78%",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: COLORS.BUBBLE_USER,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: COLORS.BUBBLE_AI,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  // Image attachée
  attachedImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 6,
  },

  // Textes
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  textUser: {
    color: COLORS.WHITE,
  },
  textAI: {
    color: COLORS.TEXT_PRIMARY,
  },

  // Indicateur hors-ligne
  pendingLabel: {
    fontSize: 12,
    color: COLORS.WARNING,
    marginTop: 6,
    fontStyle: "italic",
  },

  // Timestamps
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    textAlign: "right",
  },
  timestampUser: {
    color: "rgba(255,255,255,0.55)",
  },
  timestampAI: {
    color: COLORS.TEXT_MUTED,
  },
});
