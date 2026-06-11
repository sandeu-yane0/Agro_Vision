import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import COLORS from "../../constants/colors";
import { FarmerProfile } from "../../types/index";

const CULTURES_OPTIONS = [
  "Maïs 🌽", "Manioc 🥔", "Plantain 🍌", "Arachide 🥜",
  "Tomate 🍅", "Cacao 🍫", "Café ☕", "Riz 🌾", "Autre",
];

const REGIONS = [
  "Centre", "Littoral", "Ouest", "Nord-Ouest", "Sud-Ouest",
  "Sud", "Est", "Adamaoua", "Nord", "Extrême-Nord",
];

function Avatar({ name, size = 80 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user } = useAuth();

  const [profile, setProfile]         = useState<Partial<FarmerProfile>>({});
  const [editing, setEditing]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [showRegions, setShowRegions] = useState(false);

  // Champs édition
  const [fullName, setFullName]   = useState("");
  const [region, setRegion]       = useState("");
  const [bio, setBio]             = useState("");
  const [cultures, setCultures]   = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (!user) return;
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (active && data) {
          setProfile(data);
          setFullName(data.full_name ?? "");
          setRegion(data.region ?? "");
          setBio(data.bio ?? "");
          setCultures(data.cultures ?? []);
        }
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [user])
  );

  const toggleCulture = (c: string) => {
    setCultures((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Erreur", "Le nom est requis.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user!.id,
        full_name: fullName.trim(),
        region: region || null,
        bio: bio.trim() || null,
        cultures,
      });
    setSaving(false);
    if (error) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
      return;
    }
    setProfile((prev) => ({ ...prev, full_name: fullName.trim(), region, bio, cultures }));
    setEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
      </View>
    );
  }

  const displayName = profile.full_name || user?.email?.split("@")[0] || "Agriculteur";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style="light" />

      {/* En-tête profil */}
      <View style={styles.profileHeader}>
        <Avatar name={displayName} size={88} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {profile.region && (
          <View style={styles.regionRow}>
            <Ionicons name="location-outline" size={14} color={COLORS.TEXT_MUTED} />
            <Text style={styles.regionText}>{profile.region}</Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {!editing && profile.bio && (
        <View style={styles.bioCard}>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      )}

      {/* Cultures */}
      {!editing && cultures.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mes cultures</Text>
          <View style={styles.chipsWrap}>
            {cultures.map((c) => (
              <View key={c} style={styles.chip}>
                <Text style={styles.chipText}>{c}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─── Mode édition ─────────────────────────────────────────── */}
      {editing ? (
        <View style={styles.editCard}>
          <Text style={styles.editTitle}>Modifier le profil</Text>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Nom complet *</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Votre nom"
                placeholderTextColor={COLORS.TEXT_MUTED}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Région</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setShowRegions((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={[styles.selectText, !region && { color: COLORS.TEXT_MUTED }]}>
                {region || "Choisir une région"}
              </Text>
              <Ionicons name={showRegions ? "chevron-up" : "chevron-down"} size={16} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
            {showRegions && (
              <View style={styles.dropdown}>
                {REGIONS.map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.dropdownItem, region === r && styles.dropdownItemActive]}
                    onPress={() => { setRegion(r); setShowRegions(false); }}
                  >
                    <Text style={[styles.dropdownText, region === r && styles.dropdownTextActive]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Dites quelque chose sur vous..."
              placeholderTextColor={COLORS.TEXT_MUTED}
              multiline
              maxLength={200}
            />
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.label}>Mes cultures</Text>
            <View style={styles.chipsWrap}>
              {CULTURES_OPTIONS.map((c) => {
                const selected = cultures.includes(c);
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

          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setEditing(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Annuler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.btnDisabled]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.WHITE} size="small" />
              ) : (
                <Text style={styles.saveText}>Sauvegarder</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.editProfileBtn}
          onPress={() => setEditing(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color={COLORS.WHITE} />
          <Text style={styles.editProfileText}>Modifier mon profil</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.BG_DARK },
  content: { paddingBottom: 40 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  profileHeader: {
    alignItems: "center",
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
    gap: 8,
  },
  avatar: {
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 3,
    borderColor: COLORS.PRIMARY_LIGHT,
  },
  avatarText: { color: COLORS.WHITE, fontWeight: "700" },
  displayName: { fontSize: 22, fontWeight: "800", color: COLORS.TEXT_PRIMARY },
  email: { fontSize: 13, color: COLORS.TEXT_MUTED },
  regionRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  regionText: { fontSize: 13, color: COLORS.TEXT_MUTED },

  bioCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  bioText: { fontSize: 14, color: COLORS.TEXT_SECONDARY, lineHeight: 20 },

  section: { paddingHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: COLORS.TEXT_SECONDARY, marginBottom: 10 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.BG_CARD,
  },
  chipSelected: { backgroundColor: COLORS.PRIMARY, borderColor: COLORS.PRIMARY_LIGHT },
  chipText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  chipTextSelected: { color: COLORS.WHITE, fontWeight: "600" },

  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.PRIMARY,
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    paddingVertical: 14,
  },
  editProfileText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },

  editCard: {
    margin: 16,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 20,
    textAlign: "center",
  },

  fieldWrap: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.TEXT_SECONDARY, marginBottom: 6, fontWeight: "600" },
  inputRow: {
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
  },
  input: { color: COLORS.TEXT_PRIMARY, fontSize: 15, paddingVertical: 12 },
  bioInput: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },

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

  editActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { color: COLORS.TEXT_SECONDARY, fontWeight: "600", fontSize: 15 },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: { opacity: 0.6 },
  saveText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
});
