import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import COLORS from "../constants/colors";

export const DESKTOP_BREAKPOINT = 768;

export default function ScreenWrapper({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  return (
    <View style={styles.wrapper}>
      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: COLORS.BG_DARK,
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    maxWidth: 900,
    alignSelf: "center",
    width: "100%",
  },
});
