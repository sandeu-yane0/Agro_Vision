import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  NativeSyntheticEvent,
  TextInputKeyPressEventData,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../../lib/supabase";
import COLORS from "../../constants/colors";
import AppLogo from "../../components/AppLogo";

// ─── Saisie du code OTP (6 cases) ─────────────────────────────────────────

function OtpInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const inputs = useRef<(TextInput | null)[]>([]);
  const digits = value.padEnd(8, " ").split("").slice(0, 8);

  const handleChange = (text: string, index: number) => {
    const digit = text.replace(/[^0-9]/g, "").slice(-1);
    const newVal = digits.map((d, i) => (i === index ? digit : d === " " ? "" : d)).join("");
    onChange(newVal.replace(/ /g, ""));
    if (digit && index < 7) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === "Backspace" && !digits[index].trim() && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={otp.row}>
      {digits.map((digit, i) => (
        <TextInput
          key={i}
          ref={(r) => { inputs.current[i] = r; }}
          style={[otp.box, digit.trim() ? otp.boxFilled : null]}
          value={digit.trim()}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={(e) => handleKeyPress(e, i)}
          keyboardType="number-pad"
          maxLength={1}
          selectTextOnFocus
          textAlign="center"
        />
      ))}
    </View>
  );
}

const otp = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginVertical: 20,
  },
  box: {
    width: 42,
    height: 52,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.BORDER,
    backgroundColor: COLORS.BG_INPUT,
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
  },
  boxFilled: {
    borderColor: COLORS.ACCENT,
    backgroundColor: COLORS.BG_CARD,
  },
});

// ─── Écran principal ───────────────────────────────────────────────────────

type Step = "email" | "otp";

export default function LoginScreen() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>("email");
  const [email, setEmail]     = useState("");
  const [code, setCode]       = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [resendTimer, setResendTimer] = useState(0);

  // ─── Envoyer le code OTP ──────────────────────────────────────────────

  const handleSendOtp = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Veuillez entrer un email valide.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: trimmed,
      options: { shouldCreateUser: true },
    });

    setLoading(false);
    if (otpError) {
      setError("Impossible d'envoyer le code. Réessayez.");
      return;
    }

    setStep("otp");
    // Compte à rebours 60s avant de pouvoir renvoyer
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((t) => {
        if (t <= 1) { clearInterval(interval); return 0; }
        return t - 1;
      });
    }, 1000);
  };

  // ─── Vérifier le code OTP ─────────────────────────────────────────────

  const handleVerifyOtp = async () => {
    if (code.length < 8) {
      setError("Entrez le code à 8 chiffres.");
      return;
    }
    setLoading(true);
    setError("");

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });

    setLoading(false);
    if (verifyError || !data.user) {
      setError("Code incorrect ou expiré. Réessayez.");
      setCode("");
      return;
    }

    // Vérifier si le profil existe déjà
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", data.user.id)
      .single();

    const hasProfile = !!profile?.full_name;
    if (!hasProfile) {
      router.replace("/(auth)/signup");
    }
    // Sinon AuthGate redirige automatiquement vers /(tabs)
  };

  // ─── Rendu ──────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <AppLogo size="lg" />
          <Text style={styles.logoSub}>Conseil agricole du Cameroun</Text>
        </View>

        <View style={styles.card}>
          {step === "email" ? (
            <>
              <Text style={styles.cardTitle}>Connexion</Text>
              <Text style={styles.cardSub}>
                Entrez votre email pour recevoir un code de connexion
              </Text>

              <View style={styles.fieldWrap}>
                <Text style={styles.label}>Adresse email</Text>
                <View style={styles.inputRow}>
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={COLORS.TEXT_MUTED}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="votre@email.com"
                    placeholderTextColor={COLORS.TEXT_MUTED}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={handleSendOtp}
                  />
                </View>
              </View>

              {!!error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, loading && styles.btnDisabled]}
                onPress={handleSendOtp}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.WHITE} size="small" />
                ) : (
                  <Text style={styles.btnText}>Envoyer le code →</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              {/* Bouton retour */}
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => { setStep("email"); setCode(""); setError(""); }}
              >
                <Ionicons name="chevron-back" size={18} color={COLORS.TEXT_MUTED} />
                <Text style={styles.backText}>Modifier l'email</Text>
              </TouchableOpacity>

              <Text style={styles.cardTitle}>Vérification</Text>
              <Text style={styles.cardSub}>
                Code envoyé à{"\n"}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>

              {/* Cases OTP */}
              <OtpInput value={code} onChange={setCode} />

              {!!error && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color={COLORS.DANGER} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.btn, (loading || code.length < 6) && styles.btnDisabled]}
                onPress={handleVerifyOtp}
                activeOpacity={0.85}
                disabled={loading || code.length < 8}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.WHITE} size="small" />
                ) : (
                  <Text style={styles.btnText}>Vérifier le code ✓</Text>
                )}
              </TouchableOpacity>

              {/* Renvoyer le code */}
              <TouchableOpacity
                style={styles.resendBtn}
                onPress={resendTimer === 0 ? handleSendOtp : undefined}
                activeOpacity={resendTimer === 0 ? 0.7 : 1}
              >
                <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
                  {resendTimer > 0
                    ? `Renvoyer dans ${resendTimer}s`
                    : "Renvoyer le code"}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: COLORS.BG_DARK },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
    maxWidth: 520,
    width: "100%",
    alignSelf: "center",
  },

  logoWrap: { alignItems: "center", marginBottom: 40, gap: 16 },
  logoSub: { fontSize: 14, color: COLORS.TEXT_MUTED, letterSpacing: 0.2 },

  card: {
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.TEXT_PRIMARY,
    marginBottom: 8,
    textAlign: "center",
  },
  cardSub: {
    fontSize: 14,
    color: COLORS.TEXT_SECONDARY,
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 20,
  },
  emailHighlight: {
    color: COLORS.ACCENT,
    fontWeight: "700",
  },

  backRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 4,
  },
  backText: { fontSize: 13, color: COLORS.TEXT_MUTED },

  fieldWrap: { marginBottom: 16, marginTop: 8 },
  label: {
    fontSize: 13,
    color: COLORS.TEXT_SECONDARY,
    marginBottom: 6,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 15,
    paddingVertical: 13,
  },

  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  errorText: { fontSize: 13, color: COLORS.DANGER, flex: 1 },

  btn: {
    backgroundColor: COLORS.PRIMARY,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 16 },

  resendBtn: { alignItems: "center", marginTop: 16, padding: 8 },
  resendText: { fontSize: 14, color: COLORS.ACCENT, fontWeight: "600" },
  resendDisabled: { color: COLORS.TEXT_MUTED },
});
