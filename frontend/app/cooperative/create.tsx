import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { CULTURES_OPTIONS } from "../../constants/cultures";

// Suggestions rapides (sans emoji ni "Autre")
const CULTURE_SUGGESTIONS = CULTURES_OPTIONS.filter(
  (c) => c !== "Autre"
).map((c) => c.replace(/\s[\u{1F300}-\u{1FFFF}]/u, "").trim());

export default function CreateCooperativeScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [culture, setCulture] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async () => {
    if (!user) return;
    if (!name.trim() || !culture.trim()) {
      setError("Le nom et la culture sont obligatoires.");
      return;
    }
    setError("");
    setLoading(true);

    const { data: coop, error: coopError } = await supabase
      .from("cooperatives")
      .insert({
        name: name.trim(),
        culture: culture.trim(),
        description: description.trim() || null,
        founder_id: user.id,
      })
      .select("id")
      .single();

    if (coopError || !coop) {
      setError("Impossible de créer la coopérative. Réessayez.");
      setLoading(false);
      return;
    }

    await supabase.from("cooperative_members").insert({
      cooperative_id: coop.id,
      member_id: user.id,
      role: "founder",
      status: "accepted",
      responded_at: new Date().toISOString(),
    });

    router.replace(`/cooperative/${coop.id}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={COLORS.TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nouvelle coopérative</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Nom */}
        <Text style={styles.label}>Nom de la coopérative *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex : Coopérative des planteurs du Centre"
          placeholderTextColor={COLORS.TEXT_MUTED}
          maxLength={80}
        />

        {/* Culture — saisie libre */}
        <Text style={styles.label}>Culture principale *</Text>
        <View style={styles.cultureInputWrap}>
          <Ionicons name="leaf-outline" size={16} color={COLORS.TEXT_MUTED} style={styles.cultureIcon} />
          <TextInput
            style={styles.cultureInput}
            value={culture}
            onChangeText={setCulture}
            placeholder="Ex : Maïs, Manioc, Cacao..."
            placeholderTextColor={COLORS.TEXT_MUTED}
            maxLength={60}
          />
          {culture.length > 0 && (
            <TouchableOpacity onPress={() => setCulture("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions rapides */}
        <Text style={styles.suggestLabel}>Suggestions rapides</Text>
        <View style={styles.chipsWrap}>
          {CULTURE_SUGGESTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, culture === c && styles.chipActive]}
              onPress={() => setCulture(culture === c ? "" : c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, culture === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Objectif, zone géographique, conditions d'adhésion..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          multiline
          maxLength={300}
        />
        <Text style={styles.charCount}>{description.length}/300</Text>

        {!!error && (
          <View style={styles.errorWrap}>
            <Ionicons name="alert-circle-outline" size={15} color={COLORS.DANGER} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, (!name.trim() || !culture.trim()) && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || !culture.trim() || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.WHITE} />
              <Text style={styles.submitText}>Créer la coopérative</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
    gap: 8,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.TEXT_PRIMARY },

  content: { padding: 16, paddingBottom: 40 },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.TEXT_MUTED,
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  input: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    padding: 13,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },

  cultureInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 13,
    paddingVertical: 13,
    gap: 8,
  },
  cultureIcon: { flexShrink: 0 },
  cultureInput: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    padding: 0,
  },

  suggestLabel: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    marginTop: 10,
    marginBottom: 8,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
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

  charCount: { fontSize: 11, color: COLORS.TEXT_MUTED, textAlign: "right", marginTop: 4 },

  errorWrap: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14 },
  errorText: { color: COLORS.DANGER, fontSize: 13 },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
});
