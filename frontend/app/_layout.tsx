import { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from "react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import COLORS from "../constants/colors";

function SuspendedScreen() {
  const { signOut } = useAuth();
  return (
    <View style={styles.suspendedContainer}>
      <Text style={styles.suspendedTitle}>Compte suspendu</Text>
      <Text style={styles.suspendedText}>
        Votre compte a été suspendu par un administrateur suite à un signalement.
        Contactez le support si vous pensez qu'il s'agit d'une erreur.
      </Text>
      <TouchableOpacity style={styles.suspendedBtn} onPress={signOut} activeOpacity={0.85}>
        <Text style={styles.suspendedBtnText}>Se déconnecter</Text>
      </TouchableOpacity>
    </View>
  );
}

function AuthGate() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "(auth)";
    if (!user && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [user, loading]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={COLORS.ACCENT} />
      </View>
    );
  }

  if (user && profile?.is_suspended) {
    return <SuspendedScreen />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
    justifyContent: "center",
    alignItems: "center",
  },
  suspendedContainer: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  suspendedTitle: { fontSize: 22, fontWeight: "800", color: COLORS.DANGER },
  suspendedText: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 20,
  },
  suspendedBtn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 8,
  },
  suspendedBtnText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 15 },
});
