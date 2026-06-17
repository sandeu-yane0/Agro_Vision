import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ScrollView,
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
  reported_user_id: string;
  reporter: { full_name: string } | null;
  reported: { full_name: string; is_suspended: boolean } | null;
};

type CertRequestWithProfile = {
  id: string;
  farmer_id: string;
  motivation: string;
  status: "pending" | "approved" | "rejected" | "revoked";
  created_at: string;
  farmer: { full_name: string } | null;
};

type Section = "dashboard" | "reports" | "verification" | "cooperatives";

type CountItem = { label: string; count: number };

function topCounts(items: CountItem[], max = 6): CountItem[] {
  return [...items].sort((a, b) => b.count - a.count).slice(0, max);
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>("dashboard");

  const [reports, setReports] = useState<ReportWithProfiles[]>([]);
  const [profiles, setProfiles] = useState<FarmerProfile[]>([]);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [certRequests, setCertRequests] = useState<CertRequestWithProfile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadReports = useCallback(async () => {
    const { data } = await supabase
      .from("account_reports")
      .select(
        "id, reason, status, created_at, reported_user_id, reporter:profiles!account_reports_reporter_id_fkey(full_name), reported:profiles!account_reports_reported_user_id_fkey(full_name, is_suspended)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setReports((data as unknown as ReportWithProfiles[]) ?? []);
  }, []);

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, region, cultures, avatar_url, bio, role, is_verified, is_suspended, created_at")
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

  const loadCertRequests = useCallback(async () => {
    const { data } = await supabase
      .from("certification_requests")
      .select("id, farmer_id, motivation, status, created_at, farmer:profiles!certification_requests_farmer_id_fkey(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setCertRequests((data as unknown as CertRequestWithProfile[]) ?? []);
  }, []);

  const loadAll = useCallback(async () => {
    await Promise.all([loadReports(), loadProfiles(), loadCooperatives(), loadCertRequests()]);
    setLoading(false);
  }, [loadReports, loadProfiles, loadCooperatives, loadCertRequests]);

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

  const handleToggleSuspend = async (report: ReportWithProfiles, suspend: boolean) => {
    await supabase.from("profiles").update({ is_suspended: suspend }).eq("id", report.reported_user_id);
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id && r.reported
          ? { ...r, reported: { ...r.reported, is_suspended: suspend } }
          : r
      )
    );
    setProfiles((prev) =>
      prev.map((p) => (p.id === report.reported_user_id ? { ...p, is_suspended: suspend } : p))
    );
  };

  const handleApproveCert = async (req: CertRequestWithProfile) => {
    await supabase
      .from("certification_requests")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    await supabase.from("profiles").update({ is_verified: true }).eq("id", req.farmer_id);
    await supabase.from("notifications").insert({
      user_id: req.farmer_id,
      type: "certification_approved",
      title: "Certification approuvée",
      body: "Votre demande de certification a été approuvée. Votre badge est maintenant actif.",
    });
    setCertRequests((prev) => prev.filter((r) => r.id !== req.id));
    setProfiles((prev) => prev.map((p) => (p.id === req.farmer_id ? { ...p, is_verified: true } : p)));
  };

  const handleRejectCert = async (req: CertRequestWithProfile) => {
    await supabase
      .from("certification_requests")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", req.id);
    await supabase.from("notifications").insert({
      user_id: req.farmer_id,
      type: "certification_rejected",
      title: "Certification refusée",
      body: "Votre demande de certification a été refusée. Vous pouvez en soumettre une nouvelle.",
    });
    setCertRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handleRevokeVerified = async (profile: FarmerProfile) => {
    await supabase.from("profiles").update({ is_verified: false }).eq("id", profile.id);
    await supabase
      .from("certification_requests")
      .update({ status: "revoked", reviewed_at: new Date().toISOString() })
      .eq("farmer_id", profile.id)
      .eq("status", "approved");
    await supabase.from("notifications").insert({
      user_id: profile.id,
      type: "certification_revoked",
      title: "Certification révoquée",
      body: "Votre badge de certification a été retiré par un administrateur.",
    });
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, is_verified: false } : p)));
  };

  const handleToggleCoopStatus = async (coop: Cooperative, suspend: boolean) => {
    const newStatus = suspend ? "suspended" : "active";
    await supabase.from("cooperatives").update({ status: newStatus }).eq("id", coop.id);
    setCooperatives((prev) => prev.map((c) => (c.id === coop.id ? { ...c, status: newStatus } : c)));
  };

  const filteredProfiles = search.trim()
    ? profiles.filter((p) => p.full_name.toLowerCase().includes(search.toLowerCase()))
    : profiles;

  // ─── Statistiques dashboard ───────────────────────────────────────────
  const totalFarmers = profiles.length;
  const totalVerified = profiles.filter((p) => p.is_verified).length;
  const totalCooperatives = cooperatives.length;
  const activeCooperatives = cooperatives.filter((c) => c.status === "active").length;

  const byRegion: Record<string, number> = {};
  profiles.forEach((p) => {
    const key = p.region || "Non renseignée";
    byRegion[key] = (byRegion[key] || 0) + 1;
  });
  const regionCounts = topCounts(
    Object.entries(byRegion).map(([label, count]) => ({ label, count }))
  );

  const byCulture: Record<string, number> = {};
  profiles.forEach((p) => {
    (p.cultures || []).forEach((c) => {
      byCulture[c] = (byCulture[c] || 0) + 1;
    });
  });
  const cultureCounts = topCounts(
    Object.entries(byCulture).map(([label, count]) => ({ label, count }))
  );

  const maxRegionCount = Math.max(1, ...regionCounts.map((r) => r.count));
  const maxCultureCount = Math.max(1, ...cultureCounts.map((c) => c.count));

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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
        <View style={styles.segmentWrap}>
          {[
            { key: "dashboard", label: "Dashboard" },
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
      </ScrollView>

      {section === "dashboard" && (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          {/* Cartes de stats */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people-outline" size={20} color={COLORS.PRIMARY_LIGHT} />
              <Text style={styles.statValue}>{totalFarmers}</Text>
              <Text style={styles.statLabel}>Agriculteurs</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.ACCENT} />
              <Text style={styles.statValue}>{totalVerified}</Text>
              <Text style={styles.statLabel}>Certifiés</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="people-circle-outline" size={20} color={COLORS.PRIMARY_LIGHT} />
              <Text style={styles.statValue}>{activeCooperatives}/{totalCooperatives}</Text>
              <Text style={styles.statLabel}>Coopératives actives</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="flag-outline" size={20} color={COLORS.DANGER} />
              <Text style={styles.statValue}>{reports.length}</Text>
              <Text style={styles.statLabel}>Signalements</Text>
            </View>
          </View>

          {/* Répartition par ville/région */}
          <Text style={styles.dashSectionTitle}>Agriculteurs par ville / région</Text>
          {regionCounts.length === 0 ? (
            <Text style={styles.emptyText}>Aucune donnée pour le moment.</Text>
          ) : (
            <View style={styles.barList}>
              {regionCounts.map((r) => (
                <View key={r.label} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{r.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${(r.count / maxRegionCount) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{r.count}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Répartition par culture */}
          <Text style={styles.dashSectionTitle}>Agriculteurs par culture</Text>
          {cultureCounts.length === 0 ? (
            <Text style={styles.emptyText}>Aucune donnée pour le moment.</Text>
          ) : (
            <View style={styles.barList}>
              {cultureCounts.map((c) => (
                <View key={c.label} style={styles.barRow}>
                  <Text style={styles.barLabel} numberOfLines={1}>{c.label}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, styles.barFillAccent, { width: `${(c.count / maxCultureCount) * 100}%` }]} />
                  </View>
                  <Text style={styles.barCount}>{c.count}</Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

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
                {item.reported?.is_suspended && (
                  <View style={styles.suspendedTag}>
                    <Ionicons name="ban-outline" size={12} color={COLORS.DANGER} />
                    <Text style={styles.suspendedTagText}>Compte suspendu</Text>
                  </View>
                )}
                <View style={styles.certActions}>
                  <TouchableOpacity
                    style={item.reported?.is_suspended ? styles.approveBtn : styles.rejectBtn}
                    onPress={() => handleToggleSuspend(item, !item.reported?.is_suspended)}
                    activeOpacity={0.8}
                  >
                    <Text style={item.reported?.is_suspended ? styles.approveText : styles.rejectText}>
                      {item.reported?.is_suspended ? "Réactiver le compte" : "Suspendre le compte"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.reviewBtn}
                    onPress={() => handleReviewReport(item.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.reviewText}>Marquer traité</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          />
        )
      )}

      {section === "verification" && (
        <>
          {certRequests.length > 0 && (
            <View style={styles.certSection}>
              <Text style={styles.certSectionTitle}>Demandes en attente</Text>
              {certRequests.map((req) => (
                <View key={req.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{req.farmer?.full_name ?? "?"}</Text>
                  <Text style={styles.cardBody}>{req.motivation}</Text>
                  <Text style={styles.cardTime}>
                    {new Date(req.created_at).toLocaleString("fr-FR")}
                  </Text>
                  <View style={styles.certActions}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleRejectCert(req)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.rejectText}>Refuser</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApproveCert(req)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.approveText}>Approuver</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color={COLORS.TEXT_MUTED} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher un agriculteur certifié..."
              placeholderTextColor={COLORS.TEXT_MUTED}
            />
          </View>
          <FlatList
            data={filteredProfiles.filter((p) => p.is_verified)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Aucun agriculteur certifié pour le moment.</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <View style={styles.rowNameWrap}>
                    <Text style={styles.rowName}>{item.full_name}</Text>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.ACCENT} />
                  </View>
                  {item.region && <Text style={styles.rowSub}>{item.region}</Text>}
                  <Text style={styles.rowSub}>
                    Membre depuis le {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.revokeBtn}
                  onPress={() => handleRevokeVerified(item)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.revokeText}>Révoquer</Text>
                </TouchableOpacity>
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

  segmentScroll: { paddingHorizontal: 16, paddingTop: 16 },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 2,
  },
  segment: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, alignItems: "center" },
  segmentActive: { backgroundColor: COLORS.PRIMARY },
  segmentText: { fontSize: 12, fontWeight: "600", color: COLORS.TEXT_MUTED },
  segmentTextActive: { color: COLORS.WHITE },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  statCard: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 14,
    gap: 6,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.TEXT_PRIMARY },
  statLabel: { fontSize: 12, color: COLORS.TEXT_MUTED },

  dashSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.TEXT_SECONDARY,
    marginTop: 20,
    marginBottom: 12,
  },
  barList: { gap: 10 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  barLabel: { width: 90, fontSize: 12, color: COLORS.TEXT_SECONDARY },
  barTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.BG_CARD,
    overflow: "hidden",
  },
  barFill: { height: "100%", borderRadius: 5, backgroundColor: COLORS.PRIMARY_LIGHT },
  barFillAccent: { backgroundColor: COLORS.ACCENT },
  barCount: { width: 24, textAlign: "right", fontSize: 12, color: COLORS.TEXT_MUTED },

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
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  suspendedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  suspendedTagText: { fontSize: 11, color: COLORS.DANGER, fontWeight: "600" },
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
  rowNameWrap: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowName: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  rowSub: { fontSize: 12, color: COLORS.TEXT_MUTED },

  certSection: { paddingHorizontal: 16, marginBottom: 8 },
  certSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  certActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  approveBtn: {
    flex: 1,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
  },
  approveText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 12 },
  rejectBtn: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
    paddingVertical: 9,
    alignItems: "center",
  },
  rejectText: { color: COLORS.DANGER, fontWeight: "700", fontSize: 12 },

  revokeBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.DANGER,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  revokeText: { color: COLORS.DANGER, fontWeight: "700", fontSize: 12 },
});
