import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COLORS from "../constants/colors";

function OnlineIndicator() {
  return (
    <View style={styles.onlineRow}>
      <View style={styles.onlineDot} />
      <Text style={styles.onlineText}>En ligne</Text>
    </View>
  );
}

function ChatTitle() {
  return (
    <Text style={styles.chatTitle}>🌱 AgroVision</Text>
  );
}

export default function RootLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: COLORS.ACCENT,
        tabBarInactiveTintColor: COLORS.TEXT_MUTED,
        tabBarLabelStyle: styles.tabLabel,
        headerStyle: styles.header,
        headerTintColor: COLORS.TEXT_PRIMARY,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chat",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
          headerTitle: () => <ChatTitle />,
          headerRight: () => <OnlineIndicator />,
          headerLeft: () => null,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: "Marché",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trending-up" size={size} color={color} />
          ),
          headerTitle: "Prix du Marché",
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "Historique",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time" size={size} color={color} />
          ),
          headerTitle: "Historique",
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.BG_CARD,
    borderTopColor: COLORS.BORDER,
    borderTopWidth: 1,
    height: 60,
    paddingBottom: 8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  header: {
    backgroundColor: COLORS.BG_DARK,
    shadowColor: "transparent",
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  } as never,
  headerTitle: {
    color: COLORS.TEXT_PRIMARY,
    fontSize: 17,
    fontWeight: "700",
  },

  // Titre chat
  chatTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.TEXT_PRIMARY,
    letterSpacing: 0.3,
  },

  // Indicateur "En ligne"
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    gap: 5,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.SUCCESS,
  },
  onlineText: {
    fontSize: 13,
    color: COLORS.SUCCESS,
    fontWeight: "600",
  },
});
