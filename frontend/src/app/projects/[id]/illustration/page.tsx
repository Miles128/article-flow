"use client";

import { useEffect, useState, useRef } from "react";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectDraft } from "@/lib/hooks/useProjectDraft";
import { importContentFromFile } from "@/lib/contentFlow";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useAppStore } from "@/lib/store";
import api from "@/lib/api/client";
import {
  Image,
  Palette,
  Type,
  Sparkles,
  Download,
  Copy,
  Check,
  Loader2,
  Wand2,
  Scissors,
  FolderOpen,
  Clipboard,
  Bot,
  Globe,
} from "lucide-react";

const PHONE_WIDTH = 375;
const PHONE_HEIGHT = 667;

const ASPECT_RATIOS = [
  { label: "3:4 竖版", ratio: 3 / 4, w: 1080, h: 1440, desc: "小红书标准" },
  { label: "9:16 竖屏", ratio: 9 / 16, w: 1080, h: 1920, desc: "手机全屏" },
  { label: "4:3 横版", ratio: 4 / 3, w: 1440, h: 1080, desc: "PPT/文章" },
  { label: "16:9 宽屏", ratio: 16 / 9, w: 1920, h: 1080, desc: "视频封面" },
  { label: "1:1 方形", ratio: 1, w: 1080, h: 1080, desc: "Instagram" },
  { label: "2:3 长图", ratio: 2 / 3, w: 720, h: 1080, desc: "长文章" },
];

const COLOR_SCHEMES = [
  {
    name: "樱花粉",
    bg: "#FFF0F5",
    primary: "#FF6B9D",
    secondary: "#C44569",
    accent: "#FFB6C1",
    text: "#2D3436",
  },
  {
    name: "薄荷绿",
    bg: "#F0FFF4",
    primary: "#00B894",
    secondary: "#00A085",
    accent: "#81ECEC",
    text: "#2D3436",
  },
  {
    name: "天空蓝",
    bg: "#F0F8FF",
    primary: "#0984E3",
    secondary: "#0652DD",
    accent: "#74B9FF",
    text: "#2D3436",
  },
  {
    name: "暖阳橙",
    bg: "#FFF8E7",
    primary: "#E17055",
    secondary: "#D63031",
    accent: "#FFEAA7",
    text: "#2D3436",
  },
  {
    name: "薰衣草",
    bg: "#F5EEF8",
    primary: "#A29BFE",
    secondary: "#6C5CE7",
    accent: "#DFE6E9",
    text: "#2D3436",
  },
  {
    name: "奶油黄",
    bg: "#FEF9E7",
    primary: "#FDCB6E",
    secondary: "#E17055",
    accent: "#F9E79F",
    text: "#2D3436",
  },
  {
    name: "森林绿",
    bg: "#EAFAF1",
    primary: "#27AE60",
    secondary: "#1E8449",
    accent: "#ABEBC6",
    text: "#2D3436",
  },
  {
    name: "深海蓝",
    bg: "#EBF5FB",
    primary: "#2980B9",
    secondary: "#154360",
    accent: "#85C1E9",
    text: "#FFFFFF",
  },
  {
    name: "复古红",
    bg: "#FDEDEC",
    primary: "#E74C3C",
    secondary: "#922B21",
    accent: "#F1948A",
    text: "#2D3436",
  },
  {
    name: "水墨灰",
    bg: "#F8F9FA",
    primary: "#636E72",
    secondary: "#2D3436",
    accent: "#B2BEC3",
    text: "#2D3436",
  },
  {
    name: "蜜桃橙",
    bg: "#FEF5E7",
    primary: "#F39C12",
    secondary: "#D68910",
    accent: "#FAD7A0",
    text: "#2D3436",
  },
  {
    name: "冰川蓝",
    bg: "#F4F6F7",
    primary: "#5DADE2",
    secondary: "#2874A6",
    accent: "#AED6F1",
    text: "#2D3436",
  },
  {
    name: "玫瑰金",
    bg: "#FDF2F8",
    primary: "#CB997E",
    secondary: "#A0522D",
    accent: "#E6B8A2",
    text: "#2D3436",
  },
  {
    name: "柠檬黄",
    bg: "#FFFEF0",
    primary: "#F1C40F",
    secondary: "#B7950B",
    accent: "#FCF3CF",
    text: "#2D3436",
  },
  {
    name: "青瓷色",
    bg: "#F0FFFF",
    primary: "#17A589",
    secondary: "#148F77",
    accent: "#76D7C4",
    text: "#2D3436",
  },
  {
    name: "焦糖棕",
    bg: "#FBF6EF",
    primary: "#AF601A",
    secondary: "#873600",
    accent: "#EDBB99",
    text: "#2D3436",
  },
  {
    name: "葡萄紫",
    bg: "#F5EEF8",
    primary: "#884EA0",
    secondary: "#6C3483",
    accent: "#D7BDE2",
    text: "#FFFFFF",
  },
  {
    name: "珊瑚粉",
    bg: "#FFF5F5",
    primary: "#FF7675",
    secondary: "#D63031",
    accent: "#FFCCCC",
    text: "#2D3436",
  },
  {
    name: "竹叶青",
    bg: "#F2FFF7",
    primary: "#239B56",
    secondary: "#196F3D",
    accent: "#ABEBC6",
    text: "#2D3436",
  },
  {
    name: "极简黑白",
    bg: "#FFFFFF",
    primary: "#000000",
    secondary: "#333333",
    accent: "#CCCCCC",
    text: "#000000",
  },
];

