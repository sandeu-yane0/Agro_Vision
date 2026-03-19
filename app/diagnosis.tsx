import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../constants/colors";
import { diagnoseImage, DiagnosisResult } from "../services/api";
import ResultCard from "../components/ResultCard";

import { pickImage } from "../components/ImagePicker";

export default function DiagnosisScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) {
      setImageUri(uri);
      setStatus("idle");
      setResult(null);
    }
  };

  const handleAnalyze = async () => {
    if (!imageUri) return;

    setStatus("loading");
    try {
      const data = await diagnoseImage(imageUri);
      setResult(data);
      setStatus("success");
    } catch (error) {
      setStatus("error");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Diagnostic Maladie</Text>
      
      {!imageUri ? (
        <TouchableOpacity style={styles.uploadArea} onPress={handlePickImage} activeOpacity={0.8}>
          <Ionicons name="camera" size={48} color={colors.PRIMARY_LIGHT} />
          <Text style={styles.uploadText}>Prenez une photo de la plante</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />
          <TouchableOpacity style={styles.changeImageBtn} onPress={handlePickImage}>
            <Ionicons name="refresh" size={24} color={colors.CARD} />
          </TouchableOpacity>
        </View>
      )}

      {imageUri && status !== "success" && (
        <TouchableOpacity
          style={styles.analyzeButton}
          onPress={handleAnalyze}
          disabled={status === "loading"}
        >
          {status === "loading" ? (
            <ActivityIndicator color={colors.CARD} />
          ) : (
            <>
              <Ionicons name="search" size={20} color={colors.CARD} style={styles.btnIcon} />
              <Text style={styles.analyzeButtonText}>Analyser la plante</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {status === "error" && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={24} color={colors.DANGER} />
          <Text style={styles.errorText}>Analyse impossible. Vérifiez votre connexion.</Text>
        </View>
      )}

      {status === "success" && result && (
        <View style={styles.resultContainer}>
          <ResultCard {...result} />
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
  uploadArea: {
    borderWidth: 2,
    borderColor: colors.PRIMARY_LIGHT,
    borderStyle: "dashed",
    borderRadius: 16,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(76, 175, 80, 0.05)",
    marginBottom: 24,
  },
  uploadText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.PRIMARY,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  imagePreview: {
    width: "100%",
    height: 220,
    backgroundColor: colors.BORDER,
  },
  changeImageBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzeButton: {
    backgroundColor: colors.PRIMARY,
    flexDirection: "row",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: colors.PRIMARY,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  btnIcon: {
    marginRight: 8,
  },
  analyzeButtonText: {
    color: colors.CARD,
    fontSize: 18,
    fontWeight: "bold",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(229, 57, 53, 0.1)",
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  errorText: {
    color: colors.DANGER,
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  resultContainer: {
    marginTop: 8,
  },
});
