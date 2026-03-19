import { MarketPrice } from "../services/api";

export const CULTURES = ["maïs", "manioc", "plantain", "arachide", "tomate", "cacao"];

export const MARKET_DATA: MarketPrice[] = [
  {
    culture: "maïs",
    prix_kg: 250,
    unite: "kg",
    marche: "Marché Mokolo, Yaoundé",
    tendance: "stable",
  },
  {
    culture: "manioc",
    prix_kg: 150,
    unite: "kg",
    marche: "Marché Central, Douala",
    tendance: "down",
  },
  {
    culture: "plantain",
    prix_kg: 300,
    unite: "régime",
    marche: "Marché du Mfoundi, Yaoundé",
    tendance: "up",
  },
  {
    culture: "arachide",
    prix_kg: 600,
    unite: "kg",
    marche: "Marché de Bafoussam",
    tendance: "up",
  },
  {
    culture: "tomate",
    prix_kg: 800,
    unite: "seau",
    marche: "Marché Sandaga, Douala",
    tendance: "stable",
  },
  {
    culture: "cacao",
    prix_kg: 1500,
    unite: "kg",
    marche: "Prix bord champ, Centre",
    tendance: "up",
  },
];
