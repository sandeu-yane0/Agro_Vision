// ╔══════════════════════════════════════════════════════════╗
// ║           AgroVision AI — Design System Couleurs         ║
// ╚══════════════════════════════════════════════════════════╝

const COLORS = {
  // Verts principaux
  PRIMARY:        "#1A6B3C", // vert profond Afrique
  PRIMARY_LIGHT:  "#2E9E5B", // vert clair
  PRIMARY_DARK:   "#0D3D22", // vert sombre

  // Accent or africain
  ACCENT:         "#F4A726", // or soleil africain
  ACCENT_LIGHT:   "#FDF3DC", // or très pâle

  // Fonds sombres
  BG_DARK:        "#0F1F15", // fond sombre principal
  BG_CARD:        "#1A2E20", // card sombre
  BG_INPUT:       "#243328", // fond input

  // Bulles de chat
  BUBBLE_USER:    "#1A6B3C", // bulle utilisateur
  BUBBLE_AI:      "#1E2D24", // bulle IA

  // Textes
  TEXT_PRIMARY:   "#F0F7F2", // texte principal clair
  TEXT_SECONDARY: "#8FA896", // texte secondaire
  TEXT_MUTED:     "#4A6355", // texte atténué

  // Bordures
  BORDER:         "#2A4035", // bordure subtile

  // États
  SUCCESS:        "#4CAF50",
  WARNING:        "#FF8F00",
  DANGER:         "#F44336",
  WHITE:          "#FFFFFF",
} as const;

export default COLORS;
