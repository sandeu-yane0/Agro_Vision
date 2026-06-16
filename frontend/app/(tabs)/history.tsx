import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  ListRenderItemInfo,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { Conversation } from "../../types/index";
import COLORS from "../../constants/colors";
import ConversationItem from "../../components/ConversationItem";
import * as storage from "../../services/storage";

// â"€â"€â"€ Ã‰cran Historique â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function HistoryScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Recharger Ã  chaque fois que l'Ã©cran devient actif
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const convs = await storage.getAllConversations();
        if (active) {
          // Tri par date dÃ©croissante (plus rÃ©cente en premier)
          const sorted = convs.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          setConversations(sorted);
          setLoading(false);
        }
      })();
      return () => { active = false; };
    }, [])
  );

  // â"€â"€â"€ Supprimer une conversation â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleDelete = useCallback((id: string, title: string) => {
    const doDelete = async () => {
      await storage.deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
    };
    if (Platform.OS === "web") {
      if (window.confirm(`Supprimer "${title}" ?`)) doDelete();
      return;
    }
    Alert.alert(
      "Supprimer la conversation",
      `Voulez-vous supprimer "${title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: doDelete },
      ]
    );
  }, []);

  // â"€â"€â"€ Supprimer tout â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleClearAll = useCallback(() => {
    if (conversations.length === 0) return;
    Alert.alert(
      "Tout supprimer",
      "Voulez-vous supprimer toutes les conversations ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout supprimer",
          style: "destructive",
          onPress: async () => {
            await storage.clearAllConversations();
            setConversations([]);
          },
        },
      ]
    );
  }, [conversations]);

  // â"€â"€â"€ Ouvrir une conversation (naviguer vers chat) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const handleOpen = useCallback((conversation: Conversation) => {
    router.push(`/?conversationId=${conversation.id}`);
  }, [router]);

  // â"€â"€â"€ Rendu d'un item â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  const renderItem = ({ item }: ListRenderItemInfo<Conversation>) => (
    <View style={styles.itemWrapper}>
      <View style={styles.convItemFlex}>
        <ConversationItem
          conversation={item}
          onPress={() => handleOpen(item)}
        />
      </View>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => handleDelete(item.id, item.title)}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="trash-outline" size={18} color={COLORS.DANGER} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Bouton "Tout supprimer" dans le header */}
      {conversations.length > 0 && (
        <TouchableOpacity
          style={styles.clearAllBtn}
          onPress={handleClearAll}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={18} color={COLORS.DANGER} />
          <Text style={styles.clearAllText}>Tout supprimer</Text>
        </TouchableOpacity>
      )}

      {/* â"€â"€â"€ Vide â"€â"€â"€ */}
      {!loading && conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons
            name="chatbubbles-outline"
            size={80}
            color={COLORS.TEXT_MUTED}
          />
          <Text style={styles.emptyTitle}>Aucune conversation</Text>
          <Text style={styles.emptySubtitle}>
            Commencez Ã  discuter avec AgroVision
          </Text>
          <TouchableOpacity
            style={styles.startChatBtn}
            onPress={() => router.push("/")}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble" size={18} color={COLORS.WHITE} />
            <Text style={styles.startChatText}>DÃ©marrer un chat</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* â"€â"€â"€ Liste â"€â"€â"€ */
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.countText}>
              {conversations.length} conversation
              {conversations.length > 1 ? "s" : ""}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },

  // Bouton tout supprimer
  clearAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  clearAllText: {
    fontSize: 13,
    color: COLORS.DANGER,
    fontWeight: "600",
  },

  // Liste
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  countText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
    paddingLeft: 2,
  },

  // Item wrapper (pour le bouton delete)
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  convItemFlex: {
    flex: 1,
  },
  deleteBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.BG_CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    alignItems: "center",
    justifyContent: "center",
  },

  // Vide
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 15,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
  },
  startChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 24,
    marginTop: 8,
  },
  startChatText: {
    color: COLORS.WHITE,
    fontWeight: "700",
    fontSize: 15,
  },
});
