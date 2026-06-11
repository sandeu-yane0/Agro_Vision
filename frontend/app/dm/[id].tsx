import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { DMMessage } from "../../types/index";

// ─── Bulle de message ─────────────────────────────────────────────────────

function MessageBubble({ msg, isMe }: { msg: DMMessage; isMe: boolean }) {
  const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapRight]}>
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.content}</Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
      </View>
    </View>
  );
}

// ─── Écran DM ─────────────────────────────────────────────────────────────

export default function DMScreen() {
  const { id, name } = useLocalSearchParams<{ id: string; name: string }>();
  const router       = useRouter();
  const { user }     = useAuth();
  const flatListRef  = useRef<FlatList>(null);

  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [text, setText]         = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);

  const farmerName = decodeURIComponent(name ?? "Agriculteur");

  // ─── Charger l'historique ───────────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("dm_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as DMMessage[]);
    setLoading(false);
  }, [id]);

  // ─── Abonnement Realtime ────────────────────────────────────────────────

  useEffect(() => {
    loadMessages();

    const channel = supabase
      .channel(`dm_${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "dm_messages",
          filter: `conversation_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as DMMessage;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, loadMessages]);

  // ─── Marquer les messages comme lus ────────────────────────────────────

  useEffect(() => {
    if (!user || messages.length === 0) return;
    supabase
      .from("dm_messages")
      .update({ is_read: true })
      .eq("conversation_id", id)
      .neq("sender_id", user.id)
      .eq("is_read", false)
      .then(() => {});
  }, [messages, id, user]);

  // ─── Envoyer un message ─────────────────────────────────────────────────

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setSending(true);
    setText("");

    const { error } = await supabase.from("dm_messages").insert({
      conversation_id: id,
      sender_id: user.id,
      content,
    });

    // Mettre à jour last_message dans la conversation
    if (!error) {
      await supabase
        .from("dm_conversations")
        .update({ last_message: content, last_message_at: new Date().toISOString() })
        .eq("id", id);
    }

    setSending(false);
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {farmerName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View>
            <Text style={styles.headerName}>{farmerName}</Text>
            <Text style={styles.headerSub}>Agriculteur</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.ACCENT} />
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.TEXT_MUTED} />
          <Text style={styles.emptyText}>Commencez la conversation !</Text>
          <Text style={styles.emptySub}>Envoyez un message à {farmerName}</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble msg={item} isMe={item.sender_id === user?.id} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />
      )}

      {/* Input */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={text}
          onChangeText={setText}
          placeholder={`Message à ${farmerName}...`}
          placeholderTextColor={COLORS.TEXT_MUTED}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            text.trim() ? styles.sendBtnActive : styles.sendBtnIdle,
          ]}
          onPress={handleSend}
          disabled={!text.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Ionicons name="send" size={18} color={COLORS.WHITE} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    backgroundColor: COLORS.BG_DARK,
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerInfo: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  headerAvatarText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
  headerName: { fontSize: 16, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  headerSub: { fontSize: 12, color: COLORS.TEXT_MUTED },

  // Messages
  listContent: { padding: 16, paddingBottom: 8 },

  bubbleWrap: { marginBottom: 8, maxWidth: "80%", alignSelf: "flex-start" },
  bubbleWrapRight: { alignSelf: "flex-end" },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  bubbleMe: {
    backgroundColor: COLORS.PRIMARY,
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  bubbleText: { fontSize: 15, color: COLORS.TEXT_SECONDARY, lineHeight: 21 },
  bubbleTextMe: { color: COLORS.WHITE },
  bubbleTime: { fontSize: 11, color: COLORS.TEXT_MUTED, alignSelf: "flex-end" },
  bubbleTimeMe: { color: "rgba(255,255,255,0.6)" },

  // Empty state
  emptyText: { fontSize: 17, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  emptySub: { fontSize: 14, color: COLORS.TEXT_SECONDARY },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 28,
    margin: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: Platform.OS === "ios" ? 8 : 6,
    paddingBottom: Platform.OS === "ios" ? 8 : 6,
    lineHeight: 20,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  sendBtnActive: { backgroundColor: COLORS.PRIMARY },
  sendBtnIdle: { backgroundColor: COLORS.BG_INPUT, opacity: 0.5 },
});
