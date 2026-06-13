import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { Cooperative, CooperativeMember } from "../../types/index";
import { CULTURES_OPTIONS } from "../../constants/cultures";

type MyCoop = CooperativeMember & { cooperatives: Cooperative };

// ─── Carte coopérative ─────────────────────────────────────────────────────

function CoopCard({
  coop,
  isFounder,
  onPress,
}: {
  coop: Cooperative;
  isFounder?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Ionicons name="people-circle" size={28} color={COLORS.PRIMARY_LIGHT} />
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{coop.name}</Text>
          {isFounder && (
            <View style={styles.founderPill}>
              <Text style={styles.founderText}>Fondateur</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardCulture}>{coop.culture}</Text>
        {coop.description && (
          <Text style={styles.cardDesc} numberOfLines={2}>{coop.description}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.TEXT_MUTED} />
    </TouchableOpacity>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────

export default function CooperativesScreen() {
  const router = useRouter();
  const { user, profile } = useAuth();

  const [section, setSection] = useState<"mine" | "discover">("mine");
  const [myCoops, setMyCoops] = useState<MyCoop[]>([]);
  const [discoverCoops, setDiscoverCoops] = useState<Cooperative[]>([]);
  const [cultureFilter, setCultureFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMine = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("cooperative_members")
      .select("*, cooperatives(*)")
      .eq("member_id", user.id)
      .eq("status", "accepted");

    if (data) setMyCoops(data as unknown as MyCoop[]);
  }, [user]);

  const loadDiscover = useCallback(async () => {
    if (!user) return;

    const { data: memberships } = await supabase
      .from("cooperative_members")
      .select("cooperative_id")
      .eq("member_id", user.id);

    const excludedIds = (memberships ?? []).map((m) => m.cooperative_id);

    let query = supabase
      .from("cooperatives")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (excludedIds.length > 0) {
      query = query.not("id", "in", `(${excludedIds.join(",")})`);
    }

    const { data } = await query;
    let coops = (data as Cooperative[]) ?? [];

    if (cultureFilter.length > 0) {
      coops = coops.filter((c) => cultureFilter.includes(c.culture));
    }

    setDiscoverCoops(coops);
  }, [user, cultureFilter]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadMine(), loadDiscover()]);
    setLoading(false);
  }, [loadMine, loadDiscover]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  // Initialiser le filtre culture avec les cultures du profil
  React.useEffect(() => {
    if (profile?.cultures && profile.cultures.length > 0 && cultureFilter.length === 0) {
      setCultureFilter(profile.cultures);
    }
  }, [profile]);

  React.useEffect(() => {
    if (section === "discover") loadDiscover();
  }, [cultureFilter, section, loadDiscover]);

  const toggleCulture = (c: string) => {
    setCultureFilter((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

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

      {/* Segmented control */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segment, section === "mine" && styles.segmentActive]}
          onPress={() => setSection("mine")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, section === "mine" && styles.segmentTextActive]}>
            Mes coopératives
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, section === "discover" && styles.segmentActive]}
          onPress={() => setSection("discover")}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentText, section === "discover" && styles.segmentTextActive]}>
            Découvrir
          </Text>
        </TouchableOpacity>
      </View>

      {section === "mine" ? (
        myCoops.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="people-circle-outline" size={72} color={COLORS.TEXT_MUTED} />
            <Text style={styles.emptyTitle}>Aucune coopérative</Text>
            <Text style={styles.emptySub}>
              Créez votre coopérative ou découvrez-en une à rejoindre
            </Text>
          </View>
        ) : (
          <FlatList
            data={myCoops}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <CoopCard
                coop={item.cooperatives}
                isFounder={item.role === "founder"}
                onPress={() => router.push(`/cooperative/${item.cooperatives.id}`)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )
      ) : (
        <>
          <View style={styles.filterWrap}>
            {CULTURES_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, cultureFilter.includes(c) && styles.chipActive]}
                onPress={() => toggleCulture(c)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, cultureFilter.includes(c) && styles.chipTextActive]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {discoverCoops.length === 0 ? (
            <View style={styles.centered}>
              <Ionicons name="compass-outline" size={72} color={COLORS.TEXT_MUTED} />
              <Text style={styles.emptyTitle}>Aucune coopérative trouvée</Text>
              <Text style={styles.emptySub}>Essayez d'autres cultures</Text>
            </View>
          ) : (
            <FlatList
              data={discoverCoops}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <CoopCard coop={item} onPress={() => router.push(`/cooperative/${item.id}`)} />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </>
      )}

      {/* Bouton flottant créer */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/cooperative/create")}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={COLORS.WHITE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },

  segmentWrap: {
    flexDirection: "row",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    margin: 16,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: COLORS.PRIMARY },
  segmentText: { fontSize: 13, fontWeight: "600", color: COLORS.TEXT_MUTED },
  segmentTextActive: { color: COLORS.WHITE },

  filterWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 16, marginBottom: 12 },
  chip: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  chipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  chipText: { fontSize: 12, color: COLORS.TEXT_SECONDARY },
  chipTextActive: { color: COLORS.WHITE, fontWeight: "600" },

  listContent: { paddingHorizontal: 16, paddingBottom: 90 },

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
  cardIcon: { width: 40, alignItems: "center" },
  cardInfo: { flex: 1, gap: 3 },
  cardNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardName: { fontSize: 15, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  cardCulture: { fontSize: 12, color: COLORS.ACCENT, fontWeight: "600" },
  cardDesc: { fontSize: 12, color: COLORS.TEXT_MUTED },

  founderPill: {
    backgroundColor: COLORS.ACCENT_LIGHT,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  founderText: { fontSize: 10, color: COLORS.PRIMARY_DARK, fontWeight: "700" },

  emptyTitle: { fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY, textAlign: "center" },
  emptySub: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center", lineHeight: 20 },

  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});
