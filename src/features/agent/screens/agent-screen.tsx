import { useAutomationShizukuPermissions } from "@snapbox/pkg-automation-shizuku";
import { Link } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, IconButton, Text, TextInput, useTheme } from "react-native-paper";
import { createAutomationAgent } from "@/features/agent/lib/automation-agent";
import { useSettingsStore } from "@/features/settings/store/use-settings-store";

type Message = {
  id: string;
  role: "user" | "assistant" | "tool";
  text: string;
};

const TOOL_LABELS: Record<string, string> = {
  screenshot: "查看屏幕",
  currentApp: "读取当前 App",
  launchApp: "打开 App",
  tap: "点击",
  doubleTap: "双击",
  longPress: "长按",
  swipe: "滑动",
  typeText: "输入文本",
  back: "返回",
  home: "回到桌面",
};

export function AgentScreen() {
  const theme = useTheme();
  const apiKey = useSettingsStore((state) => state.apiKey);
  const model = useSettingsStore((state) => state.model);
  const [permission, requestPermission] = useAutomationShizukuPermissions();
  const [input, setInput] = useState("");
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const permissionGranted = permission?.granted === true;
  const canSend = input.trim().length > 0 && !running && apiKey.length > 0;
  const recentContext = useMemo(
    () => messages.filter((message) => message.role !== "tool").slice(-6),
    [messages],
  );

  const append = (message: Omit<Message, "id">) => {
    setMessages((current) => [
      ...current,
      { ...message, id: `${Date.now()}-${Math.random()}` },
    ]);
  };

  const send = async () => {
    const goal = input.trim();
    if (!goal || running) return;
    if (!permissionGranted) {
      const result = await requestPermission();
      if (!result.granted) {
        append({ role: "assistant", text: "需要 Shizuku 授权后才能操作手机。" });
        return;
      }
    }

    setInput("");
    setRunning(true);
    append({ role: "user", text: goal });

    try {
      const agent = createAutomationAgent({
        apiKey,
        model,
        onToolCall: ({ name }) => {
          append({ role: "tool", text: TOOL_LABELS[name] ?? name });
        },
      });
      const context = recentContext
        .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.text}`)
        .join("\n");
      const result = await agent.generate({
        prompt: context ? `最近对话：\n${context}\n\n当前任务：${goal}` : goal,
      });
      append({ role: "assistant", text: result.text || "任务执行结束。" });
    } catch (error) {
      append({
        role: "assistant",
        text: error instanceof Error ? `执行失败：${error.message}` : "执行失败，请稍后重试。",
      });
    } finally {
      setRunning(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined}
      style={styles.flex}
      keyboardVerticalOffset={88}
    >
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {!apiKey ? (
          <Card mode="contained" style={{ backgroundColor: theme.colors.secondaryContainer }}>
            <Card.Content style={styles.cardContent}>
              <Text variant="titleMedium">先连接模型</Text>
              <Text variant="bodyMedium">请在设置中填写 AI Gateway API Key 和模型。</Text>
              <Link href="/settings" asChild>
                <Button mode="contained">打开设置</Button>
              </Link>
            </Card.Content>
          </Card>
        ) : null}

        <View style={styles.statusRow}>
          <Chip icon={permissionGranted ? "check-circle" : "cellphone-key"}>
            {permissionGranted ? "Shizuku 已授权" : "需要 Shizuku 授权"}
          </Chip>
          <View style={styles.modelRow}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {model}
            </Text>
            <Link href="/settings" asChild>
              <IconButton icon="cog-outline" accessibilityLabel="设置" />
            </Link>
          </View>
        </View>

        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="headlineSmall">想让手机帮你做什么？</Text>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
              描述目标，Agent 会观察屏幕并自动调用打开、点击、滑动和输入等能力。
            </Text>
            <View style={styles.examples}>
              {["打开设置并进入蓝牙页面", "打开小红书，搜索露营攻略", "截屏并告诉我当前页面是什么"].map(
                (example) => (
                  <Button key={example} mode="outlined" onPress={() => setInput(example)}>
                    {example}
                  </Button>
                ),
              )}
            </View>
          </View>
        ) : (
          <View style={styles.messages}>
            {messages.map((message) =>
              message.role === "tool" ? (
                <View key={message.id} style={styles.toolEvent}>
                  <IconButton icon="progress-wrench" size={16} />
                  <Text variant="labelMedium">{message.text}</Text>
                </View>
              ) : (
                <Card
                  key={message.id}
                  mode="contained"
                  style={[
                    styles.message,
                    message.role === "user"
                      ? { backgroundColor: theme.colors.primaryContainer, alignSelf: "flex-end" }
                      : { backgroundColor: theme.colors.surfaceVariant, alignSelf: "flex-start" },
                  ]}
                >
                  <Card.Content>
                    <Text selectable>{message.text}</Text>
                  </Card.Content>
                </Card>
              ),
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.composer, { backgroundColor: theme.colors.surface }]}>
        <TextInput
          mode="outlined"
          multiline
          value={input}
          onChangeText={setInput}
          placeholder="输入一个目标任务…"
          style={styles.input}
          disabled={running}
          right={
            <TextInput.Icon
              icon={running ? "stop-circle-outline" : "arrow-up-circle"}
              disabled={!canSend}
              onPress={send}
            />
          }
        />
        {running ? <Text variant="labelMedium">Agent 正在操作手机，请勿手动切换页面…</Text> : null}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 16 },
  cardContent: { gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  modelRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  empty: { flex: 1, justifyContent: "center", gap: 12, paddingVertical: 48 },
  examples: { alignItems: "flex-start", gap: 10, paddingTop: 12 },
  messages: { gap: 10 },
  message: { maxWidth: "88%" },
  toolEvent: { flexDirection: "row", alignItems: "center", alignSelf: "center" },
  composer: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, gap: 6 },
  input: { maxHeight: 132 },
});
