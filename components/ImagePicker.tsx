import * as ImagePicker from "expo-image-picker";

export const pickImage = async (): Promise<string | null> => {
  try {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status === "granted") {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    } else {
      // Fallback à la galerie si permission refusée ou non demandée (ex: simulateur sans caméra)
      const libraryResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!libraryResult.canceled && libraryResult.assets && libraryResult.assets.length > 0) {
        return libraryResult.assets[0].uri;
      }
    }
    return null;
  } catch (error) {
    console.error("Erreur lors de la capture d'image:", error);
    return null;
  }
};
