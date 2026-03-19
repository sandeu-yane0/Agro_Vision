export interface DiagnosisResult {
  maladie: string;
  confiance: number;
  gravite: "LÉGER" | "MOYEN" | "CRITIQUE" | "SAIN";
  cause: string;
  traitement: string;
  prevention: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface CalculatorResult {
  rendement_estime: number;
  cout_total: number;
  revenu_estime: number;
  profit_net: number;
  point_mort: number;
  prix_marche: number;
}

export interface MarketPrice {
  culture: string;
  prix_kg: number;
  unite: string;
  marche: string;
  tendance: "up" | "down" | "stable";
}

const BASE_URL = "http://localhost:8000/api/v1";

export const diagnoseImage = async (imageUri: string): Promise<DiagnosisResult> => {
  try {
    // Dans une vraie application, on utiliserait FormData
    // const formData = new FormData();
    // formData.append("file", { uri: imageUri, name: "photo.jpg", type: "image/jpeg" } as any);
    
    // Simulation pour l'instant
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          maladie: "Mildiou de la Tomate",
          confiance: 85,
          gravite: "CRITIQUE",
          cause: "Champignon pathogène Phytophthora infestans favorisé par l'humidité.",
          traitement: "Appliquer un fongicide à base de cuivre ou de mancozèbe.",
          prevention: "Rotation des cultures, espacement suffisant pour aérer les plants.",
        });
      }, 2000);
    });
  } catch (error) {
    console.error("Erreur lors du diagnostic:", error);
    throw error;
  }
};

export const sendChatMessage = async (message: string, history: ChatMessage[]): Promise<string> => {
  try {
    // Simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("C'est une excellente question pour votre culture. Je vous conseille de bien surveiller l'irrigation pendant cette période sèche.");
      }, 1000);
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi du message:", error);
    throw error;
  }
};

export const calculateRentability = async (
  culture: string,
  superficie: number,
  qualite: string
): Promise<CalculatorResult> => {
  try {
    // Simulation
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          rendement_estime: superficie * 1500, // ex: 1500 kg/ha
          cout_total: superficie * 200000, // ex: 200k FCFA / ha
          revenu_estime: (superficie * 1500) * 800, // ex: 800 FCFA/kg
          profit_net: ((superficie * 1500) * 800) - (superficie * 200000),
          point_mort: (superficie * 200000) / 800, // kg nécessaires
          prix_marche: 800,
        });
      }, 1500);
    });
  } catch (error) {
    console.error("Erreur de calcul de rentabilité:", error);
    throw error;
  }
};

export const getMarketPrices = async (): Promise<MarketPrice[]> => {
  try {
    // L'implémentation réelle ferait un fetch
    // const response = await fetch(`${BASE_URL}/market`);
    // return response.json();
    
    // Import dynamique pour éviter la dépendance circulaire si on mockait dans api.ts directement
    const dataModule = await import("../constants/data");
    return dataModule.MARKET_DATA;
  } catch (error) {
    console.error("Erreur de récupération des prix:", error);
    throw error;
  }
};