function compressText(text: string, maxChars: number): string[] {
  const cleaned = text
    .replace(/[#*\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxChars) return [cleaned];
  const pages: string[] = [];
  let remaining = cleaned;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) {
      pages.push(remaining);
      break;
    }
    let cutIndex = maxChars;
    for (let i = maxChars - 1; i >= Math.max(0, maxChars - 50); i--) {
      if ("。！？\n".includes(remaining[i])) {
        cutIndex = i + 1;
        break;
      }
    }
    pages.push(remaining.slice(0, cutIndex));
    remaining = remaining.slice(cutIndex).trim();
  }
  return pages;
}

export default function IllustrationPage() {
  const { stepId } = useStepFromRoute();
  const { content, setContent, loading } = useProjectDraft({
    onLoaded: (loaded) => {
      if (loaded.content.trim()) {
        setTitle(loaded.content.split("\n")[0].replace(/^#+\s*/, ""));
      }
    },
  });
  const [selectedScheme, setSelectedScheme] = useState(0);
  const [selectedRatio, setSelectedRatio] = useState(0);
  const [customColors, setCustomColors] = useState({
    bg: "",
    primary: "",
    secondary: "",
    accent: "",
    text: "",
  });
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [prompt, setPrompt] = useState(`【小红书配图生成标准提示词】

你是一位专业的小红书视觉设计师。请根据以下规范生成小红书风格竖版图文卡片。

## 设计系统（Pentagram 编辑风 - 推荐默认）

### 配色方案
- 背景: #F0EBE0 到 #E8E2D6 渐变
- 主文字: #1A1A1A / 次要文字: #555555
- 品牌色/强调: #D4480B (赤陶橙)
- 辅助强调: #2B6CB0 (经典蓝)
- 高亮: #C0392B (深红)

### 比例与尺寸
- 默认比例: 3:4 竖版 (1080x1440) 小红书标准
- 必须高度大于宽度

### 字体规格（手机填充 - 关键！）
- 封面标题: 96px 加粗
- 章节标题: 64px
- 正文: 42px（28-32px太小）
- 重点/强调词: 84px（正文的2倍大）
- 页码: 16px 微弱右下角

### 卡片布局结构
顶部: SECTION LABEL 标签 → Section Title 64px → 分割线 → 正文42px行高1.6 + **重点词**84px → 引用框40px → 底部页码

### 风格变体
Pentagram 编辑风: 米白底+深字+橙强调
Build 奢侈极简: 白底+衬线+金强调
Takram 日式思辨: 暖米色+绿强调
Fathom 科学叙事: 浅灰+藏青蓝+蓝强调
Kenya Hara 空: 纸白+极简
Active Theory: 暗底+青色强调`);
  const [showPromptPanel, setShowPromptPanel] = useState(false);
  const [maxChars, setMaxChars] = useState(200);
  const [autoCompress, setAutoCompress] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pages, setPages] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const previewRef = useRef<HTMLIFrameElement>(null);
  const [copied, setCopied] = useState(false);

  // ─── AI 配图状态 ───
  const [aiMode, setAiMode] = useState<"manual" | "ai-html" | "ai-image">(
    "manual",
  );
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSvg, setAiSvg] = useState("");
  const [aiImageUrl, setAiImageUrl] = useState("");
  const [aiImagePrompt, setAiImagePrompt] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiQuote, setAiQuote] = useState("");
  const [imageApiKey, setImageApiKey] = useState("");
  const [imageProvider, setImageProvider] = useState("openai");
  const [imageBaseUrl, setImageBaseUrl] = useState("");
  const [imageModel, setImageModel] = useState("dall-e-3");
  const { currentProject } = useAppStore();

  async function handleGenerateHtmlIllustration() {
    if (!aiTopic.trim() && !aiQuote.trim()) return;
    setAiGenerating(true);
    setAiError("");
    setAiSvg("");
    try {
      const resp = await api.post("/illustration/generate-html", {
        topic: aiTopic,
        quote: aiQuote,
        style: "modern",
        color_scheme: getColors(),
      });
      setAiSvg(resp.data.svg);
    } catch (err: any) {
      setAiError(
        err.friendlyMessage ||
          err.response?.data?.error ||
          "AI 生成失败，请重试",
      );
    } finally {
      setAiGenerating(false);
    }
  }

  async function handleGenerateApiImage() {
    if (!aiTopic.trim() && !aiQuote.trim()) return;
    if (!imageApiKey.trim()) {
      setAiError("请先配置图片生成 API Key");
      return;
    }
    setAiGenerating(true);
    setAiError("");
    setAiImageUrl("");
    setAiImagePrompt("");
    try {
      const resp = await api.post("/illustration/generate-image", {
        topic: aiTopic,
        quote: aiQuote,
        style: "modern editorial",
        provider: imageProvider,
        image_api_key: imageApiKey,
        image_base_url: imageBaseUrl,
        image_model: imageModel,
      });
      setAiImageUrl(resp.data.image_url);
      setAiImagePrompt(resp.data.prompt_used);
    } catch (err: any) {
      setAiError(
        err.friendlyMessage ||
          err.response?.data?.error ||
          "图片生成失败，请重试",
      );
      if (err.response?.data?.prompt_used) {
        setAiImagePrompt(err.response.data.prompt_used);
      }
    } finally {
      setAiGenerating(false);
    }
  }

  useEffect(() => {
    if (content) {
      setPages(autoCompress ? compressText(content, maxChars) : [content]);
      setCurrentPage(0);
    }
  }, [content, maxChars, autoCompress]);

  function getColors() {
    if (useCustomColors)
      return {
        bg: customColors.bg || "#fff",
        primary: customColors.primary || "#FF6B9D",
        secondary: customColors.secondary || "#C44569",
        accent: customColors.accent || "#FFB6C1",
        text: customColors.text || "#333",
      };
    return COLOR_SCHEMES[selectedScheme];
  }

  function generateHTML(): string {
    const c = getColors();
    const t = pages[currentPage] || "";
    const subtitleHtml = subtitle
      ? '<p class="subtitle">' + subtitle + "</p>"
      : "";
    const ar = ASPECT_RATIOS[selectedRatio];
    const pw = ar.w;
    const ph = ar.h;
    const isWide = ar.ratio >= 1;
    const titleSize = isWide ? "42px" : "36px";
    const textSize = isWide ? "22px" : "20px";
    const tagSize = isWide ? "16px" : "14px";
    const padX = isWide ? "60px" : "48px";
    const padY = isWide ? "50px" : "40px";
    return `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}body{width:${pw}px;height:${ph}px;font-family:-apple-system,"PingFang SC","Microsoft YaHei",sans-serif;background:${c.bg};color:${c.text};overflow:hidden}.card{width:100%;height:100%;padding:${padY} ${padX};display:flex;flex-direction:column;position:relative;overflow:hidden}.decor-top{position:absolute;top:0;left:0;right:0;height:${ph * 0.12}px;background:linear-gradient(135deg,${c.primary}18,${c.accent}28);border-radius:0 0 ${ph * 0.04}px ${ph * 0.04}px}.decor-circle-1{position:absolute;top:${ph * 0.02}px;right:${pw * 0.02}px;width:${pw * 0.1}px;height:${pw * 0.1}px;border-radius:50%;background:${c.accent}38}.header{position:relative;z-index:2;margin-bottom:${ph * 0.02}px;margin-top:${ph * 0.02}px}.tag{display:inline-block;padding:${ph * 0.005}px ${pw * 0.015}px;background:${c.primary};color:#fff;font-size:${tagSize};border-radius:${tagSize};font-weight:600;letter-spacing:1px}.title{font-size:${titleSize};font-weight:700;color:${c.secondary};line-height:1.3;margin-top:${ph * 0.015}px;letter-spacing:-.3px}.subtitle{font-size:${textSize};color:${c.text}99;margin-top:${ph * 0.01}px;line-height:1.4}.divider{width:${pw * 0.04}px;height:${ph * 0.004}px;background:${c.primary};border-radius:2px;margin:${ph * 0.02}px 0;position:relative;z-index:2}.content-area{flex:1;position:relative;z-index:2;overflow:hidden;min-height:0}.content-text{font-size:${textSize};line-height:1.8;color:${c.text};opacity:.92}.footer{display:flex;justify-content:space-between;align-items:center;padding-top:${ph * 0.02}px;border-top:1px solid ${c.accent}55;position:relative;z-index:2;flex-shrink:0}.page-indicator{font-size:${textSize};color:${c.text}88;background:${c.accent}40;padding:${ph * 0.005}px ${pw * 0.01}px;border-radius:${textSize}}.brand{font-size:${tagSize};color:${c.primary};font-weight:700;letter-spacing:1.5px}.decor-dots{position:absolute;bottom:${ph * 0.1}px;left:${pw * 0.01}px;display:grid;grid-template-columns:repeat(3,${pw * 0.008}px);gap:${pw * 0.008}px;z-index:1}.dot{width:${pw * 0.006}px;height:${pw * 0.006}px;border-radius:50%}.dot-a{background:${c.primary}}.dot-b{background:${c.accent}}.dot-c{background:${c.secondary}}</style></head><body><div class="card"><div class="decor-top"></div><div class="decor-circle-1"></div><div class="header"><span class="tag">ARTICLE</span><h1 class="title">${title || "文章标题"}</h1>${subtitleHtml}<div class="divider"></div></div><div class="content-area"><div class="content-text">${t || "文章内容将显示在这里..."}</div></div><div class="footer"><span class="page-indicator">${currentPage + 1}/${pages.length || 1}</span><span class="brand">ARTICLE FLOW</span></div><div class="decor-dots"><div class="dot dot-a"></div><div class="dot dot-b"></div><div class="dot dot-c"></div><div class="dot dot-b"></div><div class="dot dot-a"></div><div class="dot dot-c"></div><div class="dot dot-a"></div><div class="dot dot-b"></div><div class="dot dot-c"></div></div></div></body></html>`;
  }

  async function handleCopyHTML() {
    await navigator.clipboard.writeText(generateHTML());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  async function handleExportImage() {
    const h = generateHTML(),
      b = new Blob([h], { type: "text/html" }),
      u = URL.createObjectURL(b),
      a = document.createElement("a");
    a.href = u;
    a.download = `${title || "配图"}_${currentPage + 1}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(u);
  }

  if (loading)
    return (
      <div className="h-full flex items-center justify-center bg-surface-50/60 backdrop-blur-[2px]">
        <Loader2 size={28} className="animate-spin text-ink-400" />
      </div>
    );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#fefcf3",
        overflow: "hidden",
      }}
    >
      <StepPageFrame
        wide
        title="生成配图"
        stepId={stepId}
        actions={
          <>
            <button
              type="button"
              onClick={async () => {
                const imported = await importContentFromFile();
                if (imported) {
                  setContent(imported);
                  setTitle(imported.split("\n")[0].replace(/^#+\s*/, ""));
                }
              }}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              <FolderOpen size={12} />
              导入
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  if (text.trim()) {
                    setContent(text);
                    setTitle(text.split("\n")[0].replace(/^#+\s*/, ""));
                  }
                } catch {}
              }}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              <Clipboard size={12} />
              粘贴
            </button>
            <button
              type="button"
              onClick={handleCopyHTML}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? "已复制" : "复制"}
            </button>
            <button
              type="button"
              onClick={handleExportImage}
              className="wen-btn-seal text-xs inline-flex items-center gap-1"
            >
              <Download size={12} />
              导出
            </button>
            <button
              type="button"
              onClick={() => {
                const h = generateHTML(),
                  b = new Blob([h], { type: "text/html" }),
                  u = URL.createObjectURL(b),
                  w = window.open(u, "_blank");
                setTimeout(() => {
                  if (w) {
                    w.document.close();
                    setTimeout(() => {
                      if (w) {
                        w.print();
                        URL.revokeObjectURL(u);
                      }
                    }, 500);
                  }
                }, 200);
              }}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              打印
            </button>
          </>
        }
      >
        {null}
      </StepPageFrame>

      {/* ─── AI 配图模式切换 ─── */}
      <div className="px-6 py-2 border-b border-surface-200 bg-surface-50/50 flex items-center gap-3 flex-wrap">
        <span className="text-xs text-ink-400 font-medium shrink-0">
          配图模式：
        </span>
        {[
          { id: "manual" as const, label: "手动配色", icon: Palette },
          { id: "ai-html" as const, label: "AI HTML 配图", icon: Bot },
          { id: "ai-image" as const, label: "AI API 生图", icon: Globe },
        ].map((m) => {
          const Icon = m.icon;
          const active = aiMode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => {
                setAiMode(m.id);
                setAiError("");
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border transition-colors ${
                active
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-surface-300 text-ink-600 hover:border-surface-400"
              }`}
            >
              <Icon size={13} />
              {m.label}
            </button>
          );
        })}
      </div>

      {/* ─── AI 配图输入区 ─── */}
      {aiMode !== "manual" && (
        <div className="px-6 py-3 border-b border-surface-200 bg-surface-50/30">
          <div className="flex flex-wrap items-start gap-3">
            <input
              type="text"
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="文章主题（如：Claude Code vs Cursor 对比）"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-surface-300 outline-none focus:ring-1 focus:ring-primary-400"
            />
            <input
              type="text"
              value={aiQuote}
              onChange={(e) => setAiQuote(e.target.value)}
              placeholder="引用金句（可选）"
              className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-surface-300 outline-none focus:ring-1 focus:ring-primary-400"
            />
            {aiMode === "ai-image" && (
              <>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="px-2 py-2 text-xs border border-surface-300 outline-none"
                >
                  <option value="openai">OpenAI DALL·E</option>
                  <option value="siliconflow">硅基流动 Flux</option>
                </select>
                <input
                  type="text"
                  value={imageApiKey}
                  onChange={(e) => setImageApiKey(e.target.value)}
                  placeholder="图片 API Key"
                  className="w-40 px-3 py-2 text-xs border border-surface-300 outline-none focus:ring-1 focus:ring-primary-400"
                />
              </>
            )}
            <button
              onClick={
                aiMode === "ai-html"
                  ? handleGenerateHtmlIllustration
                  : handleGenerateApiImage
              }
              disabled={aiGenerating || (!aiTopic.trim() && !aiQuote.trim())}
              className="wen-btn-seal text-xs gap-1.5 disabled:opacity-50 py-2"
            >
              {aiGenerating ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Sparkles size={14} />
              )}
              {aiGenerating ? "生成中..." : "生成"}
            </button>
          </div>

          {aiError && (
            <p className="mt-2 text-xs text-red-600">{aiError}</p>
          )}

          {/* SVG 预览 */}
          {aiSvg && (
            <div className="mt-3 border border-surface-300 rounded overflow-hidden bg-white">
              <div
                className="flex justify-center p-4"
                dangerouslySetInnerHTML={{ __html: aiSvg }}
              />
              <div className="flex justify-end gap-2 p-2 bg-surface-100 border-t border-surface-200">
                <button
                  onClick={() => {
                    const blob = new Blob([aiSvg], {
                      type: "image/svg+xml",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "illustration.svg";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="wen-btn text-xs"
                >
                  <Download size={12} /> SVG
                </button>
              </div>
            </div>
          )}

          {/* API 图片预览 */}
          {aiImageUrl && (
            <div className="mt-3 border border-surface-300 rounded overflow-hidden bg-white p-4">
              <img
                src={aiImageUrl}
                alt="AI 生成配图"
                className="max-w-full rounded"
              />
              {aiImagePrompt && (
                <p className="mt-2 text-xs text-ink-400">
                  Prompt: {aiImagePrompt}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <main style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <aside
          style={{
            width: 280,
            flexShrink: 0,
            overflowY: "auto",
            borderRight: "1px solid #e5e5e5",
            padding: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            backgroundColor: "#fefcf3",
          }}
        >
          {/* 配色方案 */}
          <div className="bg-surface-50/70 backdrop-blur-[3px] p-3 border border-surface-200">
            <h3 className="wen-title text-ink-700 mb-2 flex items-center gap-1.5">
              <Palette size={13} />
              配色方案
            </h3>
            <div className="grid grid-cols-10 gap-[3px] mb-2">
              {COLOR_SCHEMES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setSelectedScheme(i);
                    setUseCustomColors(false);
                  }}
                  title={s.name}
                  className={`aspect-square relative overflow-hidden border ${selectedScheme === i && !useCustomColors ? "ring-2 ring-ink-700 ring-offset-1" : "border-transparent hover:ring-1 hover:ring-primary-200"}`}
                  style={{ background: s.bg }}
                >
                  <div className="absolute inset-x-0 bottom-0 h-1/2 flex gap-[1px] p-[1px]">
                    <div
                      className="flex-1 "
                      style={{ background: s.primary }}
                    />
                    <div
                      className="flex-1 "
                      style={{ background: s.secondary }}
                    />
                    <div className="flex-1 " style={{ background: s.accent }} />
                  </div>
                  {selectedScheme === i && !useCustomColors && (
                    <div className="absolute inset-0 flex items-center justify-center bg-surface-50/75">
                      <Check size={10} className="text-primary-700" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-ink-700">
              <input
                type="checkbox"
                checked={useCustomColors}
                onChange={(e) => setUseCustomColors(e.target.checked)}
                className="rounded border-surface-300"
              />
              自定义颜色
            </label>
            {useCustomColors && (
              <div className="grid grid-cols-5 gap-2 mt-2">
                {[
                  { k: "bg", l: "背景" },
                  { k: "primary", l: "主色" },
                  { k: "secondary", l: "辅色" },
                  { k: "accent", l: "点缀" },
                  { k: "text", l: "文字" },
                ].map(({ k, l }) => (
                  <div key={k}>
                    <label className="text-ink-500 block mb-[2px]">
                      {l}
                    </label>
                    <input
                      type="color"
                      value={
                        customColors[k as keyof typeof customColors] || "#000"
                      }
                      onChange={(e) =>
                        setCustomColors((p) => ({ ...p, [k]: e.target.value }))
                      }
                      className="w-full h-8 rounded cursor-pointer border-none p-0"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 比例选择 */}
          <div className="bg-surface-50/70 backdrop-blur-[3px] p-3 border border-surface-200">
            <h3 className="wen-title text-ink-700 mb-2 flex items-center gap-1.5">
              <Image size={13} />
              比例与分辨率
            </h3>
            <div className="grid grid-cols-3 gap-1.5">
              {ASPECT_RATIOS.map((r, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedRatio(i)}
                  className={`px-2 py-1.5 border cursor-pointer text-center ${selectedRatio === i ? "wen-chip-active" : "border-surface-200 text-ink-500 hover:border-primary-300"}`}
                >
                  <div>{r.label}</div>
                  <div
                    className={`mt-0.5 ${selectedRatio === i ? "text-ink-300" : "text-ink-300"}`}
                  >
                    {r.w}×{r.h}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-ink-400">
              {ASPECT_RATIOS[selectedRatio].desc} ·{" "}
              {ASPECT_RATIOS[selectedRatio].w}×{ASPECT_RATIOS[selectedRatio].h}
              px
            </div>
          </div>

          {/* 提示词横条 */}
          <div className="bg-surface-50/70 backdrop-blur-[3px] p-2.5 border border-surface-300">
            <button
              onClick={() => setShowPromptPanel(!showPromptPanel)}
              className={`w-full px-3 py-2 text-left border border-surface-300 flex items-center justify-between cursor-pointer ${showPromptPanel ? "bg-blue-50" : "bg-surface-50/70 backdrop-blur-[3px]"}`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles
                  size={14}
                  className={showPromptPanel ? "text-blue-500" : "text-ink-400"}
                />
                <span className="font-medium">AI配图提示词</span>
              </span>
              <span className="text-ink-400 bg-surface-200/50 px-2 py-[2px] rounded-[10px]">
                {showPromptPanel ? "收起" : "编辑"}
              </span>
            </button>
          </div>

          {/* 文字控制 */}
          <div className="bg-surface-50/70 backdrop-blur-[3px] p-3 border border-surface-300">
            <h3 className="wen-title text-ink-700 mb-2 flex items-center gap-1.5">
              <Scissors size={13} />
              文字控制
            </h3>
            <label className="flex items-center gap-1.5 cursor-pointer text-ink-700 mb-2">
              <input
                type="checkbox"
                checked={autoCompress}
                onChange={(e) => setAutoCompress(e.target.checked)}
                className="rounded border-surface-300"
              />
              自动压缩（每页{maxChars}字）
            </label>
            <input
              type="range"
              min={100}
              max={500}
              step={50}
              value={maxChars}
              onChange={(e) => setMaxChars(Number(e.target.value))}
              disabled={!autoCompress}
              className="w-full h-1.5 bg-gray-200 rounded appearance-none accent-blue-500 mb-2"
              style={{ opacity: autoCompress ? 1 : 0.5 }}
            />
            {pages.length > 1 && (
              <div className="p-2 bg-surface-200/30 mt-1.5">
                <div className="text-ink-600 font-medium mb-1.5">
                  共{pages.length}页·第{currentPage + 1}页
                </div>
                <div className="flex gap-1">
                  {pages.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`flex-1 py-1.5 rounded cursor-pointer ${currentPage === i ? "wen-chip-active" : "bg-gray-200 text-ink-600"}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 标题设置 */}
          <div className="bg-surface-50/70 backdrop-blur-[3px] p-3 border border-surface-300">
            <h3 className="wen-title text-ink-700 mb-2 flex items-center gap-1.5">
              <Type size={13} />
              标题设置
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="主标题"
                className="w-full px-3 py-2 border border-surface-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="副标题（可选）"
                className="w-full px-3 py-2 border border-surface-300 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 使用提示 */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 border border-blue-100">
            <h4 className="wen-title text-blue-800 mb-1.5 flex items-center gap-1.5">
              <Wand2 size={13} className="text-blue-500" />
              使用提示
            </h4>
            <ul className="text-ink-600 space-y-1 leading-relaxed list-none p-0 m-0">
              <li>·选择配色或自定义颜色打造独特风格</li>
              <li>·开启自动压缩可将长文拆分为多页</li>
              <li>·导出HTML后可用浏览器打印为PNG/PDF</li>
              <li>·建议每页150~250字以获得最佳效果</li>
            </ul>
          </div>
        </aside>

        <section
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fdf9e8",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "6px 16px",
              backgroundColor: "#fefcf3",
              borderBottom: "1px solid #e5e5e5",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 12,
              color: "#737373",
              flexShrink: 0,
            }}
          >
            <span>
              预览 · {ASPECT_RATIOS[selectedRatio].label} ·{" "}
              {COLOR_SCHEMES[selectedScheme].name}
            </span>
            <div className="flex items-center gap-2">
              <span>
                {ASPECT_RATIOS[selectedRatio].w}×
                {ASPECT_RATIOS[selectedRatio].h}{" "}
                {pages.length > 1
                  ? `· 第${currentPage + 1}/${pages.length}页`
                  : ""}
              </span>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              overflow: "auto",
              padding: 32,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {content ? (
              <div
                style={{
                  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
                  overflow: "hidden",
                  backgroundColor: "#fff",
                  flexShrink: 0,
                  maxWidth: "100%",
                  maxHeight: "100%",
                }}
              >
                <iframe
                  ref={previewRef}
                  srcDoc={generateHTML()}
                  style={{
                    border: "none",
                    width: ASPECT_RATIOS[selectedRatio].w,
                    height: ASPECT_RATIOS[selectedRatio].h,
                    transform: `scale(${Math.min(1, 500 / Math.max(ASPECT_RATIOS[selectedRatio].w, ASPECT_RATIOS[selectedRatio].h))})`,
                    transformOrigin: "top left",
                    pointerEvents: "none",
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#9ca3af",
                }}
              >
                <Image size={48} style={{ marginBottom: 12, opacity: 0.3 }} />
                <p style={{ fontSize: 14 }}>请先在前面步骤中编写文章内容</p>
              </div>
            )}
          </div>

          <div
            style={{
              padding: "8px 16px",
              backgroundColor: "#fff",
              borderTop: "1px solid #e5e5e5",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleCopyHTML}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                color: "#404040",
                background: "transparent",
                border: "1px solid #e5e5e5",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              {copied ? (
                <>
                  <Check size={12} />
                  已复制
                </>
              ) : (
                <>
                  <Copy size={12} />
                  复制HTML
                </>
              )}
            </button>
            <button
              onClick={handleExportImage}
              style={{
                padding: "5px 12px",
                fontSize: 12,
                color: "#fff",
                background: "#3730a3",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
              }}
            >
              <Download size={12} />
              导出HTML
            </button>
          </div>

          {pages.length > 1 && (
            <div
              style={{
                padding: "6px 16px",
                borderTop: "1px solid #e5e5e5",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#fff",
              }}
            >
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "#404040",
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 6,
                  cursor: currentPage === 0 ? "not-allowed" : "pointer",
                  opacity: currentPage === 0 ? 0.3 : 1,
                }}
              >
                ←上一页
              </button>
              <span
                style={{
                  fontSize: 11,
                  color: "#737373",
                  fontWeight: 500,
                  padding: "3px 10px",
                  backgroundColor: "#fefcf3",
                  borderRadius: 999,
                }}
              >
                {currentPage + 1}/{pages.length}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(pages.length - 1, currentPage + 1))
                }
                disabled={currentPage >= pages.length - 1}
                style={{
                  padding: "4px 10px",
                  fontSize: 12,
                  color: "#404040",
                  background: "#fff",
                  border: "1px solid #e5e5e5",
                  borderRadius: 6,
                  cursor:
                    currentPage >= pages.length - 1 ? "not-allowed" : "pointer",
                  opacity: currentPage >= pages.length - 1 ? 0.3 : 1,
                }}
              >
                下一页→
              </button>
            </div>
          )}
        </section>
      </main>

      {/* 右侧浮动提示词面板 */}
      {showPromptPanel && (
        <div
          onClick={(e) =>
            e.target === e.currentTarget && setShowPromptPanel(false)
          }
          className="fixed inset-0 z-[100] bg-black/30 flex justify-end"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-[55%] max-w-[600px] h-full bg-surface-50/70 backdrop-blur-[3px] border-l border-surface-300 flex flex-col animate-slideIn"
          >
            <div className="px-4 py-3.5 border-b border-surface-300 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-blue-500" />
                <span className="text-sm font-semibold text-ink-900">
                  AI配图提示词
                </span>
              </div>
              <button
                onClick={() => setShowPromptPanel(false)}
                className="p-1 text-ink-400 hover:bg-surface-200/50 rounded cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>
            <div className="px-4 py-3 border-b border-surface-200 flex gap-1.5 flex-wrap shrink-0">
              {[
                "Pentagram编辑风",
                "Build奢侈极简",
                "Takram日式思辨",
                "Fathom科学叙事",
                "KenyaHara空",
                "ActiveTheory",
              ].map((n) => (
                <button
                  key={n}
                  className="px-2.5 py-1 border border-surface-300 bg-surface-200/30 text-ink-600 cursor-pointer hover:bg-blue-50"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="输入AI配图提示词..."
                className="flex-1 w-full p-4 leading-relaxed outline-none resize-none text-ink-700 bg-surface-200/30 focus:bg-surface-50/75 border-none"
              />
            </div>
            <div className="px-4 py-3 border-t border-surface-300 flex justify-between items-center shrink-0 bg-surface-200/30">
              <span className="text-ink-400">
                {prompt.length}字
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPrompt("")}
                  className="px-3 py-1.5 text-ink-600 wen-panel border border-surface-300 cursor-pointer"
                >
                  清空
                </button>
                <button
                  onClick={() => setShowPromptPanel(false)}
                  className="px-4 py-1.5 wen-btn-action-accent cursor-pointer font-medium"
                >
                  应用提示词
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
