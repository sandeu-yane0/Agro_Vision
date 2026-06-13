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
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import {
  Cooperative,
  CooperativeMember,
  CooperativeMessage,
  FarmerProfile,
} from "../../types/index";
import VerifiedBadge from "../../components/VerifiedBadge";

type MemberWithProfile = CooperativeMember & { profiles: FarmerProfile };

// ─── Bulle de message ─────────────────────────────────────────────────────

function MessageBubble({
  msg,
  isMe,
  senderName,
}: {
  msg: CooperativeMessage;
  isMe: boolean;
  senderName: string;
}) {
  const time = new Date(msg.created_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <View style={[styles.bubbleWrap, isMe && styles.bubbleWrapRight]}>
      {!isMe && <Text style={styles.bubbleSender}>{senderName}</Text>}
      <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
        <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{msg.content}</Text>
        <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>{time}</Text>
      </View>
    </View>
  );
}

// ─── Écran principal ────────────────────────────────────────────────────────

export default function CooperativeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [founder, setFounder] = useState<FarmerProfile | null>(null);
  const [myMembership, setMyMembership] = useState<CooperativeMember | null>(null);
  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<MemberWithProfile[]>([]);
  const [messages, setMessages] = useState<CooperativeMessage[]>([]);
  const [profilesById, setProfilesById] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const isFounder = myMembership?.role === "founder";
  const isAccepted = myMembership?.status === "accepted";

  // ─── Chargement initial ──────────────────────────────────────────────────

  const loadCooperative = useCallback(async () => {
    if (!user) return;

    const { data: coop } = await supabase.from("cooperatives").select("*").eq("id", id).single();
    if (coop) {
      setCooperative(coop as Cooperative);
      const { data: founderProfile } = await supabase
        .from("profiles")
        .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, created_at")
        .eq("id", (coop as Cooperative).founder_id)
        .single();
      setFounder(founderProfile as FarmerProfile | null);
    }

    const { data: membership } = await supabase
      .from("cooperative_members")
      .select("*")
      .eq("cooperative_id", id)
      .eq("member_id", user.id)
      .maybeSingle();
    setMyMembership(membership as CooperativeMember | null);
    setRequestSent(membership?.status === "requested");

    const { data: allMembers } = await supabase
      .from("cooperative_members")
      .select("*, profiles(*)")
      .eq("cooperative_id", id)
      .eq("status", "accepted");
    setMembers((allMembers as unknown as MemberWithProfile[]) ?? []);

    const map: Record<string, string> = {};
    (allMembers as unknown as MemberWithProfile[] | null)?.forEach((m) => {
      map[m.member_id] = m.profiles?.full_name ?? "Agriculteur";
    });
    setProfilesById(map);

    if (membership?.role === "founder") {
      const { data: requests } = await supabase
        .from("cooperative_members")
        .select("*, profiles(*)")
        .eq("cooperative_id", id)
        .eq("status", "requested");
      setPendingRequests((requests as unknown as MemberWithProfile[]) ?? []);
    }

    setLoading(false);
  }, [id, user]);

  useEffect(() => {
    loadCooperative();
  }, [loadCooperative]);

  // ─── Chat : chargement + realtime ────────────────────────────────────────

  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from("cooperative_messages")
      .select("*")
      .eq("cooperative_id", id)
      .order("created_at", { ascending: true });

    if (data) setMessages(data as CooperativeMessage[]);
  }, [id]);

  useEffect(() => {
    if (!isAccepted) return;
    loadMessages();

    const channel = supabase
      .channel(`coop_${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cooperative_messages",
          filter: `cooperative_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as CooperativeMessage;
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
  }, [id, isAccepted, loadMessages]);

  // ─── Envoyer un message ─────────────────────────────────────────────────

  const handleSend = async () => {
    const content = text.trim();
    if (!content || !user) return;
    setSending(true);
    setText("");

    await supabase.from("cooperative_messages").insert({
      cooperative_id: id,
      sender_id: user.id,
      content,
    });

    setSending(false);
  };

  // ─── Demander à rejoindre ────────────────────────────────────────────────

  const handleRequestJoin = async () => {
    if (!user || !cooperative) return;

    await supabase.from("cooperative_members").insert({
      cooperative_id: id,
      member_id: user.id,
      role: "member",
      status: "requested",
    });

    await supabase.from("notifications").insert({
      user_id: cooperative.founder_id,
      type: "cooperative_join_request",
      title: "Nouvelle demande d'adhésion",
      body: `${user.email ?? "Un agriculteur"} souhaite rejoindre "${cooperative.name}"`,
      data: { cooperative_id: id, cooperative_name: cooperative.name, requester_id: user.id },
    });

    setRequestSent(true);
  };

  // ─── Répondre à une demande (fondateur) ─────────────────────────────────

  const handleRespondRequest = async (member: MemberWithProfile, accept: boolean) => {
    const newStatus = accept ? "accepted" : "refused";

    await supabase
      .from("cooperative_members")
      .update({ status: newStatus, responded_at: new Date().toISOString() })
      .eq("id", member.id);

    await supabase.from("notifications").insert({
      user_id: member.member_id,
      type: accept ? "cooperative_member_joined" : "cooperative_member_refused",
      title: accept ? "Demande acceptée" : "Demande refusée",
      body: accept
        ? `Votre demande pour rejoindre "${cooperative?.name}" a été acceptée`
        : `Votre demande pour rejoindre "${cooperative?.name}" a été refusée`,
      data: { cooperative_id: id, cooperative_name: cooperative?.name },
    });

    setPendingRequests((prev) => prev.filter((m) => m.id !== member.id));
    if (accept) {
      setMembers((prev) => [...prev, { ...member, status: "accepted" }]);
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
      </View>
    );
  }

  if (!cooperative) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Coopérative introuvable</Text>
      </View>
    );
  }

  // ─── Vue non-membre ───────────────────────────────────────────────────────

  if (!isAccepted) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerName}>{cooperative.name}</Text>
        </View>

        <View style={styles.detailContainer}>
          <View style={styles.detailIcon}>
            <Ionicons name="people-circle" size={56} color={COLORS.PRIMARY_LIGHT} />
          </View>
          <Text style={styles.detailName}>{cooperative.name}</Text>
          <Text style={styles.detailCulture}>{cooperative.culture}</Text>
          {cooperative.description && (
            <Text style={styles.detailDesc}>{cooperative.description}</Text>
          )}

          {founder && (
            <View style={styles.founderRow}>
              <Text style={styles.founderLabel}>Fondateur :</Text>
              <Text style={styles.founderName}>{founder.full_name}</Text>
              <VerifiedBadge verified={founder.is_verified} />
            </View>
          )}

          <Text style={styles.memberCount}>
            {members.length} membre{members.length > 1 ? "s" : ""}
          </Text>

          {requestSent ? (
            <View style={styles.sentBadge}>
              <Ionicons name="time-outline" size={18} color={COLORS.TEXT_MUTED} />
              <Text style={styles.sentText}>Demande envoyée, en attente de réponse</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.joinBtn} onPress={handleRequestJoin} activeOpacity={0.85}>
              <Text style={styles.joinText}>Demander à rejoindre</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ─── Vue membre (chat) ──────────────────────────────────────────────────

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
          <Text style={styles.headerName}>{cooperative.name}</Text>
          <Text style={styles.headerSub}>{cooperative.culture} · {members.length} membre{members.length > 1 ? "s" : ""}</Text>
        </View>
        {isFounder && (
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push(`/cooperative/invite?coopId=${id}`)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color={COLORS.TEXT_PRIMARY} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.headerBtn} onPress={() => setShowMembers(true)} activeOpacity={0.7}>
          <Ionicons name="people-outline" size={20} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
      </View>

      {/* Demandes en attente (fondateur) */}
      {isFounder && pendingRequests.length > 0 && (
        <View style={styles.requestsBox}>
          <Text style={styles.requestsTitle}>Demandes en attente</Text>
          {pendingRequests.map((req) => (
            <View key={req.id} style={styles.requestRow}>
              <Text style={styles.requestName}>{req.profiles?.full_name}</Text>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.requestRefuse]}
                  onPress={() => handleRespondRequest(req, false)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestRefuseText}>Refuser</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.requestBtn, styles.requestAccept]}
                  onPress={() => handleRespondRequest(req, true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.requestAcceptText}>Accepter</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Messages */}
      {messages.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="chatbubbles-outline" size={64} color={COLORS.TEXT_MUTED} />
          <Text style={styles.emptyText}>Démarrez la discussion !</Text>
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              isMe={item.sender_id === user?.id}
              senderName={profilesById[item.sender_id] ?? "Agriculteur"}
            />
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
          placeholder="Votre message..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          multiline
          maxLength={500}
        />
        <TouchableOpacity
          style={[styles.sendBtn, text.trim() ? styles.sendBtnActive : styles.sendBtnIdle]}
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

      {/* Modal membres */}
      <Modal visible={showMembers} transparent animationType="fade" onRequestClose={() => setShowMembers(false)}>
        <View style={styles.overlay}>
          <View style={styles.membersCard}>
            <View style={styles.membersHeader}>
              <Text style={styles.membersTitle}>Membres ({members.length})</Text>
              <TouchableOpacity onPress={() => setShowMembers(false)}>
                <Ionicons name="close" size={22} color={COLORS.TEXT_MUTED} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={members}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <Text style={styles.memberName}>{item.profiles?.full_name}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {item.role === "founder" && (
                      <View style={styles.founderPill}>
                        <Text style={styles.founderPillText}>Fondateur</Text>
                      </View>
                    )}
                    <VerifiedBadge verified={item.profiles?.is_verified} />
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 16, color: COLORS.TEXT_SECONDARY },

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
  headerInfo: { flex: 1 },
  headerName: { fontSize: 16, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  headerSub: { fontSize: 12, color: COLORS.TEXT_MUTED },
  headerBtn: { padding: 6 },

  // Détail (non-membre)
  detailContainer: { flex: 1, alignItems: "center", padding: 24, gap: 8 },
  detailIcon: { marginVertical: 12 },
  detailName: { fontSize: 20, fontWeight: "800", color: COLORS.TEXT_PRIMARY, textAlign: "center" },
  detailCulture: { fontSize: 14, color: COLORS.ACCENT, fontWeight: "600" },
  detailDesc: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center", lineHeight: 20, marginTop: 8 },

  founderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  founderLabel: { fontSize: 13, color: COLORS.TEXT_MUTED },
  founderName: { fontSize: 13, color: COLORS.TEXT_PRIMARY, fontWeight: "600" },

  memberCount: { fontSize: 13, color: COLORS.TEXT_MUTED, marginTop: 8 },

  joinBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginTop: 24,
  },
  joinText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },

  sentBadge: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 24 },
  sentText: { fontSize: 13, color: COLORS.TEXT_MUTED },

  // Demandes en attente
  requestsBox: {
    backgroundColor: COLORS.BG_CARD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    padding: 12,
    gap: 8,
  },
  requestsTitle: { fontSize: 12, fontWeight: "700", color: COLORS.TEXT_MUTED, textTransform: "uppercase" },
  requestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  requestName: { fontSize: 14, color: COLORS.TEXT_PRIMARY, fontWeight: "600" },
  requestActions: { flexDirection: "row", gap: 8 },
  requestBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  requestAccept: { backgroundColor: COLORS.PRIMARY },
  requestRefuse: { backgroundColor: COLORS.BG_INPUT, borderWidth: 1, borderColor: COLORS.BORDER },
  requestAcceptText: { color: COLORS.WHITE, fontSize: 12, fontWeight: "700" },
  requestRefuseText: { color: COLORS.TEXT_SECONDARY, fontSize: 12, fontWeight: "700" },

  // Messages
  listContent: { padding: 16, paddingBottom: 8 },

  bubbleWrap: { marginBottom: 8, maxWidth: "80%", alignSelf: "flex-start" },
  bubbleWrapRight: { alignSelf: "flex-end" },
  bubbleSender: { fontSize: 11, color: COLORS.TEXT_MUTED, marginBottom: 2, marginLeft: 4 },
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

  // Modal membres
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  membersCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "70%",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 16,
  },
  membersHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  membersTitle: { fontSize: 15, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  memberName: { fontSize: 14, color: COLORS.TEXT_PRIMARY },

  founderPill: {
    backgroundColor: COLORS.ACCENT_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  founderPillText: { fontSize: 10, color: COLORS.PRIMARY_DARK, fontWeight: "700" },
});
