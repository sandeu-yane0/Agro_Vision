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
    if (!name.trim() || !culture) {
      setError("Le nom et la culture sont obligatoires.");
      return;
    }
    setError("");
    setLoading(true);

    const { data: coop, error: coopError } = await supabase
      .from("cooperatives")
      .insert({
        name: name.trim(),
        culture,
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
        <Text style={styles.label}>Nom de la coopérative</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Ex : Coopérative des planteurs de maïs"
          placeholderTextColor={COLORS.TEXT_MUTED}
          maxLength={80}
        />

        <Text style={styles.label}>Culture</Text>
        <View style={styles.chipsWrap}>
          {CULTURES_OPTIONS.map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.chip, culture === c && styles.chipActive]}
              onPress={() => setCulture(c)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, culture === c && styles.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Description (optionnel)</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={description}
          onChangeText={setDescription}
          placeholder="Décrivez l'objectif de votre coopérative..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          multiline
          maxLength={300}
        />

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[styles.submitBtn, (!name.trim() || !culture) && styles.submitBtnDisabled]}
          onPress={handleCreate}
          disabled={!name.trim() || !culture || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.WHITE} />
          ) : (
            <Text style={styles.submitText}>Créer la coopérative</Text>
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

  content: { padding: 16, gap: 6, paddingBottom: 40 },

  label: { fontSize: 13, color: COLORS.TEXT_MUTED, marginTop: 14, marginBottom: 6 },

  input: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    padding: 12,
  },
  textarea: { minHeight: 90, textAlignVertical: "top" },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  chipActive: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY },
  chipText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  chipTextActive: { color: COLORS.WHITE, fontWeight: "600" },

  errorText: { color: COLORS.DANGER, fontSize: 13, marginTop: 12 },

  submitBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
});
