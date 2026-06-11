import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import { MarketPrice } from "../../types/index";
import COLORS from "../../constants/colors";
import MarketCard from "../../components/MarketCard";
import { getMarketPrices } from "../../services/api";

// â”€â”€â”€ Badge LIVE clignotant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function LiveBadge() {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, [pulse]);

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
      <Text style={styles.liveText}>EN DIRECT</Text>
    </View>
  );
}

// â”€â”€â”€ Skeleton card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 0.9, duration: 700, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [shimmer]);

  return (
    <Animated.View style={[styles.skeleton, { opacity: shimmer }]}>
      <View style={styles.skeletonLine} />
      <View style={[styles.skeletonLine, { width: "60%" }]} />
      <View style={[styles.skeletonLine, { width: "40%", marginTop: 4 }]} />
    </Animated.View>
  );
}

// â”€â”€â”€ Ã‰cran MarchÃ© â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ScreenState = "idle" | "loading" | "error";

export default function MarketScreen() {
  const [prices, setPrices]           = useState<MarketPrice[]>([]);
  const [state, setState]             = useState<ScreenState>("loading");
  const [refreshing, setRefreshing]   = useState(false);
  const refreshRotation               = useRef(new Animated.Value(0)).current;

  const loadPrices = useCallback(async (showSkeleton = false) => {
    if (showSkeleton) setState("loading");
    try {
      const data = await getMarketPrices();
      setPrices(data);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    loadPrices(true);
  }, [loadPrices]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    // Animation rotation du bouton refresh
    Animated.timing(refreshRotation, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start(() => refreshRotation.setValue(0));

    await loadPrices(false);
    setRefreshing(false);
  }, [loadPrices, refreshRotation]);

  const rotateInterpolate = refreshRotation.interpolate({
    inputRange:  [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* â”€â”€â”€ En-tÃªte â”€â”€â”€ */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerSubtitle}>
            Sources : MINADER Cameroun | MarchÃ©s locaux
          </Text>
          <LiveBadge />
        </View>
        <Animated.View style={{ transform: [{ rotate: rotateInterpolate }] }}>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={handleRefresh}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={20} color={COLORS.ACCENT} />
          </TouchableOpacity>
        </Animated.View>
      </View>

      {/* â”€â”€â”€ Contenu â”€â”€â”€ */}
      {state === "loading" ? (
        <View style={styles.listContent}>
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </View>
      ) : state === "error" ? (
        <View style={styles.centered}>
          <Ionicons name="wifi-outline" size={56} color={COLORS.TEXT_MUTED} />
          <Text style={styles.errorText}>Impossible de charger les prix</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadPrices(true)}>
            <Text style={styles.retryText}>RÃ©essayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item) => item.culture}
          renderItem={({ item }) => <MarketCard item={item} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.ACCENT}
              colors={[COLORS.ACCENT]}
            />
          }
          ListFooterComponent={
            <Text style={styles.footerNote}>
              ðŸ“Š Sources : MINADER Cameroun | Open Food Facts | MarchÃ©s locaux
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerLeft: {
    gap: 6,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.TEXT_MUTED,
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.BG_CARD,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },

  // Badge LIVE
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.DANGER,
  },
  liveText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.DANGER,
    letterSpacing: 0.8,
  },

  // Contenu liste
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },

  // Skeleton
  skeleton: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: COLORS.BORDER,
    borderRadius: 7,
    width: "80%",
  },

  // Erreur
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: COLORS.PRIMARY,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryText: {
    color: COLORS.WHITE,
    fontWeight: "700",
    fontSize: 15,
  },

  // Footer
  footerNote: {
    fontSize: 11,
    color: COLORS.TEXT_MUTED,
    textAlign: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
});
