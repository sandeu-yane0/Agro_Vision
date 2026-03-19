import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import StatCard from "../components/StatCard";

export default function HomeScreen() {
  const router = useRouter();

  const features = [
    {
      id: "diagnosis",
      title: "Diagnostic",
      icon: "search",
      route: "/diagnosis",
      color: colors.PRIMARY_LIGHT,
    },
    {
      id: "chat",
      title: "Assistant",
      icon: "chatbubble-ellipses",
      route: "/chat",
      color: colors.WARNING,
    },
    {
      id: "calculator",
      title: "Rentabilité",
      icon: "calculator",
      route: "/calculator",
      color: colors.SUCCESS,
    },
    {
      id: "market",
      title: "Marché",
      icon: "trending-up",
      route: "/market",
      color: colors.ACCENT,
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.logoText}>🌱 AgroVision</Text>
        <Text style={styles.subtitle}>Votre assistant agricole intelligent</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <StatCard value="38" label="Maladies" icon="bug" />
          <StatCard value="6" label="Cultures" icon="leaf" />
        </View>
        <View style={styles.statsRow}>
          <StatCard value="< 3s" label="Analyse" icon="flash" />
          <StatCard value="Oui" label="Offline" icon="cloud-offline" />
        </View>
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>Fonctionnalités</Text>
        <View style={styles.featuresGrid}>
          {features.map((feature) => (
            <TouchableOpacity
              key={feature.id}
              style={styles.featureCard}
              onPress={() => router.push(feature.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: feature.color + "20" }]}>
                <Ionicons name={feature.icon as any} size={32} color={feature.color} />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Données IRAD & MINADER Cameroun 2025</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.BACKGROUND,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: "center",
    marginVertical: 24,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.PRIMARY_DARK,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.TEXT_SECONDARY,
    textAlign: "center",
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  featuresSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
    marginBottom: 16,
  },
  featuresGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
  },
  footer: {
    alignItems: "center",
    marginTop: 16,
  },
  footerText: {
    fontSize: 12,
    color: colors.TEXT_SECONDARY,
  },
});
