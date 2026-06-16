import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Conversation } from "../types/index";
import COLORS from "../constants/colors";

interface ConversationItemProps {
  conversation: Conversation;
  onPress: () => void;
}

export default function ConversationItem({
  conversation,
  onPress,
}: ConversationItemProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      {/* Icône chat */}
      <View style={styles.iconContainer}>
        <Ionicons name="chatbubble-ellipses" size={20} color={COLORS.PRIMARY_LIGHT} />
      </View>

      {/* Contenu */}
      <View style={styles.content}>
        {/* Ligne 1 : titre + date */}
        <View style={styles.row}>
          <Text style={styles.title} numberOfLines={1}>
            {conversation.title}
          </Text>
          <Text style={styles.date}>{conversation.date}</Text>
        </View>
        {/* Ligne 2 : preview */}
        <Text style={styles.preview} numberOfLines={1}>
          {conversation.preview}
        </Text>
      </View>

      {/* Chevron */}
      <Ionicons name="chevron-forward" size={16} color={COLORS.TEXT_MUTED} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 12,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.PRIMARY_DARK,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 3,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    flex: 1,
    marginRight: 8,
  },
  date: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
  },
  preview: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
  },
});
