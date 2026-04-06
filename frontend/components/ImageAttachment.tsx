import * as ImagePicker from "expo-image-picker";

/**
 * Ouvre la caméra ou la galerie pour sélectionner une image.
 * Retourne l'URI de l'image sélectionnée, ou null si annulé.
 */
export async function pickImage(): Promise<string | null> {
  // Demander la permission caméra
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

  if (cameraStatus === "granted") {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets.length > 0) {
      return result.assets[0].uri;
    }
    return null;
  }

  // Fallback : galerie de photos
  const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (mediaStatus !== "granted") return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [4, 3],
  });

  if (!result.canceled && result.assets.length > 0) {
    return result.assets[0].uri;
  }
  return null;
}
