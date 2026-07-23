import { useSettingsStore } from "@/features/settings/store/use-settings-store";
import { AgentStatusOverlay } from "@/features/agent/components/agent-status-overlay";
import {
  CustomNavigationBar,
  NativeUI,
  createSnapboxTheme,
  useThemeStore,
  useTranslation,
} from "@snapbox/pkg-ui";
import { Stack } from "expo-router";
import { ThemeProvider } from "expo-router/react-navigation";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { PaperProvider } from "react-native-paper";
import SnapboxConfig from "../../snapbox.json";
import "../i18n";

const { CombinedDarkTheme, CombinedDefaultTheme } = createSnapboxTheme(
  SnapboxConfig.tool?.primaryColor || "#208AEF",
);

export default function Layout() {
  const colorScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.theme);
  const { t } = useTranslation();
  const hydrateSettings = useSettingsStore((state) => state.hydrate);

  const isDark =
    themeMode === "dark" || (themeMode === "system" && colorScheme === "dark");

  const paperTheme = isDark ? CombinedDarkTheme : CombinedDefaultTheme;

  useEffect(() => {
    NativeUI.setBackgroundColor(paperTheme.colors.background);
    NativeUI.setPillStyle(isDark ? "dark" : "light");
  }, [paperTheme.colors.background, isDark]);

  useEffect(() => {
    void hydrateSettings();
  }, [hydrateSettings]);

  return (
    <PaperProvider theme={paperTheme}>
      <ThemeProvider value={paperTheme}>
        <AgentStatusOverlay />
        <StatusBar style={isDark ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerShown: true,
            header: (props) => <CustomNavigationBar {...(props as any)} />,
          }}
        >
          <Stack.Screen
            name="(drawer)"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="settings"
            options={{ title: t("nav.settings", "设置") }}
          />
        </Stack>
      </ThemeProvider>
    </PaperProvider>
  );
}
