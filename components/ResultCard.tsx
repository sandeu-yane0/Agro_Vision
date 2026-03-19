import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";

interface ResultCardProps {
  maladie: string;
  confiance: number;
  gravite: "LÉGER" | "MOYEN" | "CRITIQUE" | "SAIN";
  cause: string;
  traitement: string;
  prevention: string;
}

export default function ResultCard({
  maladie,
  confiance,
  gravite,
  cause,
  traitement,
  prevention,
}: ResultCardProps) {
  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedWidth, {
      toValue: confiance,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [confiance]);

  const getSeverityColor = () => {
    switch (gravite) {
      case "CRITIQUE":
        return colors.DANGER;
      case "MOYEN":
        return colors.WARNING;
      case "LÉGER":
        return colors.PRIMARY_LIGHT;
      case "SAIN":
        return colors.SUCCESS;
      default:
        return colors.TEXT_MAIN;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: getSeverityColor() }]}>{maladie}</Text>
        <View style={[styles.badge, { backgroundColor: getSeverityColor() }]}>
          <Text style={styles.badgeText}>{gravite}</Text>
        </View>
      </View>

      <View style={styles.confidenceContainer}>
        <View style={styles.confidenceHeader}>
          <Text style={styles.sectionTitle}>Niveau de confiance</Text>
          <Text style={styles.confidenceValue}>{confiance}%</Text>
        </View>
        <View style={styles.progressBarBg}>
          <Animated.View
            style={[
              styles.progressBarFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
                backgroundColor: getSeverityColor(),
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="search" size={16} color={colors.TEXT_MAIN} /> Cause
        </Text>
        <Text style={styles.text}>{cause}</Text>
      </View>

      <View style={[styles.section, styles.treatmentBox]}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="medkit" size={16} color={colors.WARNING} /> Traitement recommandé
        </Text>
        <Text style={styles.text}>{traitement}</Text>
      </View>

      <View style={[styles.section, styles.preventionBox]}>
        <Text style={styles.sectionTitle}>
          <Ionicons name="shield-checkmark" size={16} color={colors.SUCCESS} /> Prévention
        </Text>
        <Text style={styles.text}>{prevention}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.CARD,
    fontSize: 12,
    fontWeight: "bold",
  },
  confidenceContainer: {
    marginBottom: 16,
  },
  confidenceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  confidenceValue: {
    fontWeight: "bold",
    color: colors.TEXT_MAIN,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.BACKGROUND,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: colors.BORDER,
    marginVertical: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.TEXT_SECONDARY,
  },
  treatmentBox: {
    backgroundColor: "rgba(251, 140, 0, 0.1)", // WARNING pale
    padding: 12,
    borderRadius: 8,
  },
  preventionBox: {
    backgroundColor: "rgba(67, 160, 71, 0.1)", // SUCCESS pale
    padding: 12,
    borderRadius: 8,
    marginBottom: 0,
  },
});
