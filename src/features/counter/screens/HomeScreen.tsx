import { StyleSheet, View } from "react-native";
import { FAB, Text } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCounterStore } from "../store/useCounterStore";
import { useTranslation } from "@snapbox/pkg-ui";

export function HomeScreen() {
  const { count, increment } = useCounterStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text variant="bodyLarge">
          {t("counter.countIs", "You have pushed the button this many times:")}
        </Text>
        <Text variant="displayLarge" style={styles.counterText}>
          {count}
        </Text>
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={increment}
        testID="increment-button"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: {
    marginTop: 8,
  },
  fab: {
    position: "absolute",
    right: 16,
  },
});
