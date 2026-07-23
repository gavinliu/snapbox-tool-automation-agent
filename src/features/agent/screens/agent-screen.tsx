import { useAutomationShizukuPermissions } from "@snapbox/pkg-automation-shizuku";
import { useOverlayPermissions } from "@snapbox/pkg-floating-menu";
import { Link } from "expo-router";
import { useHeaderHeight } from "expo-router/react-navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  View,
} from "react-native";
import { ActivityIndicator, Button, Card, Chip, IconButton, Text, useTheme } from "react-native-paper";
import Animated, { useAnimatedKeyboard, useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createAutomationAgent } from "@/features/agent/lib/automation-agent";
import { useAgentRunStore } from "@/features/agent/store/use-agent-run-store";
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

const SINGLE_LINE_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 120;

export function AgentScreen() {
  const theme = useTheme();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const keyboard = useAnimatedKeyboard();
  const apiKey = useSettingsStore((state) => state.apiKey);
  const model = useSettingsStore((state) => state.model);
  const [permission, requestPermission] = useAutomationShizukuPermissions();
  const [overlayPermission, requestOverlayPermission] = useOverlayPermissions();
  const [input, setInput] = useState("");
  const [inputHeight, setInputHeight] = useState(SINGLE_LINE_HEIGHT);
  const [inputFocused, setInputFocused] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const phase = useAgentRunStore((state) => state.phase);
  const startRun = useAgentRunStore((state) => state.start);
  const reportAction = useAgentRunStore((state) => state.reportAction);
  const succeedRun = useAgentRunStore((state) => state.succeed);
  const failRun = useAgentRunStore((state) => state.fail);
  const setOverlayPermissionGranted = useAgentRunStore(
    (state) => state.setOverlayPermissionGranted,
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const permissionGranted = permission?.granted === true;
  const running = phase === "running";
  const canSend = input.trim().length > 0 && !running && apiKey.length > 0;
  const isMultiline = input.includes("\n") || inputHeight > SINGLE_LINE_HEIGHT + 4;
  const recentContext = useMemo(
    () => messages.filter((message) => message.role !== "tool").slice(-6),
    [messages],
  );
  const keyboardAwareStyle = useAnimatedStyle(() => ({
    paddingBottom: keyboard.height.value,
  }));

  const append = (message: Omit<Message, "id">) => {
    setMessages((current) => [
      ...current,
      { ...message, id: `${Date.now()}-${Math.random()}` },
    ]);
  };

  useEffect(() => {
    setOverlayPermissionGranted(overlayPermission?.granted === true);
  }, [overlayPermission?.granted, setOverlayPermissionGranted]);

  useEffect(() => {
    const showEvent = process.env.EXPO_OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = process.env.EXPO_OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardVisible(true);
      Keyboard.scheduleLayoutAnimation(event);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    });
    const hideSubscription = Keyboard.addListener(hideEvent, (event) => {
      setKeyboardVisible(false);
      Keyboard.scheduleLayoutAnimation(event);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const updateInput = (value: string) => {
    setInput(value);
    if (!value) setInputHeight(SINGLE_LINE_HEIGHT);
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

    if (overlayPermission?.granted !== true) {
      const result = await requestOverlayPermission();
      setOverlayPermissionGranted(result.granted);
    }

    setInput("");
    setInputHeight(SINGLE_LINE_HEIGHT);
    startRun();
    append({ role: "user", text: goal });

    try {
      const agent = createAutomationAgent({
        apiKey,
        model,
        onToolCall: ({ name }) => {
          const action = TOOL_LABELS[name] ?? name;
          reportAction(action);
          append({ role: "tool", text: action });
        },
      });
      const context = recentContext
        .map((message) => `${message.role === "user" ? "用户" : "助手"}：${message.text}`)
        .join("\n");
      const result = await agent.generate({
        prompt: context ? `最近对话：\n${context}\n\n当前任务：${goal}` : goal,
      });
      append({ role: "assistant", text: result.text || "任务执行结束。" });
      succeedRun();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "执行失败，请稍后重试。";
      append({
        role: "assistant",
        text: `执行失败：${errorMessage}`,
      });
      failRun(errorMessage);
    }
  };

  return (
    <Animated.View style={[styles.flex, keyboardAwareStyle]}>
      <View style={[styles.messageViewport, { paddingTop: headerHeight }]}>
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
          keyboardDismissMode={process.env.EXPO_OS === "ios" ? "interactive" : "on-drag"}
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
      </View>

      <View
        style={[
          styles.composer,
          {
            backgroundColor: theme.colors.surface,
            paddingBottom: keyboardVisible ? 8 : Math.max(insets.bottom, 12),
          },
        ]}
      >
        {running ? (
          <Text variant="labelMedium" style={styles.runningStatus}>
            Agent 正在操作手机，请勿手动切换页面…
          </Text>
        ) : null}
        <View
          style={[
            styles.inputShell,
            {
              alignItems: isMultiline ? "flex-end" : "center",
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: inputFocused ? theme.colors.primary : theme.colors.outlineVariant,
            },
          ]}
        >
          <NativeTextInput
            multiline
            value={input}
            onChangeText={updateInput}
            onContentSizeChange={(event) => {
              setInputHeight(
                Math.min(
                  Math.max(event.nativeEvent.contentSize.height, SINGLE_LINE_HEIGHT),
                  MAX_INPUT_HEIGHT,
                ),
              );
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="输入一个目标任务…"
            placeholderTextColor={theme.colors.onSurfaceVariant}
            selectionColor={theme.colors.primary}
            style={[
              styles.input,
              {
                color: theme.colors.onSurface,
                height: inputHeight,
              },
            ]}
            editable={!running}
            scrollEnabled={inputHeight >= MAX_INPUT_HEIGHT}
            textAlignVertical="top"
            blurOnSubmit={false}
            accessibilityLabel="输入一个目标任务"
          />
          {running ? (
            <View style={styles.sendButtonPlaceholder}>
              <ActivityIndicator size={20} />
            </View>
          ) : (
            <IconButton
              icon="arrow-up"
              mode="contained"
              size={20}
              disabled={!canSend}
              onPress={send}
              accessibilityLabel="发送"
              iconColor={canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
              containerColor={canSend ? theme.colors.primary : theme.colors.surfaceDisabled}
              style={styles.sendButton}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  messageViewport: { flex: 1, overflow: "hidden" },
  content: { flexGrow: 1, padding: 16, gap: 16 },
  cardContent: { gap: 12 },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  modelRow: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  empty: { flex: 1, justifyContent: "center", gap: 12, paddingVertical: 48 },
  examples: { alignItems: "flex-start", gap: 10, paddingTop: 12 },
  messages: { gap: 10 },
  message: { maxWidth: "88%" },
  toolEvent: { flexDirection: "row", alignItems: "center", alignSelf: "center" },
  composer: { paddingHorizontal: 12, paddingTop: 8, gap: 6 },
  runningStatus: { alignSelf: "center", textAlign: "center" },
  inputShell: {
    minHeight: 52,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 26,
    borderCurve: "continuous",
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 6,
  },
  input: {
    flex: 1,
    minHeight: SINGLE_LINE_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    padding: 0,
    fontSize: 16,
    lineHeight: 22,
    includeFontPadding: false,
  },
  sendButton: { width: 40, height: 40, margin: 0 },
  sendButtonPlaceholder: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
});
