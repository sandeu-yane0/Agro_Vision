import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { getMarketPrices, MarketPrice } from "../services/api";

export default function MarketScreen() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await getMarketPrices();
        setPrices(data);
        setStatus("success");
      } catch (error) {
        setStatus("error");
      }
    };

    fetchPrices();
  }, []);

  const getArrowIcon = (tendance: "up" | "down" | "stable") => {
    switch (tendance) {
      case "up":
        return <Ionicons name="arrow-up" size={20} color={colors.SUCCESS} />;
      case "down":
        return <Ionicons name="arrow-down" size={20} color={colors.DANGER} />;
      case "stable":
        return <Ionicons name="remove" size={20} color={colors.TEXT_SECONDARY} />;
    }
  };

  const getCultureIcon = (culture: string) => {
    // Une implémentation plus riche utiliserait de vraies icônes par culture
    return "leaf";
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Prix du Marché</Text>
        <Text style={styles.subtitle}>
          Mise à jour : {new Date().toLocaleDateString("fr-FR")}
        </Text>
      </View>

      {status === "loading" ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.PRIMARY} />
        </View>
      ) : status === "error" ? (
        <View style={styles.centerContent}>
          <Ionicons name="alert-circle" size={48} color={colors.DANGER} />
          <Text style={styles.errorText}>Impossible de charger les prix.</Text>
        </View>
      ) : (
        <ScrollView style={styles.listContainer} contentContainerStyle={styles.listContent}>
          {prices.map((item, index) => (
            <View key={index} style={styles.priceCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cultureInfo}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={getCultureIcon(item.culture)} size={24} color={colors.PRIMARY} />
                  </View>
                  <Text style={styles.cultureName}>
                    {item.culture.charAt(0).toUpperCase() + item.culture.slice(1)}
                  </Text>
                </View>
                <View style={styles.priceInfo}>
                  <Text style={styles.priceValue}>{item.prix_kg} FCFA</Text>
                  <Text style={styles.priceUnit}>/ {item.unite}</Text>
                </View>
              </View>
              
              <View style={styles.cardFooter}>
                <View style={styles.marketInfo}>
                  <Ionicons name="location" size={14} color={colors.TEXT_SECONDARY} />
                  <Text style={styles.marketName}>{item.marche}</Text>
                </View>
                <View style={styles.trendInfo}>
                  {getArrowIcon(item.tendance)}
                </View>
              </View>
            </View>
          ))}
          
          <Text style={styles.footerNote}>Source : MINADER Cameroun</Text>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  header: {
    padding: 16,
    paddingTop: 24,
    backgroundColor: colors.CARD,
    borderBottomWidth: 1,
    borderBottomColor: colors.BORDER,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.TEXT_MAIN,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.DANGER,
    textAlign: "center",
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  priceCard: {
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cultureInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(76, 175, 80, 0.1)", // PRIMARY_LIGHT avec opacité
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  cultureName: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
  },
  priceInfo: {
    alignItems: "flex-end",
  },
  priceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: colors.PRIMARY_DARK,
  },
  priceUnit: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.BORDER,
  },
  marketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  marketName: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginLeft: 4,
  },
  trendInfo: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: colors.BACKGROUND,
  },
  footerNote: {
    textAlign: "center",
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
    marginTop: 16,
    fontStyle: "italic",
  },
});
