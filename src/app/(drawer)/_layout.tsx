import { AppDrawerContent } from "@/features/agent/components/app-drawer-content";
import { useTranslation } from "@snapbox/pkg-ui";
import { Drawer, DrawerToggleButton } from "expo-router/drawer";
import { Icon } from "react-native-paper";

export default function DrawerLayout() {
  const { t } = useTranslation();

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerLeft: () => <DrawerToggleButton />,
        headerTransparent: true,
        drawerType: "front",
        swipeEdgeWidth: 56,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: t("nav.agent", "自动化 Agent"),
          drawerLabel: t("nav.agent", "自动化 Agent"),
          drawerIcon: ({ color, size }) => (
            <Icon source="robot-outline" color={color as string} size={size} />
          ),
        }}
      />
    </Drawer>
  );
}
