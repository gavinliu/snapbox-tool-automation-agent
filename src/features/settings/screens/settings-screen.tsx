import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, Card, HelperText, Snackbar, Text, TextInput } from "react-native-paper";
import { DEFAULT_MODEL, useSettingsStore } from "@/features/settings/store/use-settings-store";

export function SettingsScreen() {
  const storedApiKey = useSettingsStore((state) => state.apiKey);
  const storedModel = useSettingsStore((state) => state.model);
  const saveSettings = useSettingsStore((state) => state.save);
  const [apiKey, setApiKey] = useState(storedApiKey);
  const [model, setModel] = useState(storedModel);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKey(storedApiKey);
    setModel(storedModel);
  }, [storedApiKey, storedModel]);

  const save = async () => {
    setSaving(true);
    try {
      await saveSettings({ apiKey, model });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <Card mode="contained">
        <Card.Content style={styles.cardContent}>
          <Text variant="titleMedium">Vercel AI Gateway</Text>
          <TextInput
            label="API Key"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="vck_…"
          />
          <HelperText type="info">API Key 仅保存在设备的系统安全存储中。</HelperText>
          <TextInput
            label="模型"
            value={model}
            onChangeText={setModel}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={DEFAULT_MODEL}
          />
          <HelperText type="info">填写 Gateway 模型 ID，例如 google/gemini-3.5-flash。</HelperText>
          <Button mode="contained" loading={saving} disabled={saving || !apiKey.trim()} onPress={save}>
            保存设置
          </Button>
        </Card.Content>
      </Card>
      <Text variant="bodySmall">
        自动化能力需要 Android、Shizuku 已启动，以及包含原生模块的开发构建；Expo Go 无法加载该模块。
      </Text>
      <Snackbar visible={saved} onDismiss={() => setSaved(false)} duration={2000}>
        设置已保存
      </Snackbar>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16 },
  cardContent: { gap: 8 },
});
