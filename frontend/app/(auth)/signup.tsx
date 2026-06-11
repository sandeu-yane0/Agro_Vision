import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";

const REGIONS = [
  "Centre", "Littoral", "Ouest", "Nord-Ouest", "Sud-Ouest",
  "Sud", "Est", "Adamaoua", "Nord", "Extrême-Nord",
];

const CULTURES_OPTIONS = [
  "Maïs 🌽", "Manioc 🥔", "Plantain 🍌", "Arachide 🥜",
  "Tomate 🍅", "Cacao 🍫", "Café ☕", "Riz 🌾", "Autre",
];

export default function SignupScreen() {
  const { user } = useAuth();

  const [fullName, setFullName]         = useState("");
  const [region, setRegion]             = useState("");
  const [showRegions, setShowRegions]   = useState(false);
  const [selectedCultures, setSelected] = useState<string[]>([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const toggleCulture = (c: string) => {
    setSelected((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setError("Veuillez entrer votre nom complet.");
      return;
    }
    setLoading(true);
    setError("");

    const uid = user?.id;
    if (!uid) {
      setError("Session introuvable. Veuillez vous reconnecter.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: uid,
        full_name: fullName.trim(),
        region: region || null,
        cultures: selectedCultures,
      });

    setLoading(false);
    if (profileError) {
      setError("Erreur lors de la sauvegarde du profil.");
      return;
    }
    // AuthGate redirige automatiquement vers /(tabs)
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoEmoji}>🌱</Text>
          <Text style={styles.logoTitle}>AgroVision</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mon profil agriculteur</Text>
          <Text style={styles.cardSub}>
            Ces informations aideront les autres agriculteurs à vous trouver.
          </Text>

          {/* Nom complet */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Nom complet *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={COLORS.TEXT_MUTED} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Jean Mbarga"
                placeholderTextColor={COLORS.TEXT_MUTED}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Région */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Région</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowRegions((v) => !v)}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={18} color={COLORS.TEXT_MUTED} style={styles.inputIcon} />
              <Text style={[styles.selectText, !region && { color: COLORS.TEXT_MUTED }]}>
                {region || "Sélectionner une région"}
              </Text>
              <Ionicons
                name={showRegions ? "chevron-up" : "chevron-down"}
                size={16}
                color={COLORS.TEXT_MUTED}
              />
            </TouchableOpacity>
            {showRegions && (
              <View style={styles.dropdown}>
                {REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.dropdownItem, region === r && styles.dropdownItemActive]}
                    onPress={() => { setRegion(r); setShowRegions(false); }}
                  >
                    <Text style={[styles.dropdownText, region === r && styles.dropdownTextActive]}>
                      {r}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Cultures */}
          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Cultures pratiquées</Text>
            <View style={styles.chipsWrap}>
              {CULTURES_OPTIONS.map((c) => {
                const selected = selectedCultures.includes(c);
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleCulture(c)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={15} color={COLORS.DANGER} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSaveProfile}
            activeOpacity={0.85}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.WHITE} size="small" />
            ) : (
              <Text style={styles.btnText}>Commencer 🌾</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipBtn} onPress={handleSaveProfile}>
            <Text style={styles.skipText}>Passer cette étape</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.BG_DARK },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  logoWrap: { alignItems: "center", marginBottom: 28 },
  logoEmoji: { fontSize: 48, marginBottom: 8 },
  logoTitle: { fontSize: 28, fontWeight: "800", color: COLORS.TEXT_PRIMARY },

  card: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 18,
  },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: 6, fontWeight: "600" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: 15, paddingVertical: 13 },

  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  selectText: { flex: 1, fontSize: 15, color: COLORS.TEXT_PRIMARY },
  dropdown: {
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    marginTop: 4,
    overflow: "hidden",
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: COLORS.PRIMARY_DARK },
  dropdownText: { fontSize: 15, color: COLORS.TEXT_PRIMARY },
  dropdownTextActive: { color: COLORS.ACCENT, fontWeight: "600" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.BG_INPUT,
  },
  chipSelected: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY_LIGHT },
  chipText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  chipTextSelected: { color: COLORS.WHITE, fontWeight: "600" },

  errorRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  errorText: { fontSize: 13, color: COLORS.DANGER, flex: 1 },

  btn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 16 },

  skipBtn: { alignItems: "center", marginTop: 12, paddingVertical: 8 },
  skipText: { fontSize: 13, color: COLORS.TEXT_MUTED },
});
