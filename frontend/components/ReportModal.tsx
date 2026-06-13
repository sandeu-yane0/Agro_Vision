import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import COLORS from "../constants/colors";

const REASONS = [
  "Faux profil",
  "Comportement inapproprié",
  "Spam / publicité",
  "Autre",
];

export default function ReportModal({
  visible,
  reportedUserId,
  reportedUserName,
  onClose,
}: {
  visible: boolean;
  reportedUserId: string;
  reportedUserName: string;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleClose = () => {
    setReason("");
    setDetails("");
    setSent(false);
    onClose();
  };

  const handleSubmit = async () => {
    if (!user || !reason) return;
    setSending(true);

    const fullReason = details.trim() ? `${reason} — ${details.trim()}` : reason;

    const { error } = await supabase.from("account_reports").insert({
      reporter_id: user.id,
      reported_user_id: reportedUserId,
      reason: fullReason,
    });

    setSending(false);
    if (!error) setSent(true);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Signaler {reportedUserName}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={22} color={COLORS.TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          {sent ? (
            <View style={styles.sentBox}>
              <Ionicons name="checkmark-circle" size={40} color={COLORS.SUCCESS} />
              <Text style={styles.sentText}>Signalement envoyé. Merci.</Text>
              <TouchableOpacity style={styles.submitBtn} onPress={handleClose} activeOpacity={0.8}>
                <Text style={styles.submitText}>Fermer</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Motif</Text>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={styles.reasonRow}
                  onPress={() => setReason(r)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={reason === r ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={reason === r ? COLORS.PRIMARY_LIGHT : COLORS.TEXT_MUTED}
                  />
                  <Text style={styles.reasonText}>{r}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Détails (optionnel)</Text>
              <TextInput
                style={styles.input}
                value={details}
                onChangeText={setDetails}
                placeholder="Précisez si besoin..."
                placeholderTextColor={COLORS.TEXT_MUTED}
                multiline
                maxLength={300}
              />

              <TouchableOpacity
                style={[styles.submitBtn, !reason && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!reason || sending}
                activeOpacity={0.8}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={COLORS.WHITE} />
                ) : (
                  <Text style={styles.submitText}>Envoyer le signalement</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.BG_CARD,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    padding: 18,
    gap: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  title: { fontSize: 16, fontWeight: "700", color: COLORS.TEXT_PRIMARY, flex: 1, marginRight: 8 },

  label: { fontSize: 12, color: COLORS.TEXT_MUTED, marginTop: 10, marginBottom: 4 },

  reasonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  reasonText: { fontSize: 14, color: COLORS.TEXT_PRIMARY },

  input: {
    backgroundColor: COLORS.BG_INPUT,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    color: COLORS.TEXT_PRIMARY,
    fontSize: 14,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },

  submitBtn: {
    backgroundColor: COLORS.DANGER,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 16,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: COLORS.WHITE, fontWeight: "700", fontSize: 14 },

  sentBox: { alignItems: "center", gap: 10, paddingVertical: 12 },
  sentText: { color: COLORS.TEXT_PRIMARY, fontSize: 14, fontWeight: "600" },
});
