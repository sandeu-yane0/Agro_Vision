import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import COLORS from "../constants/colors";
import { AppNotification, FarmerProfile } from "../types/index";
import VerifiedBadge from "../components/VerifiedBadge";

// ─── Carte notification ───────────────────────────────────────────────────

function NotificationCard({
  notif,
  onRespond,
}: {
  notif: AppNotification;
  onRespond: (notif: AppNotification, accept: boolean) => void;
}) {
  const [profile, setProfile] = useState<FarmerProfile | null>(null);
  const [responding, setResponding] = useState(false);

  const profileId =
    notif.type === "cooperative_invite"
      ? notif.data.founder_id
      : notif.type === "cooperative_join_request"
      ? notif.data.requester_id
      : null;

  useEffect(() => {
    if (!profileId) return;
    supabase
      .from("profiles")
      .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, created_at")
      .eq("id", profileId)
      .single()
      .then(({ data }) => setProfile(data as FarmerProfile | null));
  }, [profileId]);

  const time = new Date(notif.created_at).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  const showActions =
    (notif.type === "cooperative_invite" || notif.type === "cooperative_join_request") &&
    !notif.data.responded;

  const handleRespond = async (accept: boolean) => {
    setResponding(true);
    await onRespond(notif, accept);
    setResponding(false);
  };

  return (
    <View style={[styles.card, !notif.is_read && styles.cardUnread]}>
      <View style={styles.cardHeader}>
        <Ionicons
          name={
            notif.type === "cooperative_invite"
              ? "people"
              : notif.type === "cooperative_join_request"
              ? "person-add"
              : notif.type === "cooperative_member_joined"
              ? "checkmark-circle"
              : "close-circle"
          }
          size={20}
          color={COLORS.ACCENT}
        />
        <Text style={styles.cardTitle}>{notif.title}</Text>
      </View>

      {notif.body && <Text style={styles.cardBody}>{notif.body}</Text>}

      {profile && (
        <View style={styles.profileRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{profile.full_name}</Text>
              <VerifiedBadge verified={profile.is_verified} />
            </View>
            {profile.region && <Text style={styles.profileRegion}>{profile.region}</Text>}
          </View>
        </View>
      )}

      <Text style={styles.cardTime}>{time}</Text>

      {showActions && (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.refuseBtn]}
            onPress={() => handleRespond(false)}
            disabled={responding}
            activeOpacity={0.8}
          >
            <Text style={styles.refuseText}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleRespond(true)}
            disabled={responding}
            activeOpacity={0.8}
          >
            {responding ? (
              <ActivityIndicator size="small" color={COLORS.WHITE} />
            ) : (
              <Text style={styles.acceptText}>Accepter</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {notif.data.responded && (
        <Text style={styles.respondedText}>
          {notif.data.responded === "accepted" ? "Acceptée" : "Refusée"}
        </Text>
      )}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setNotifications(data as AppNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Marquer comme lues à l'ouverture
  useEffect(() => {
    if (!user) return;
    supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false)
      .then(() => {});
  }, [user]);

  const handleRespond = async (notif: AppNotification, accept: boolean) => {
    if (!user) return;
    const newStatus = accept ? "accepted" : "refused";

    if (notif.type === "cooperative_invite") {
      await supabase
        .from("cooperative_members")
        .update({ status: newStatus, responded_at: new Date().toISOString() })
        .eq("cooperative_id", notif.data.cooperative_id)
        .eq("member_id", user.id);

      await supabase.from("notifications").insert({
        user_id: notif.data.founder_id,
        type: accept ? "cooperative_member_joined" : "cooperative_member_refused",
        title: accept ? "Nouveau membre accepté" : "Invitation refusée",
        body: accept
          ? `${user.email ?? "Un agriculteur"} a rejoint "${notif.data.cooperative_name}"`
          : `Un agriculteur a refusé de rejoindre "${notif.data.cooperative_name}"`,
        data: { cooperative_id: notif.data.cooperative_id, cooperative_name: notif.data.cooperative_name, member_id: user.id },
      });
    } else if (notif.type === "cooperative_join_request") {
      await supabase
        .from("cooperative_members")
        .update({ status: newStatus, responded_at: new Date().toISOString() })
        .eq("cooperative_id", notif.data.cooperative_id)
        .eq("member_id", notif.data.requester_id);

      await supabase.from("notifications").insert({
        user_id: notif.data.requester_id,
        type: accept ? "cooperative_member_joined" : "cooperative_member_refused",
        title: accept ? "Demande acceptée" : "Demande refusée",
        body: accept
          ? `Votre demande pour rejoindre "${notif.data.cooperative_name}" a été acceptée`
          : `Votre demande pour rejoindre "${notif.data.cooperative_name}" a été refusée`,
        data: { cooperative_id: notif.data.cooperative_id, cooperative_name: notif.data.cooperative_name },
      });
    }

    // Marquer cette notification comme traitée
    const updatedData = { ...notif.data, responded: newStatus };
    await supabase.from("notifications").update({ data: updatedData }).eq("id", notif.id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === notif.id ? { ...n, data: updatedData } : n))
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.ACCENT} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="notifications-outline" size={64} color={COLORS.TEXT_MUTED} />
          <Text style={styles.emptyText}>Aucune notification</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <NotificationCard notif={item} onRespond={handleRespond} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.TEXT_PRIMARY },

  listContent: { padding: 16, gap: 10 },

  card: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 14,
    gap: 8,
    marginBottom: 10,
  },
  cardUnread: { borderColor: COLORS.ACCENT },

  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY, flex: 1 },
  cardBody: { fontSize: 13, color: COLORS.TEXT_SECONDARY, lineHeight: 18 },
  cardTime: { fontSize: 11, color: COLORS.TEXT_MUTED },

  profileRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 13 },
  profileInfo: { gap: 2 },
  profileNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  profileName: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_PRIMARY },
  profileRegion: { fontSize: 11, color: COLORS.TEXT_MUTED },

  actionsRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  actionBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  acceptBtn: { backgroundColor: COLORS.PRIMARY },
  refuseBtn: { backgroundColor: COLORS.BG_INPUT, borderWidth: 1, borderColor: COLORS.BORDER },
  acceptText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 13 },
  refuseText: { color: COLORS.TEXT_SECONDARY, fontWeight: "700", fontSize: 13 },

  respondedText: { fontSize: 12, color: COLORS.TEXT_MUTED, fontStyle: "italic", marginTop: 2 },
});
