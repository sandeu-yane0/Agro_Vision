import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import COLORS from "../constants/colors";

const BASE_URL = "http://localhost:8000/api/v1";

const VILLES = ["yaoundé", "douala", "bafoussam", "garoua", "bertoua", "ebolowa", "bafia"];

const REGION_TO_VILLE: Record<string, string> = {
  "centre": "yaoundé",
  "littoral": "douala",
  "ouest": "bafoussam",
  "nord": "garoua",
  "adamaoua": "garoua",
  "est": "bertoua",
  "sud": "ebolowa",
  "sud-ouest": "douala",
  "nord-ouest": "bafoussam",
  "extrême-nord": "garoua",
  "extreme-nord": "garoua",
};

function getDefaultVille(region: string | null): string {
  if (!region) return "yaoundé";
  const key = region.toLowerCase().trim();
  return REGION_TO_VILLE[key] ?? "yaoundé";
}

interface WeatherDay {
  date: string;
  icon: string;
  pluie: number;
  tmax: number;
  tmin: number;
}

interface WeatherAlert {
  type: "danger" | "warning" | "info";
  message: string;
}

interface WeatherData {
  ville: string;
  previsions: WeatherDay[];
  alertes: WeatherAlert[];
  source: string;
  updated: string;
}

// ─── Écran Météo ─────────────────────────────────────────────────────────────

export default function WeatherScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [ville, setVille] = useState<string>(() =>
    getDefaultVille(profile?.region ?? null)
  );
  const [data, setData] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = useCallback(async (v: string, refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${BASE_URL}/weather?ville=${encodeURIComponent(v)}`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: WeatherData = await res.json();
      setData(json);
    } catch {
      setError("Impossible de charger la météo.\nVérifiez que le serveur est démarré.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWeather(ville);
  }, [ville, fetchWeather]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });

  const alertColor = (type: string) => {
    if (type === "danger") return COLORS.DANGER;
    if (type === "warning") return COLORS.WARNING;
    return "#4FC3F7";
  };

  const alertIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    if (type === "danger") return "alert-circle";
    if (type === "warning") return "warning";
    return "information-circle";
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Météo Agricole</Text>
        <TouchableOpacity
          onPress={() => fetchWeather(ville, true)}
          style={styles.refreshBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={COLORS.TEXT_SECONDARY} />
        </TouchableOpacity>
      </View>

      {/* Sélecteur de ville */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {VILLES.map((v) => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, ville === v && styles.chipActive]}
            onPress={() => setVille(v)}
            activeOpacity={0.75}
          >
            <Text style={[styles.chipText, ville === v && styles.chipTextActive]}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Contenu */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.ACCENT} />
          <Text style={styles.loadingText}>Chargement des prévisions...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={64} color={COLORS.TEXT_MUTED} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchWeather(ville)}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : data ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchWeather(ville, true)}
              tintColor={COLORS.ACCENT}
            />
          }
        >
          {/* Ville + heure mise à jour */}
          <View style={styles.locationRow}>
            <View style={styles.locationLeft}>
              <Ionicons name="location" size={16} color={COLORS.ACCENT} />
              <Text style={styles.locationText}>{data.ville}</Text>
            </View>
            <Text style={styles.updatedText}>màj {data.updated}</Text>
          </View>

          {/* Prévisions 7 jours */}
          <Text style={styles.sectionTitle}>Prévisions 7 jours</Text>
          {data.previsions.map((day, i) => (
            <View key={i} style={[styles.dayCard, i === 0 && styles.dayCardToday]}>
              <Text style={styles.dayIcon}>{day.icon}</Text>
              <View style={styles.dayMid}>
                <Text style={[styles.dayDate, i === 0 && styles.dayDateToday]}>
                  {i === 0 ? "Aujourd'hui" : formatDate(day.date)}
                </Text>
                <View style={styles.rainRow}>
                  <Ionicons name="water" size={11} color="#4FC3F7" />
                  <Text style={styles.rainText}>{day.pluie} mm</Text>
                </View>
              </View>
              <View style={styles.tempCol}>
                <Text style={styles.tempMax}>{day.tmax}°</Text>
                <Text style={styles.tempMin}>{day.tmin}°</Text>
              </View>
            </View>
          ))}

          {/* Alertes agricoles */}
          {data.alertes.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Alertes agricoles</Text>
              {data.alertes.map((alerte, i) => (
                <View
                  key={i}
                  style={[styles.alertCard, { borderLeftColor: alertColor(alerte.type) }]}
                >
                  <Ionicons
                    name={alertIcon(alerte.type)}
                    size={18}
                    color={alertColor(alerte.type)}
                  />
                  <Text style={styles.alertText}>{alerte.message}</Text>
                </View>
              ))}
            </>
          )}

          <Text style={styles.sourceText}>Source : {data.source}</Text>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  backBtn:     { padding: 4 },
  refreshBtn:  { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginLeft: 8,
  },

  chipsRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: COLORS.BG_CARD,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  chipActive:     { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY_LIGHT },
  chipText:       { fontSize: 13, color: COLORS.TEXT_SECONDARY, fontWeight: "500" },
  chipTextActive: { color: COLORS.WHITE, fontWeight: "700" },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  loadingText: { fontSize: 14, color: COLORS.TEXT_SECONDARY },
  errorText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: { color: COLORS.WHITE, fontWeight: "600" },

  content: { padding: 16, paddingBottom: 40 },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  locationLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 15, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  updatedText:  { fontSize: 12, color: COLORS.TEXT_MUTED },

  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.TEXT_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  dayCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    gap: 12,
  },
  dayCardToday: {
    borderColor: COLORS.PRIMARY_LIGHT,
    backgroundColor: COLORS.BG_INPUT,
  },
  dayIcon: { fontSize: 26, width: 34, textAlign: "center" as never },
  dayMid:  { flex: 1 },
  dayDate:      { fontSize: 14, fontWeight: "600", color: COLORS.TEXT_SECONDARY },
  dayDateToday: { color: COLORS.TEXT_PRIMARY, fontWeight: "700" },
  rainRow:  { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 },
  rainText: { fontSize: 12, color: "#4FC3F7" },
  tempCol:  { alignItems: "flex-end" },
  tempMax:  { fontSize: 18, fontWeight: "700", color: COLORS.TEXT_PRIMARY },
  tempMin:  { fontSize: 13, color: COLORS.TEXT_SECONDARY },

  alertCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    borderLeftWidth: 3,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    lineHeight: 18,
  },

  sourceText: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textAlign: "center",
    marginTop: 16,
  },
});
