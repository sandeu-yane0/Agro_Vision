import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../constants/colors";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: string;
}

export default function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.botContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={[styles.message, isUser ? styles.userMessage : styles.botMessage]}>
          {message}
        </Text>
        <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.botTimestamp]}>
          {timestamp}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
    flexDirection: "row",
    paddingHorizontal: 16,
  },
  userContainer: {
    justifyContent: "flex-end",
  },
  botContainer: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "80%",
    padding: 12,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: colors.PRIMARY,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: colors.CARD,
    borderBottomLeftRadius: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessage: {
    color: colors.CARD,
  },
  botMessage: {
    color: colors.TEXT_MAIN,
  },
  timestamp: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimestamp: {
    color: "rgba(255, 255, 255, 0.7)",
  },
  botTimestamp: {
    color: colors.TEXT_SECONDARY,
  },
});
