import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { Cooperative, FarmerProfile } from "../../types/index";
import VerifiedBadge from "../../components/VerifiedBadge";

export default function InviteScreen() {
  const { coopId } = useLocalSearchParams<{ coopId: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [cooperative, setCooperative] = useState<Cooperative | null>(null);
  const [candidates, setCandidates] = useState<FarmerProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;

    const { data: coop } = await supabase.from("cooperatives").select("*").eq("id", coopId).single();
    if (!coop) {
      setLoading(false);
      return;
    }
    setCooperative(coop as Cooperative);

    const { data: existingMembers } = await supabase
      .from("cooperative_members")
      .select("member_id")
      .eq("cooperative_id", coopId);

    const excludedIds = new Set((existingMembers ?? []).map((m) => m.member_id));

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, created_at")
      .neq("id", user.id)
      .order("full_name");

    const filtered = ((profiles as FarmerProfile[]) ?? []).filter(
      (p) => !excludedIds.has(p.id) && p.cultures?.includes((coop as Cooperative).culture)
    );

    setCandidates(filtered);
    setLoading(false);
  }, [coopId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const handleInvite = async (farmer: FarmerProfile) => {
    if (!cooperative) return;
    setSendingId(farmer.id);

    await supabase.from("cooperative_members").insert({
      cooperative_id: coopId,
      member_id: farmer.id,
      role: "member",
      status: "pending",
    });

    await supabase.from("notifications").insert({
      user_id: farmer.id,
      type: "cooperative_invite",
      title: "Invitation à une coopérative",
      body: `Vous êtes invité(e) à rejoindre "${cooperative.name}"`,
      data: { cooperative_id: coopId, cooperative_name: cooperative.name, founder_id: cooperative.founder_id },
    });

    setInvited((prev) => new Set(prev).add(farmer.id));
    setSendingId(null);
  };

  const filtered = search.trim()
    ? candidates.filter((f) => f.full_name.toLowerCase().includes(search.toLowerCase()))
    : candidates;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inviter des agriculteurs</Text>
      </View>

      {cooperative && (
        <Text style={styles.subTitle}>
          Agriculteurs cultivant "{cooperative.culture}"
        </Text>
      )}

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher..."
          placeholderTextColor={COLORS.TEXT_MUTED}
        />
      </View>

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={64} color={COLORS.TEXT_MUTED} />
          <Text style={styles.emptyText}>Aucun agriculteur trouvé pour cette culture</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.full_name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.farmerName}>{item.full_name}</Text>
                  <VerifiedBadge verified={item.is_verified} />
                </View>
                {item.region && <Text style={styles.region}>{item.region}</Text>}
              </View>
              {invited.has(item.id) ? (
                <View style={styles.invitedPill}>
                  <Ionicons name="checkmark" size={14} color={COLORS.SUCCESS} />
                  <Text style={styles.invitedText}>Invité</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.inviteBtn}
                  onPress={() => handleInvite(item)}
                  disabled={sendingId === item.id}
                  activeOpacity={0.8}
                >
                  {sendingId === item.id ? (
                    <ActivityIndicator size="small" color={COLORS.WHITE} />
                  ) : (
                    <Text style={styles.inviteText}>Inviter</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center" },

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
  subTitle: { fontSize: 12, color: COLORS.TEXT_MUTED, marginHorizontal: 16, marginTop: 10 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  searchInput: { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: 15, paddingVertical: 12 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.WHITE, fontWeight: "700" },
  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  farmerName: { fontSize: 15, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  region: { fontSize: 12, color: COLORS.TEXT_MUTED },

  inviteBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  inviteText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 12 },

  invitedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  invitedText: { color: COLORS.SUCCESS, fontWeight: "700", fontSize: 12 },
});
