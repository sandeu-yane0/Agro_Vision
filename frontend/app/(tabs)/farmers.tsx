import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { FarmerProfile } from "../../types/index";
import VerifiedBadge from "../../components/VerifiedBadge";
import ReportModal from "../../components/ReportModal";

// ─── Avatar initiales ─────────────────────────────────────────────────────

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>
        {initials}
      </Text>
    </View>
  );
}

// ─── Carte agriculteur ────────────────────────────────────────────────────

function FarmerCard({
  farmer,
  onMessage,
  onReport,
}: {
  farmer: FarmerProfile;
  onMessage: () => void;
  onReport: () => void;
}) {
  return (
    <View style={styles.card}>
      <Avatar name={farmer.full_name} />
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.farmerName}>{farmer.full_name}</Text>
          <VerifiedBadge verified={farmer.is_verified} />
        </View>
        {farmer.region && (
          <View style={styles.regionRow}>
            <Ionicons name="location-outline" size={12} color={COLORS.TEXT_MUTED} />
            <Text style={styles.regionText}>{farmer.region}</Text>
          </View>
        )}
        {farmer.cultures && farmer.cultures.length > 0 && (
          <View style={styles.culturesRow}>
            {farmer.cultures.slice(0, 3).map((c) => (
              <View key={c} style={styles.culturePill}>
                <Text style={styles.cultureText}>{c}</Text>
              </View>
            ))}
            {farmer.cultures.length > 3 && (
              <Text style={styles.moreText}>+{farmer.cultures.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.reportBtn}
        onPress={onReport}
        activeOpacity={0.7}
      >
        <Ionicons name="flag-outline" size={16} color={COLORS.TEXT_MUTED} />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.msgBtn}
        onPress={onMessage}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────

export default function FarmersScreen() {
  const router   = useRouter();
  const { user } = useAuth();

  const [farmers, setFarmers]     = useState<FarmerProfile[]>([]);
  const [search, setSearch]       = useState("");
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reportTarget, setReportTarget] = useState<FarmerProfile | null>(null);

  const loadFarmers = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, is_suspended")
      .neq("id", user?.id ?? "")
      .eq("is_suspended", false)
      .order("full_name");

    if (!error && data) {
      setFarmers(data as FarmerProfile[]);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadFarmers();
    }, [loadFarmers])
  );

  const handleMessage = useCallback(
    async (farmer: FarmerProfile) => {
      if (!user) return;

      // Chercher une conversation existante
      const { data: existing } = await supabase
        .from("dm_conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${user.id},participant_2.eq.${farmer.id}),and(participant_1.eq.${farmer.id},participant_2.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) {
        router.push(`/dm/${existing.id}?name=${encodeURIComponent(farmer.full_name)}`);
        return;
      }

      // Créer une nouvelle conversation
      const { data: newConv, error } = await supabase
        .from("dm_conversations")
        .insert({ participant_1: user.id, participant_2: farmer.id })
        .select("id")
        .single();

      if (!error && newConv) {
        router.push(`/dm/${newConv.id}?name=${encodeURIComponent(farmer.full_name)}`);
      }
    },
    [user, router]
  );

  const filtered = search.trim()
    ? farmers.filter(
        (f) =>
          f.full_name.toLowerCase().includes(search.toLowerCase()) ||
          f.region?.toLowerCase().includes(search.toLowerCase())
      )
    : farmers;

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

      {/* Barre de recherche */}
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.TEXT_MUTED} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Rechercher un agriculteur..."
          placeholderTextColor={COLORS.TEXT_MUTED}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={COLORS.TEXT_MUTED} />
          </TouchableOpacity>
        )}
      </View>

      {filtered.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={72} color={COLORS.TEXT_MUTED} />
          <Text style={styles.emptyTitle}>
            {search ? "Aucun résultat" : "Aucun agriculteur"}
          </Text>
          <Text style={styles.emptySub}>
            {search
              ? "Essayez un autre terme"
              : "Les autres agriculteurs inscrits apparaîtront ici"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FarmerCard
              farmer={item}
              onMessage={() => handleMessage(item)}
              onReport={() => setReportTarget(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadFarmers(); }}
              tintColor={COLORS.ACCENT}
              colors={[COLORS.ACCENT]}
            />
          }
          ListHeaderComponent={
            <Text style={styles.countText}>
              {filtered.length} agriculteur{filtered.length > 1 ? "s" : ""}
            </Text>
          }
        />
      )}

      {reportTarget && (
        <ReportModal
          visible={!!reportTarget}
          reportedUserId={reportTarget.id}
          reportedUserName={reportTarget.full_name}
          onClose={() => setReportTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },

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
  searchInput: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: 12,
  },

  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  countText: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    marginBottom: 12,
    paddingLeft: 2,
  },

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
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: COLORS.WHITE, fontWeight: "700" },

  cardInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  farmerName: { fontSize: 15, fontWeight: "700", color: COLORS.TEXT_PRIMARY },

  regionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  regionText: { fontSize: 12, color: COLORS.TEXT_MUTED },

  culturesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 2 },
  culturePill: {
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  cultureText: { fontSize: 11, color: COLORS.TEXT_SECONDARY },
  moreText: { fontSize: 11, color: COLORS.TEXT_MUTED, alignSelf: "center" },

  reportBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  msgBtn: {
    backgroundColor: COLORS.PRIMARY,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY, textAlign: "center" },
  emptySub: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center", lineHeight: 20 },
});
