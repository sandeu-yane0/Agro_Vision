import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { CULTURES } from "../constants/data";
import { calculateRentability, CalculatorResult } from "../services/api";

export default function CalculatorScreen() {
  const [selectedCulture, setSelectedCulture] = useState(CULTURES[0]);
  const [superficie, setSuperficie] = useState("");
  const [qualite, setQualite] = useState("Moyenne");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const qualites = ["Bonne", "Moyenne", "Faible"];

  const handleCalculate = async () => {
    if (!superficie) return;

    setStatus("loading");
    try {
      const data = await calculateRentability(selectedCulture, parseFloat(superficie), qualite);
      setResult(data);
      setStatus("success");
    } catch (error) {
      setStatus("error");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XAF" })
      .format(value)
      .replace("FCFA", "FCFA");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Calculateur Rentabilité</Text>

      <View style={styles.formSection}>
        <Text style={styles.label}>Culture</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsContainer}>
          {CULTURES.map((culture) => (
            <TouchableOpacity
              key={culture}
              style={[
                styles.chip,
                selectedCulture === culture && styles.chipSelected
              ]}
              onPress={() => setSelectedCulture(culture)}
            >
              <Text style={[
                styles.chipText,
                selectedCulture === culture && styles.chipTextSelected
              ]}>
                {culture.charAt(0).toUpperCase() + culture.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Superficie</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            placeholder="0"
            value={superficie}
            onChangeText={setSuperficie}
          />
          <Text style={styles.inputSuffix}>hectares</Text>
        </View>
      </View>

      <View style={styles.formSection}>
        <Text style={styles.label}>Qualité du sol</Text>
        <View style={styles.radioGroup}>
          {qualites.map((q) => (
            <TouchableOpacity
              key={q}
              style={styles.radioBtn}
              onPress={() => setQualite(q)}
            >
              <View style={[styles.radioOuter, qualite === q && styles.radioOuterSelected]}>
                {qualite === q && <View style={styles.radioInner} />}
              </View>
              <Text style={styles.radioText}>{q}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.calcButton, !superficie && styles.calcButtonDisabled]}
        onPress={handleCalculate}
        disabled={!superficie || status === "loading"}
      >
        {status === "loading" ? (
          <ActivityIndicator color={colors.CARD} />
        ) : (
          <Text style={styles.calcButtonText}>Calculer la rentabilité</Text>
        )}
      </TouchableOpacity>

      {status === "error" && (
        <Text style={styles.errorText}>Erreur lors du calcul. Veuillez réessayer.</Text>
      )}

      {status === "success" && result && (
        <View style={styles.resultCard}>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>🌾 Rendement estimé</Text>
            <Text style={styles.resultValue}>{result.rendement_estime} kg</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>💸 Coût total de production</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.cout_total)}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>📈 Revenu estimé</Text>
            <Text style={styles.resultValue}>{formatCurrency(result.revenu_estime)}</Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>✅ Profit net</Text>
            <Text style={[
              styles.resultValueBold, 
              { color: result.profit_net >= 0 ? colors.SUCCESS : colors.DANGER }
            ]}>
              {formatCurrency(result.profit_net)}
            </Text>
          </View>
          
          <View style={styles.divider} />

          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>⚖️ Point mort</Text>
            <Text style={styles.resultValue}>{result.point_mort} kg</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>🏪 Prix marché actuel</Text>
            <Text style={styles.resultValue}>{result.prix_marche} FCFA/kg</Text>
          </View>

          {/* Barre visuelle */}
          <View style={styles.visualBarContainer}>
            <View style={[styles.visualBarSegment, { 
              flex: result.cout_total, 
              backgroundColor: colors.DANGER 
            }]} />
            <View style={[styles.visualBarSegment, { 
              flex: Math.max(0, result.profit_net), 
              backgroundColor: colors.SUCCESS 
            }]} />
          </View>
          <View style={styles.visualBarLabels}>
            <Text style={styles.visualBarLabelSm}>Coûts</Text>
            <Text style={styles.visualBarLabelSm}>Profit</Text>
          </View>
        </View>
      )}
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.TEXT_MAIN,
    marginBottom: 24,
  },
  formSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: "row",
    paddingBottom: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.CARD,
    borderWidth: 1,
    borderColor: colors.BORDER,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: colors.PRIMARY,
    borderColor: colors.PRIMARY,
  },
  chipText: {
    color: colors.TEXT_MAIN,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: colors.CARD,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.CARD,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.BORDER,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: colors.TEXT_MAIN,
  },
  inputSuffix: {
    fontSize: 16,
    color: colors.TEXT_SECONDARY,
    marginLeft: 8,
  },
  radioGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  radioBtn: {
    flexDirection: "row",
    alignItems: "center",
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.BORDER,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  radioOuterSelected: {
    borderColor: colors.PRIMARY,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.PRIMARY,
  },
  radioText: {
    fontSize: 14,
    color: colors.TEXT_MAIN,
  },
  calcButton: {
    backgroundColor: colors.PRIMARY,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 24,
    shadowColor: colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  calcButtonDisabled: {
    backgroundColor: colors.TEXT_SECONDARY,
    shadowOpacity: 0,
    elevation: 0,
  },
  calcButtonText: {
    color: colors.CARD,
    fontSize: 18,
    fontWeight: "bold",
  },
  errorText: {
    color: colors.DANGER,
    textAlign: "center",
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: colors.CARD,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 3,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  resultLabel: {
    fontSize: 14,
    color: colors.TEXT_MAIN,
  },
  resultValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.TEXT_MAIN,
  },
  resultValueBold: {
    fontSize: 18,
    fontWeight: "bold",
  },
  divider: {
    height: 1,
    backgroundColor: colors.BORDER,
    marginVertical: 8,
  },
  visualBarContainer: {
    flexDirection: "row",
    height: 12,
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 24,
    marginBottom: 8,
  },
  visualBarSegment: {
    height: "100%",
  },
  visualBarLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  visualBarLabelSm: {
    fontSize: 10,
    color: colors.TEXT_SECONDARY,
  },
});
