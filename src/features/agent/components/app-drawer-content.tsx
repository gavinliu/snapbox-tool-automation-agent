import { useTranslation } from "@snapbox/pkg-ui";
import { useRouter } from "expo-router";
import {
  DrawerContentComponentProps,
  DrawerContentScrollView,
  DrawerItem,
  DrawerItemList,
} from "expo-router/drawer";
import { getDefaultHeaderHeight } from "expo-router/react-navigation";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function AppDrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const layout = useWindowDimensions();
  const { t } = useTranslation();
  const toolbarHeight =
    getDefaultHeaderHeight(layout, false, insets.top) - insets.top;

  const openSettings = () => {
    props.navigation.closeDrawer();
    router.push("/settings");
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      >
        <View style={[styles.header, { height: toolbarHeight }]}>
          <Text variant="headlineSmall">Automation Agent</Text>
        </View>
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View
        style={[
          styles.footer,
          {
            borderTopColor: theme.colors.outlineVariant,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <DrawerItem
          label={t("nav.settings", "设置")}
          icon={({ color, size }) => (
            <Icon source="cog-outline" color={color as string} size={size} />
          )}
          onPress={openSettings}
          accessibilityLabel={t("nav.settings", "设置")}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingTop: 0 },
  header: { justifyContent: "center", paddingHorizontal: 16 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8 },
});
