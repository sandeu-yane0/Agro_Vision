import { Tabs, useRouter, usePathname } from "expo-router";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useAuth } from "../../context/AuthContext";
import { useUnreadNotifications } from "../../lib/useUnreadNotifications";
import COLORS from "../../constants/colors";
import AppLogo from "../../components/AppLogo";

const SIDEBAR_W = 240;
const BREAKPOINT = 768;

const BASE_TAB_ITEMS = [
  { name: "index",        href: "/",              label: "Chat IA",      icon: "chatbubble-outline",       iconActive: "chatbubble" },
  { name: "market",       href: "/market",        label: "Marché",       icon: "trending-up-outline",      iconActive: "trending-up" },
  { name: "history",      href: "/history",       label: "Historique",   icon: "time-outline",             iconActive: "time" },
  { name: "farmers",      href: "/farmers",       label: "Agriculteurs", icon: "people-outline",           iconActive: "people" },
  { name: "cooperatives", href: "/cooperatives",  label: "Coopératives", icon: "people-circle-outline",    iconActive: "people-circle" },
  { name: "profile",      href: "/profile",       label: "Profil",       icon: "person-circle-outline",    iconActive: "person-circle" },
] as const;

const ADMIN_TAB = {
  name: "admin", href: "/admin", label: "Admin", icon: "shield-checkmark-outline", iconActive: "shield-checkmark",
} as const;

// ─── Sidebar desktop ──────────────────────────────────────────────────────

function SidebarNav({ tabs }: { tabs: readonly { name: string; href: string; label: string; icon: string; iconActive: string }[] }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/(auth)/login");
  };

  return (
    <View style={sidebar.container}>
      {/* Logo */}
      <View style={sidebar.logo}>
        <AppLogo size="sm" showTagline />
      </View>

      <View style={sidebar.divider} />

      {/* Nav */}
      <View style={sidebar.nav}>
        {tabs.map((tab) => {
          const focused = pathname === tab.href;
          return (
            <TouchableOpacity
              key={tab.name}
              style={[sidebar.item, focused && sidebar.itemActive]}
              onPress={() => router.push(tab.href as never)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={(focused ? tab.iconActive : tab.icon) as keyof typeof Ionicons.glyphMap}
                size={20}
                color={focused ? COLORS.ACCENT : COLORS.TEXT_MUTED}
              />
              <Text style={[sidebar.itemLabel, focused && sidebar.itemLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />
      <View style={sidebar.divider} />

      <TouchableOpacity style={sidebar.logoutBtn} onPress={handleLogout} activeOpacity={0.75}>
        <Ionicons name="log-out-outline" size={18} color={COLORS.DANGER} />
        <Text style={sidebar.logoutText}>Déconnexion</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Barre du bas (mobile) ────────────────────────────────────────────────

function BottomBar({ state, navigation, tabs }: BottomTabBarProps & { tabs: readonly { name: string; href: string; label: string; icon: string; iconActive: string }[] }) {
  return (
    <View style={bottom.bar}>
      {tabs.map((tab) => {
        const focused = state.routes[state.index]?.name === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={bottom.item}
            onPress={() => navigation.navigate(tab.name)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={(focused ? tab.iconActive : tab.icon) as keyof typeof Ionicons.glyphMap}
              size={22}
              color={focused ? COLORS.ACCENT : COLORS.TEXT_MUTED}
            />
            <Text style={[bottom.label, focused && bottom.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Layout principal ─────────────────────────────────────────────────────

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isDesktop  = width >= BREAKPOINT;
  const { profile } = useAuth();
  const unreadCount = useUnreadNotifications();
  const router = useRouter();

  const tabs = profile?.role === "admin" ? [...BASE_TAB_ITEMS, ADMIN_TAB] : BASE_TAB_ITEMS;

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      {/* Sidebar fixe à gauche sur desktop */}
      {isDesktop && <SidebarNav tabs={tabs} />}

      {/* Contenu des tabs */}
      <View style={{ flex: 1 }}>
        <Tabs
          tabBar={(props) =>
            isDesktop ? <View style={{ height: 0 }} /> : <BottomBar {...props} tabs={tabs} />
          }
          screenOptions={{
            headerStyle: styles.header as never,
            headerTintColor: COLORS.TEXT_PRIMARY,
            headerTitleStyle: styles.headerTitle,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              headerTitle: () => (
                <AppLogo size="sm" />
              ),
              headerRight: () => (
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>En ligne</Text>
                  <TouchableOpacity onPress={() => router.push("/weather")} style={styles.weatherBtn}>
                    <Ionicons name="partly-sunny-outline" size={20} color={COLORS.TEXT_PRIMARY} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push("/notifications")} style={styles.bellBtn}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.TEXT_PRIMARY} />
                    {unreadCount > 0 && (
                      <View style={styles.bellBadge}>
                        <Text style={styles.bellBadgeText}>
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              ),
            }}
          />
          <Tabs.Screen name="market"       options={{ headerTitle: "Prix du Marché" }} />
          <Tabs.Screen name="history"      options={{ headerTitle: "Historique" }} />
          <Tabs.Screen name="farmers"      options={{ headerTitle: "Agriculteurs" }} />
          <Tabs.Screen name="cooperatives" options={{ headerTitle: "Coopératives" }} />
          <Tabs.Screen name="profile"      options={{ headerTitle: "Mon Profil" }} />
          <Tabs.Screen name="admin"        options={{ headerTitle: "Administration" }} />
        </Tabs>
      </View>
    </View>
  );
}

// ─── Styles sidebar ───────────────────────────────────────────────────────

const sidebar = StyleSheet.create({
  container: {
    width: SIDEBAR_W,
    backgroundColor: COLORS.BG_CARD,
    borderRightWidth: 1,
    borderRightColor: COLORS.BORDER,
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  logo: {
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  divider:    { height: 1, backgroundColor: COLORS.BORDER, marginVertical: 16 },
  nav:        { gap: 4 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  itemActive:       { backgroundColor: COLORS.BG_INPUT },
  itemLabel:        { fontSize: 14, color: COLORS.TEXT_MUTED, fontWeight: "500" },
  itemLabelActive:  { color: COLORS.TEXT_PRIMARY, fontWeight: "700" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  logoutText: { fontSize: 14, color: COLORS.DANGER, fontWeight: "600" },
});

// ─── Styles bottom bar ────────────────────────────────────────────────────

const bottom = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: COLORS.BG_CARD,
    borderTopWidth: 1,
    borderTopColor: COLORS.BORDER,
    height: 62,
    paddingBottom: 8,
  },
  item:         { flex: 1, alignItems: "center", justifyContent: "center", gap: 3 },
  label:        { fontSize: 10, color: COLORS.TEXT_MUTED, fontWeight: "600" },
  labelActive:  { color: COLORS.ACCENT },
});

// ─── Styles header ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.BG_DARK,
    shadowColor: "transparent",
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.BORDER,
  },
  headerTitle:  { color: COLORS.TEXT_PRIMARY, fontSize: 17, fontWeight: "700" },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    gap: 5,
  },
  onlineDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.SUCCESS },
  onlineText: { fontSize: 13, color: COLORS.SUCCESS, fontWeight: "600" },
  weatherBtn: { marginLeft: 8, padding: 2 },
  bellBtn: { marginLeft: 8, padding: 2 },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.DANGER,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  bellBadgeText: { color: COLORS.WHITE, fontSize: 9, fontWeight: "700" },
});
