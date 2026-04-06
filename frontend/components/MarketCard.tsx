import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MarketPrice } from "../types/index";
import COLORS from "../constants/colors";

interface MarketCardProps {
  item: MarketPrice;
}

export default function MarketCard({ item }: MarketCardProps) {
  const isUp     = item.tendance === "up";
  const isDown   = item.tendance === "down";
  const isStable = item.tendance === "stable";

  const trendColor = isUp
    ? COLORS.SUCCESS
    : isDown
    ? COLORS.DANGER
    : COLORS.TEXT_SECONDARY;

  const trendIcon = isUp
    ? "trending-up"
    : isDown
    ? "trending-down"
    : "remove";

  const variationText =
    item.variation > 0
      ? `+${item.variation}`
      : item.variation < 0
      ? `${item.variation}`
      : "=";

  return (
    <View style={styles.card}>
      {/* Ligne 1 : nom + prix */}
      <View style={styles.row}>
        <View style={styles.cultureInfo}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.cultureName}>{item.culture}</Text>
        </View>
        <Text style={styles.price}>
          {item.prix_kg.toLocaleString("fr-FR")} {item.unite}
        </Text>
      </View>

      {/* Ligne 2 : marché + variation */}
      <View style={styles.row}>
        <Text style={styles.marche}>{item.marche}</Text>
        <View style={styles.trendBadge}>
          <Ionicons name={trendIcon as "trending-up"} size={14} color={trendColor} />
          <Text style={[styles.variation, { color: trendColor }]}>
            {" "}{variationText} FCFA
          </Text>
        </View>
      </View>

      {/* Ligne 3 : lastUpdated */}
      <Text style={styles.updated}>
        Mis à jour : {item.lastUpdated}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  cultureInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  emoji: {
    fontSize: 22,
  },
  cultureName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  price: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.ACCENT,
  },
  marche: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
    flex: 1,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  variation: {
    fontSize: 13,
    fontWeight: "600",
  },
  updated: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    fontStyle: "italic",
    marginTop: 2,
  },
});
