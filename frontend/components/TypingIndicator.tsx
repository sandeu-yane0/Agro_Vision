import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import COLORS from "../constants/colors";

const DOT_SIZE = 8;
const DELAYS = [0, 300, 600];

export default function TypingIndicator() {
  const animations = useRef(DELAYS.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    const pulses = animations.map((anim, i) => createPulse(anim, DELAYS[i]));
    pulses.forEach((p) => p.start());
    return () => pulses.forEach((p) => p.stop());
  }, [animations]);

  return (
    <View style={styles.wrapper}>
      {/* Avatar IA */}
      <View style={styles.avatar}>
        <Animated.Text style={styles.avatarEmoji}>🌱</Animated.Text>
      </View>

      {/* Bulle avec les 3 points */}
      <View style={styles.bubble}>
        <View style={styles.dotsRow}>
          {animations.map((anim, i) => (
            <Animated.View
              key={i}
              style={[styles.dot, { opacity: anim }]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.PRIMARY_DARK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
    marginBottom: 4,
  },
  avatarEmoji: {
    fontSize: 14,
  },
  bubble: {
    backgroundColor: COLORS.BUBBLE_AI,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.BORDER,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: COLORS.TEXT_SECONDARY,
  },
});
