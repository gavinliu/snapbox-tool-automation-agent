import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  back,
  captureScreen,
  doubleTap,
  getCurrentApp,
  home,
  launchApp,
  longPress,
  swipe,
  tap,
  typeText,
} from "@snapbox/pkg-automation-shizuku";
import { ToolLoopAgent, isStepCount, tool } from "ai";
import { File } from "expo-file-system";
import { z } from "zod";

const lmstudio = createOpenAICompatible({
  name: "lmstudio",
  baseURL: "http://192.168.31.56:1234/v1",
});

type ToolEvent = {
  name: string;
  input: unknown;
};

type PendingScreenshot = {
  data: string;
  mediaType: string;
};

const pointSchema = {
  x: z.number().nonnegative().describe("屏幕横坐标，单位 px"),
  y: z.number().nonnegative().describe("屏幕纵坐标，单位 px"),
};

async function readScreenshot(uri: string): Promise<PendingScreenshot> {
  const fileUri = uri.startsWith("/") ? `file://${uri}` : uri;
  const file = new File(fileUri);
  const extension = fileUri.split("?")[0].split(".").pop()?.toLowerCase();
  const mediaType =
    file.type ||
    ({ jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[extension ?? ""] ??
      "image/png");

  return { data: await file.base64(), mediaType };
}

export function createAutomationAgent({
  apiKey,
  model,
  onToolCall,
}: {
  apiKey: string;
  model: string;
  onToolCall?: (event: ToolEvent) => void;
}) {
  // OpenAI-compatible APIs only support multimodal content in user messages.
  // Keep screenshots out of tool results and inject them into the next step.
  let pendingScreenshot: PendingScreenshot | null = null;

  return new ToolLoopAgent({
    model: lmstudio("qwen/qwen3.5-35b-a3b"),
    instructions: `你是运行在 Android 手机上的自动化 Agent。你的目标是安全、准确地完成用户任务。

工作方式：
1. 先使用截图和当前 App 工具观察环境，再决定操作。
2. 每次改变界面后都应截图确认结果，不要凭空猜测坐标。
3. 坐标单位是屏幕物理像素，原点位于左上角。
4. 启动 App 时需要 Android package name；不知道时先向用户说明，不要编造。
5. 遇到登录、支付、隐私授权、删除数据等高风险操作时停止，并要求用户确认。
6. 任务完成后用简短中文总结执行结果。`,
    stopWhen: isStepCount(20),
    prepareStep: ({ messages }) => {
      if (!pendingScreenshot) return {};

      const screenshot = pendingScreenshot;
      pendingScreenshot = null;

      return {
        messages: [
          ...messages,
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "这是 screenshot 工具刚刚截取的当前手机屏幕。请分析图片后继续完成任务。",
              },
              {
                type: "file",
                mediaType: screenshot.mediaType,
                data: { type: "data", data: screenshot.data },
              },
            ],
          },
        ],
      };
    },
    onStepFinish: ({ toolCalls }) => {
      for (const call of toolCalls) {
        onToolCall?.({ name: call.toolName, input: call.input });
      }
    },
    tools: {
      screenshot: tool({
        description: "截取当前手机屏幕。用它观察 UI、定位控件并验证操作结果。",
        inputSchema: z.object({}),
        execute: async () => {
          const uri = await captureScreen();
          if (!uri) throw new Error("截图失败，请确认 Shizuku 已运行并授权");

          pendingScreenshot = await readScreenshot(uri);
          return { success: true, uri };
        },
        toModelOutput: () => ({
          type: "text",
          value: "截图成功。图片将在下一条用户消息中提供。",
        }),
      }),
      currentApp: tool({
        description: "获取当前前台 App 的 Android package name。",
        inputSchema: z.object({}),
        execute: async () => ({ packageName: await getCurrentApp() }),
      }),
      launchApp: tool({
        description: "通过 Android package name 启动 App。",
        inputSchema: z.object({ packageName: z.string().min(1) }),
        execute: async ({ packageName }) => ({
          success: await launchApp(packageName),
        }),
      }),
      tap: tool({
        description: "点击屏幕上的一个坐标。",
        inputSchema: z.object(pointSchema),
        execute: async ({ x, y }) => ({ success: await tap(x, y) }),
      }),
      doubleTap: tool({
        description: "双击屏幕上的一个坐标。",
        inputSchema: z.object(pointSchema),
        execute: async ({ x, y }) => ({ success: await doubleTap(x, y) }),
      }),
      longPress: tool({
        description: "长按屏幕坐标。",
        inputSchema: z.object({
          ...pointSchema,
          duration: z.number().int().min(100).max(10000).default(800),
        }),
        execute: async ({ x, y, duration }) => ({
          success: await longPress(x, y, duration),
        }),
      }),
      swipe: tool({
        description: "从一个屏幕坐标滑动到另一个坐标。",
        inputSchema: z.object({
          x1: z.number().nonnegative(),
          y1: z.number().nonnegative(),
          x2: z.number().nonnegative(),
          y2: z.number().nonnegative(),
          duration: z.number().int().min(100).max(10000).default(500),
        }),
        execute: async ({ x1, y1, x2, y2, duration }) => ({
          success: await swipe(x1, y1, x2, y2, duration),
        }),
      }),
      typeText: tool({
        description: "向当前获得焦点的输入框输入文本。",
        inputSchema: z.object({ text: z.string() }),
        execute: async ({ text }) => ({ success: await typeText(text) }),
      }),
      back: tool({
        description: "触发 Android 返回操作。",
        inputSchema: z.object({}),
        execute: async () => ({ success: await back() }),
      }),
      home: tool({
        description: "返回 Android 主屏幕。",
        inputSchema: z.object({}),
        execute: async () => ({ success: await home() }),
      }),
    },
  });
}
