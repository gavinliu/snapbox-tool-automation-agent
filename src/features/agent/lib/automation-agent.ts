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
import { Image } from "react-native";
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
  height: number;
  mediaType: string;
  width: number;
};

type ScreenSize = Pick<PendingScreenshot, "height" | "width">;

const SCREENSHOT_CONTEXT_TEXT =
  "这是 screenshot 工具刚刚截取的当前手机屏幕。请分析图片后继续完成任务。";

const pointSchema = {
  x: z.number().min(0).max(1000).describe("归一化横坐标，最左为 0，最右为 1000"),
  y: z.number().min(0).max(1000).describe("归一化纵坐标，最上为 0，最下为 1000"),
};

async function readScreenshot(uri: string): Promise<PendingScreenshot> {
  const fileUri = uri.startsWith("/") ? `file://${uri}` : uri;
  const file = new File(fileUri);
  const { width, height } = await Image.getSize(fileUri);
  const extension = fileUri.split("?")[0].split(".").pop()?.toLowerCase();
  const mediaType =
    file.type ||
    ({ jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp" }[extension ?? ""] ??
      "image/png");

  return { data: await file.base64(), height, mediaType, width };
}

function toPhysicalPoint(
  { x, y }: { x: number; y: number },
  { width, height }: ScreenSize,
) {
  return {
    x: Math.round((x / 1000) * (width - 1)),
    y: Math.round((y / 1000) * (height - 1)),
  };
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
  let latestScreenSize: ScreenSize | null = null;

  function requireScreenSize() {
    if (!latestScreenSize) {
      throw new Error("执行坐标操作前请先调用 screenshot 获取当前屏幕尺寸");
    }
    return latestScreenSize;
  }

  return new ToolLoopAgent({
    model: lmstudio("qwen/qwen3.5-35b-a3b"),
    instructions: `你是运行在 Android 手机上的自动化 Agent。你的目标是安全、准确地完成用户任务。

工作方式：
1. 先使用截图和当前 App 工具观察环境，再决定操作。
2. 每次改变界面后都应截图确认结果，不要凭空猜测坐标。
3. 所有坐标均使用 0 到 1000 的归一化坐标系，左上角为 (0, 0)，右下角为 (1000, 1000)。
4. 启动 App 时需要 Android package name；不知道时先向用户说明，不要编造。
5. 遇到登录、支付、隐私授权、删除数据等高风险操作时停止，并要求用户确认。
6. 任务完成后用简短中文总结执行结果。`,
    stopWhen: isStepCount(20),
    prepareStep: ({ messages }) => {
      if (!pendingScreenshot) return {};

      const screenshot = pendingScreenshot;
      pendingScreenshot = null;
      const messagesWithoutPreviousScreenshots = messages.filter(
        (message) =>
          !(
            message.role === "user" &&
            Array.isArray(message.content) &&
            message.content.some(
              (part) =>
                part.type === "text" && part.text === SCREENSHOT_CONTEXT_TEXT,
            )
          ),
      );

      return {
        messages: [
          ...messagesWithoutPreviousScreenshots,
          {
            role: "user",
            content: [
              {
                type: "text",
                text: SCREENSHOT_CONTEXT_TEXT,
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
          latestScreenSize = {
            height: pendingScreenshot.height,
            width: pendingScreenshot.width,
          };
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
        execute: async (point) => {
          const { x, y } = toPhysicalPoint(point, requireScreenSize());
          return { success: await tap(x, y) };
        },
      }),
      doubleTap: tool({
        description: "双击屏幕上的一个坐标。",
        inputSchema: z.object(pointSchema),
        execute: async (point) => {
          const { x, y } = toPhysicalPoint(point, requireScreenSize());
          return { success: await doubleTap(x, y) };
        },
      }),
      longPress: tool({
        description: "长按屏幕坐标。",
        inputSchema: z.object({
          ...pointSchema,
          duration: z.number().int().min(100).max(10000).default(800),
        }),
        execute: async ({ x, y, duration }) => {
          const physicalPoint = toPhysicalPoint({ x, y }, requireScreenSize());
          return {
            success: await longPress(
              physicalPoint.x,
              physicalPoint.y,
              duration,
            ),
          };
        },
      }),
      swipe: tool({
        description: "从一个屏幕坐标滑动到另一个坐标。",
        inputSchema: z.object({
          x1: z.number().min(0).max(1000).describe("起点归一化横坐标"),
          y1: z.number().min(0).max(1000).describe("起点归一化纵坐标"),
          x2: z.number().min(0).max(1000).describe("终点归一化横坐标"),
          y2: z.number().min(0).max(1000).describe("终点归一化纵坐标"),
          duration: z.number().int().min(100).max(10000).default(500),
        }),
        execute: async ({ x1, y1, x2, y2, duration }) => {
          const screenSize = requireScreenSize();
          const from = toPhysicalPoint({ x: x1, y: y1 }, screenSize);
          const to = toPhysicalPoint({ x: x2, y: y2 }, screenSize);
          return {
            success: await swipe(from.x, from.y, to.x, to.y, duration),
          };
        },
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
