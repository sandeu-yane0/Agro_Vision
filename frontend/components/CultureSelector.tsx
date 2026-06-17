import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";
import { CULTURES_OPTIONS } from "../constants/cultures";

interface CultureSelectorProps {
  selected: string[];
  onChange: (cultures: string[]) => void;
}

export default function CultureSelector({ selected, onChange }: CultureSelectorProps) {
  const [input, setInput] = useState("");

  const addCulture = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    const exists = selected.some((c) => c.toLowerCase() === value.toLowerCase());
    if (!exists) onChange([...selected, value]);
    setInput("");
  };

  const removeCulture = (value: string) => {
    onChange(selected.filter((c) => c !== value));
  };

  const suggestions = CULTURES_OPTIONS.filter(
    (c) => !selected.some((s) => s.toLowerCase() === c.toLowerCase())
  );

  return (
    <View style={{ gap: 10 }}>
      {/* Saisie libre */}
      <View style={styles.inputRow}>
        <Ionicons name="leaf-outline" size={16} color={COLORS.TEXT_MUTED} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Tapez une culture et validez..."
          placeholderTextColor={COLORS.TEXT_MUTED}
          onSubmitEditing={() => addCulture(input)}
          returnKeyType="done"
          maxLength={40}
        />
        {!!input.trim() && (
          <TouchableOpacity onPress={() => addCulture(input)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add-circle" size={20} color={COLORS.PRIMARY_LIGHT} />
          </TouchableOpacity>
        )}
      </View>

      {/* Cultures sélectionnées */}
      {selected.length > 0 && (
        <View style={styles.chipsWrap}>
          {selected.map((c) => (
            <View key={c} style={styles.chipSelected}>
              <Text style={styles.chipTextSelected}>{c}</Text>
              <TouchableOpacity onPress={() => removeCulture(c)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="close" size={13} color={COLORS.WHITE} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <View style={styles.chipsWrap}>
          {suggestions.map((c) => (
            <TouchableOpacity key={c} style={styles.chip} onPress={() => addCulture(c)} activeOpacity={0.75}>
              <Text style={styles.chipText}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
  },
  input: { flex: 1, color: COLORS.TEXT_PRIMARY, fontSize: 15, paddingVertical: 13 },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.BG_INPUT,
  },
  chipText: { fontSize: 13, color: COLORS.TEXT_SECONDARY },
  chipSelected: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: COLORS.PRIMARY,
  },
  chipTextSelected: { fontSize: 13, color: COLORS.WHITE, fontWeight: "600" },
});
