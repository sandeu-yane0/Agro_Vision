import React from "react";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

export default function VerifiedBadge({
  verified,
  size = 14,
}: {
  verified: boolean;
  size?: number;
}) {
  if (!verified) return null;

  return (
    <Ionicons name="checkmark-circle" size={size} color={COLORS.ACCENT} />
  );
}
