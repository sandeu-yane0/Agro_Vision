import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

interface AppLogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
}

const SIZES = {
  sm: { box: 36, icon: 20, title: 16, gap: 6 },
  md: { box: 56, icon: 30, title: 22, gap: 10 },
  lg: { box: 80, icon: 42, title: 32, gap: 14 },
};

export default function AppLogo({ size = "md", showTagline = false }: AppLogoProps) {
  const s = SIZES[size];

  return (
    <View style={styles.wrap}>
      {/* Icône mark */}
      <View
        style={[
          styles.mark,
          {
            width: s.box,
            height: s.box,
            borderRadius: s.box * 0.28,
          },
        ]}
      >
        {/* Feuille principale */}
        <Ionicons name="leaf" size={s.icon} color="#fff" />
        {/* Petit point "grain" en bas à droite */}
        <View
          style={[
            styles.grain,
            { width: s.box * 0.22, height: s.box * 0.22, borderRadius: s.box * 0.11 },
          ]}
        />
      </View>

      {/* Texte */}
      <View style={{ gap: 2 }}>
        <Text style={[styles.title, { fontSize: s.title }]}>AgroVision</Text>
        {showTagline && (
          <Text style={styles.tagline}>Conseil agricole</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  mark: {
    backgroundColor: COLORS.PRIMARY,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: COLORS.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  grain: {
    position: "absolute",
    bottom: "14%",
    right: "12%",
    backgroundColor: COLORS.ACCENT,
    opacity: 0.9,
  },
  title: {
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    fontWeight: "500",
    letterSpacing: 0.3,
  },
});
