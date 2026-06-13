import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Switch,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { Cooperative, FarmerProfile } from "../../types/index";

type ReportWithProfiles = {
  id: string;
  reason: string;
  status: "pending" | "reviewed";
  created_at: string;
  reporter: { full_name: string } | null;
  reported: { full_name: string } | null;
};

type Section = "reports" | "verification" | "cooperatives";

export default function AdminScreen() {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>("reports");

  const [reports, setReports] = useState<ReportWithProfiles[]>([]);
  const [profiles, setProfiles] = useState<FarmerProfile[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("account_reports")
      .select(
        "id, reason, status, created_at, reporter:profiles!account_reports_reporter_id_fkey(full_name), reported:profiles!account_reports_reported_user_id_fkey(full_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setReports((data as unknown as ReportWithProfiles[]) ?? []);
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, created_at")
      .order("full_name");

    setProfiles((data as FarmerProfile[]) ?? []);
  }, []);

  const loadCooperatives = useCallback(async () => {
    const { data } = await supabase
      .from("cooperatives")
      .select("*")
      .order("created_at", { ascending: false });

    setCooperatives((data as Cooperative[]) ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadReports(), loadProfiles(), loadCooperatives()]);
    setLoading(false);
  }, [loadReports, loadProfiles, loadCooperatives]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [loadAll])
  );

  const handleReviewReport = async (id: string) => {
    await supabase.from("account_reports").update({ status: "reviewed" }).eq("id", id);
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const handleToggleVerified = async (profile: FarmerProfile, value: boolean) => {
    await supabase.from("profiles").update({ is_verified: value }).eq("id", profile.id);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_verified: value } : p)));
  };

  const handleToggleCoopStatus = async (coop: Cooperative, suspend: boolean) => {
    const newStatus = suspend ? "suspended" : "active";
    await supabase.from("cooperatives").update({ status: newStatus }).eq("id", coop.id);
    setCooperatives((prev) => prev.map((c) => (c.id === coop.id ? { ...c, status: newStatus } : c)));
  };

  const filteredProfiles = search.trim()
    ? profiles.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  if (profile?.role !== "admin") {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={64} color={COLORS.TEXT_MUTED} />
        <Text style={styles.emptyText}>Accès réservé aux administrateurs</Text>
      </View>
    );
  }

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
        {[
          { key: "reports", label: "Signalements" },
          { key: "verification", label: "Vérification" },
          { key: "cooperatives", label: "Coopératives" },
        ].map((s) => (
          <TouchableOpacity
            key={s.key}
            style={[styles.segment, section === s.key && styles.segmentActive]}
            onPress={() => setSection(s.key as Section)}
            activeOpacity={0.8}
          >
            <Text style={[styles.segmentText, section === s.key && styles.segmentTextActive]}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === "reports" && (
        reports.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color={COLORS.TEXT_MUTED} />
            <Text style={styles.emptyText}>Aucun signalement en attente</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.reporter?.full_name ?? "?"} a signalé {item.reported?.full_name ?? "?"}
                </Text>
                <Text style={styles.cardBody}>{item.reason}</Text>
                <Text style={styles.cardTime}>
                  {new Date(item.created_at).toLocaleString("fr-FR")}
                </Text>
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => handleReviewReport(item.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.reviewText}>Marquer traité</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )
      )}

      {section === "verification" && (
        <>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={COLORS.TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un agriculteur..."
              placeholderTextColor={COLORS.TEXT_MUTED}
            />
          </View>
          <FlatList
            data={filteredProfiles}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View>
                  <Text style={styles.rowName}>{item.full_name}</Text>
                  {item.region && <Text style={styles.rowSub}>{item.region}</Text>}
                </View>
                <Switch
                  value={item.is_verified}
                  onValueChange={(v) => handleToggleVerified(item, v)}
                  trackColor={{ false: COLORS.BG_INPUT, true: COLORS.PRIMARY_LIGHT }}
                  thumbColor={COLORS.WHITE}
                />
              </View>
            )}
          />
        </>
      )}

      {section === "cooperatives" && (
        <FlatList
          data={cooperatives}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{item.name}</Text>
                <Text style={styles.rowSub}>{item.culture} · {item.status}</Text>
              </View>
              <Switch
                value={item.status === "active"}
                onValueChange={(v) => handleToggleCoopStatus(item, !v)}
                trackColor={{ false: COLORS.BG_INPUT, true: COLORS.PRIMARY_LIGHT }}
                thumbColor={COLORS.WHITE}
              />
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  emptyText: { fontSize: 14, color: COLORS.TEXT_SECONDARY, textAlign: "center" },

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
  segmentText: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_MUTED },
  segmentTextActive: { color: COLORS.WHITE },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  searchInput: { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: 15, paddingVertical: 12 },

  listContent: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },

  card: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 14,
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  cardBody: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  cardTime: { fontSize: 11, color: COLORS.TEXT_MUTED },

  reviewBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    marginTop: 6,
  },
  reviewText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 14,
    marginBottom: 10,
  },
  rowName: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  rowSub: { fontSize: 12, color: COLORS.TEXT_MUTED },
});
