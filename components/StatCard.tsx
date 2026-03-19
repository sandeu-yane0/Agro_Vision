import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

interface StatCardProps {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function StatCard({ value, label, icon }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Ionicons name={icon} size={28} color={colors.PRIMARY} style={styles.icon} />
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  icon: {
    marginBottom: 8,
  },
  value: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.TEXT_MAIN,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    textAlign: "center",
  },
});
