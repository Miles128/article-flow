"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { projectsApi, formatApi } from "@/lib/api/client";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectDraft } from "@/lib/hooks/useProjectDraft";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { themes, codeThemes, getThemeByName } from "@/lib/themes";
import {
  CustomStyle,
  defaultStyle,
  generateCssFromStyle,
  loadSavedStyles,
  saveStylesToStorage,
} from "@/lib/styleUtils";
import { isTauri, openFile, saveFile } from "@/lib/platform";
import MarkdownIt from "markdown-it";
type MarkdownItInstance = InstanceType<typeof MarkdownIt>;
import hljs from "highlight.js";
import {
  FileText,
  Loader2,
  ChevronDown,
  Palette,
  Settings2,
  Check,
  Copy,
  ClipboardCheck,
  FolderOpen,
  Save,
  Trash2,
  Download,
  Upload,
} from "lucide-react";
import { clsx } from "clsx";

const PHONE_WIDTH = 375;

const md: MarkdownItInstance = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${hljs.highlight(str, { language: lang }).value}</code></pre>`;
      } catch {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});

const COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
  "#e6b8af",
  "#f4cccc",
  "#fce5cd",
  "#fff2cc",
  "#d9ead3",
  "#d0e0e3",
  "#c9daf8",
  "#cfe2f3",
  "#d9d2e9",
  "#ead1dc",
  "#dd7e6b",
  "#ea9999",
  "#f9cb9c",
  "#ffe599",
  "#b6d7a8",
  "#a2c4c9",
  "#a4c2f4",
  "#9fc5e8",
  "#b4a7d6",
  "#d5a6bd",
];

type StyleTarget =
  | "h1Color"
  | "h2Color"
  | "h3Color"
  | "pColor"
  | "strongColor"
  | "emColor"
  | "blockquoteColor"
  | "aColor"
  | "h1Bg"
  | "h2Bg"
  | "h3Bg"
  | "pBg"
  | "blockquoteBg"
  | "codeBg";

const styleTargets: { key: StyleTarget; label: string }[] = [
  { key: "h1Color", label: "标题色" },
  { key: "h2Color", label: "副标题色" },
  { key: "pColor", label: "正文色" },
  { key: "strongColor", label: "加粗色" },
  { key: "emColor", label: "斜体色" },
  { key: "blockquoteColor", label: "引用色" },
  { key: "aColor", label: "链接色" },
  { key: "h1Bg", label: "标题背景" },
  { key: "h2Bg", label: "副标题背景" },
  { key: "pBg", label: "正文背景" },
  { key: "blockquoteBg", label: "引用背景" },
  { key: "codeBg", label: "代码背景" },
];

const fontOptions = [
  {
    label: "系统默认",
    value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  { label: "苹方", value: '"PingFang SC", sans-serif' },
  { label: "宋体", value: '"SimSun", "STSong", serif' },
  { label: "黑体", value: '"SimHei", "STHeiti", sans-serif' },
  { label: "楷体", value: '"KaiTi", "STKaiti", serif' },
  { label: "微软雅黑", value: '"Microsoft YaHei", sans-serif' },
];

export default function FormatPage() {
  const { stepId } = useStepFromRoute();
  const { projectId, content, setContent, contentSource, loading } =
    useProjectDraft({ autoSaveMs: 2000 });
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(themes[0].name);
  const [useCustomStyle, setUseCustomStyle] = useState(false);
  const [customStyle, setCustomStyle] = useState<CustomStyle>(defaultStyle);
  const [showStyleBar, setShowStyleBar] = useState(false);
  const [activeTarget, setActiveTarget] = useState<StyleTarget>("h1Color");
  const [customColorInput, setCustomColorInput] = useState("");
  const [savedStyles, setSavedStyles] = useState<CustomStyle[]>([]);
  const [showSaveStyleDialog, setShowSaveStyleDialog] = useState(false);
  const [saveStyleName, setSaveStyleName] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [copying, setCopying] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [projectTitle, setProjectTitle] = useState("");

  useEffect(() => {
    setSavedStyles(loadSavedStyles());
    if (!projectId) return;
    projectsApi
      .getById(projectId)
      .then((r) => {
        if (r.data?.title) setProjectTitle(r.data.title);
      })
      .catch(() => {});
  }, [projectId]);

  const displayContent = content || "";
  const theme = getThemeByName(currentTheme);

  const previewHtml = useMemo(() => {
    if (!displayContent) return "";
    return md.render(displayContent);
  }, [displayContent]);

  const previewCss = useMemo(() => {
    if (useCustomStyle) {
      const codeCss =
        codeThemes[customStyle.codeTheme] || codeThemes["atom-one-dark"];
      return generateCssFromStyle(customStyle) + codeCss;
    }
    const codeCss = codeThemes[theme.codeTheme] || codeThemes["atom-one-dark"];
    return theme.css + codeCss;
  }, [useCustomStyle, customStyle, currentTheme]);

  function updateStyle<K extends keyof CustomStyle>(
    key: K,
    value: CustomStyle[K],
  ) {
    const newStyle = { ...customStyle, [key]: value };
    if (key === "pFontSize") {
      newStyle.h2FontSize = (value as number) + 2;
    }
    setCustomStyle(newStyle);
    setUseCustomStyle(true);
  }

  function applyColor(color: string) {
    updateStyle(activeTarget, color);
    setCustomColorInput(color);
  }

  function handleCustomColorApply() {
    if (customColorInput.trim()) {
      applyColor(customColorInput.trim());
    }
  }

  function handleSaveStyle() {
    if (!saveStyleName.trim()) return;
    const newStyle = { ...customStyle, name: saveStyleName.trim() };
    const existing = savedStyles.findIndex(
      (s) => s.name === saveStyleName.trim(),
    );
    let updated: CustomStyle[];
    if (existing >= 0) {
      updated = [...savedStyles];
      updated[existing] = newStyle;
    } else {
      updated = [...savedStyles, newStyle];
    }
    setSavedStyles(updated);
    saveStylesToStorage(updated);
    setShowSaveStyleDialog(false);
    setSaveStyleName("");
  }

  function handleLoadStyle(s: CustomStyle) {
    setCustomStyle(s);
    setUseCustomStyle(true);
  }

  function handleDeleteStyle(name: string) {
    const updated = savedStyles.filter((s) => s.name !== name);
    setSavedStyles(updated);
    saveStylesToStorage(updated);
  }

  type WechatColors = {
    accent: string;
    h1Color: string;
    h2Color: string;
    h3Color: string;
    bodyColor: string;
    strongColor: string;
    emColor: string;
    linkColor: string;
    quoteColor: string;
    quoteBg: string;
    codeBg: string;
    codeColor: string;
    thBg: string;
    thColor: string;
  };

  function getWechatColors(): WechatColors {
    if (useCustomStyle) {
      return {
        accent: customStyle.h1Color,
        h1Color: customStyle.h1Color,
        h2Color: customStyle.h2Color,
        h3Color: customStyle.h3Color,
        bodyColor: customStyle.pColor,
        strongColor: customStyle.strongColor,
        emColor: customStyle.emColor,
        linkColor: customStyle.aColor,
        quoteColor: customStyle.blockquoteColor,
        quoteBg: customStyle.blockquoteBg,
        codeBg: customStyle.codeBg,
        codeColor: customStyle.strongColor,
        thBg: customStyle.blockquoteBg || "#fdf8f2",
        thColor: customStyle.h1Color,
      };
    }

    const css = previewCss;
    const extract = (selector: string, prop: string, fallback: string) => {
      try {
        const re = new RegExp(
          selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
            `\\s*\\{[^}]*?` +
            prop +
            `:\\s*([^;]+)`,
          "i",
        );
        const m = css.match(re);
        return m ? m[1].trim() : fallback;
      } catch {
        return fallback;
      }
    };
    const accent = extract(".preview-content h1", "color", "#ff6600");

    return {
      accent,
      h1Color: extract(".preview-content h1", "color", "#ff6600"),
      h2Color: extract(".preview-content h2", "color", "#e55a00"),
      h3Color: extract(".preview-content h3", "color", "#cc5500"),
      bodyColor: extract(".preview-content p", "color", "#333"),
      strongColor: extract(".preview-content strong", "color", accent),
      emColor: extract(".preview-content em", "color", accent),
      linkColor: extract(".preview-content a", "color", accent),
      quoteColor: extract(".preview-content blockquote", "color", "#666"),
      quoteBg: extract(".preview-content blockquote", "background", "#fff8f0"),
      codeBg: extract(".preview-content code", "background", "#f5f5f5"),
      codeColor: extract(".preview-content code", "color", accent),
      thBg: extract(".preview-content th", "background", "#fff8f0"),
      thColor: extract(".preview-content th", "color", accent),
    };
  }

  function generateWechatHtml(
    markdownHtml: string,
    colors: WechatColors,
  ): string {
    const div = document.createElement("div");
    div.innerHTML = markdownHtml;

    function walk(node: Node) {
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const el = node as Element;
      const tag = el.tagName;

      if (tag === "H1") {
        el.setAttribute(
          "style",
          `font-size:20px;font-weight:bold;color:${colors.h1Color};text-align:center;margin:24px 0 16px;line-height:1.4;`,
        );
      } else if (tag === "H2") {
        el.setAttribute(
          "style",
          `font-size:18px;font-weight:bold;color:${colors.h2Color};text-align:center;margin:20px 0 12px;line-height:1.4;`,
        );
      } else if (tag === "H3") {
        el.setAttribute(
          "style",
          `font-size:16px;font-weight:bold;color:${colors.h3Color};margin:16px 0 8px;line-height:1.4;`,
        );
      } else if (tag === "P") {
        el.setAttribute(
          "style",
          `font-size:15px;color:${colors.bodyColor};line-height:1.75;margin:0 0 1em;letter-spacing:0.5px;`,
        );
      } else if (tag === "LI") {
        el.setAttribute(
          "style",
          `font-size:15px;color:${colors.bodyColor};line-height:1.75;margin-bottom:6px;`,
        );
      } else if (tag === "BLOCKQUOTE") {
        const bg =
          colors.quoteBg === "transparent" ? "#fff8f0" : colors.quoteBg;
        el.setAttribute(
          "style",
          `border-left:4px solid ${colors.accent};padding:10px 16px;margin:16px 0;background:${bg};color:${colors.quoteColor};font-style:italic;border-radius:0 8px 8px 0;`,
        );
      } else if (tag === "STRONG" || tag === "B") {
        el.setAttribute(
          "style",
          `color:${colors.strongColor};font-weight:bold;`,
        );
      } else if (tag === "EM" || tag === "I") {
        el.setAttribute("style", `font-style:italic;color:${colors.emColor};`);
      } else if (tag === "A") {
        el.setAttribute(
          "style",
          `color:${colors.linkColor};text-decoration:none;border-bottom:1px solid ${colors.linkColor};`,
        );
      } else if (tag === "CODE") {
        const parent = el.parentElement;
        if (parent && parent.tagName === "PRE") {
          el.setAttribute(
            "style",
            "background:none;color:inherit;padding:0;font-size:14px;",
          );
        } else {
          const bg =
            colors.codeBg === "transparent" ? "#f5f5f5" : colors.codeBg;
          el.setAttribute(
            "style",
            `background:${bg};color:${colors.codeColor};padding:2px 6px;border-radius:3px;font-size:14px;font-family:Consolas,Monaco,monospace;`,
          );
        }
      } else if (tag === "PRE") {
        el.setAttribute(
          "style",
          "background:#282c34;color:#abb2bf;padding:16px;border-radius:8px;overflow-x:auto;margin:16px 0;font-size:14px;line-height:1.6;",
        );
      } else if (tag === "IMG") {
        el.setAttribute(
          "style",
          "max-width:100%;border-radius:8px;margin:16px 0;display:block;",
        );
      } else if (tag === "TABLE") {
        el.setAttribute(
          "style",
          "width:100%;border-collapse:collapse;margin:16px 0;",
        );
      } else if (tag === "TH") {
        const bg = colors.thBg === "transparent" ? "#fdf8f2" : colors.thBg;
        el.setAttribute(
          "style",
          `background:${bg};color:${colors.thColor};font-weight:bold;padding:10px;border:1px solid #e5e7eb;`,
        );
      } else if (tag === "TD") {
        el.setAttribute(
          "style",
          `padding:10px;border:1px solid #e5e7eb;color:${colors.bodyColor};`,
        );
      } else if (tag === "UL" || tag === "OL") {
        el.setAttribute("style", "padding-left:2em;margin:10px 0;");
      }

      for (const child of Array.from(el.children)) {
        walk(child);
      }
    }

    walk(div);

    return div.innerHTML.replace(/class="[^"]*"/g, "").replace(/pt;/g, "px;");
  }

  async function handleCopyHtml() {
    if (!displayContent || copying) return;
    setCopying(true);
    setCopySuccess(false);
    try {
      const wechatHtml = `<section style="background:transparent;padding:0;">${generateWechatHtml(previewHtml, getWechatColors())}</section>`;

      const htmlBlob = new Blob([wechatHtml], { type: "text/html" });
      const clipboardItem = new ClipboardItem({ "text/html": htmlBlob });

      try {
        await navigator.clipboard.write([clipboardItem]);
      } catch {
        const copyHandler = (e: ClipboardEvent) => {
          e.preventDefault();
          e.clipboardData?.setData("text/html", wechatHtml);
          e.clipboardData?.setData("text/plain", displayContent);
        };
        document.addEventListener("copy", copyHandler);
        document.execCommand("copy");
        document.removeEventListener("copy", copyHandler);
      }

      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    } finally {
      setCopying(false);
    }
  }

  async function handleSaveAs(format: "md" | "html") {
    if (!displayContent) return;
    setSaveStatus("saving");
    try {
      const h1Match = displayContent.match(/^#\s+(.+)$/m);
      const baseName =
        projectTitle || (h1Match ? h1Match[1].trim() : "article");
      const safeName = baseName.replace(/[\\/:*?"<>|]/g, "");
      const suggestedName = `${safeName}.${format}`;
      if (format === "md") {
        await saveFile({
          content: displayContent,
          suggestedName,
          extensions: ["md"],
        });
      } else {
        const fullHtml = `<div class="preview-content">${previewHtml}</div>`;
        await saveFile({
          content: `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeName}</title><style>${previewCss}</style></head>
<body style="background:#fafafa;padding:20px;"><div style="max-width:480px;margin:0 auto;background:#fff;padding:24px 20px;">${fullHtml}</div></body></html>`,
          suggestedName,
          extensions: ["html"],
        });
      }
      setShowSaveMenu(false);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err: any) {
      if (err.name !== "AbortError" && err.message !== "AbortError") {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(""), 2000);
      } else setSaveStatus("");
    }
  }

  async function handleDownloadDocx() {
    if (!displayContent) return;
    setSaveStatus("saving");
    try {
      const resp = await formatApi.exportMarkdown({
        content: displayContent,
        format: "docx",
        title: projectTitle || "文章",
      });
      const blob = new Blob([resp.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle || "article"}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  }

  async function handleDownloadPdf() {
    if (!displayContent) return;
    setSaveStatus("saving");
    try {
      const resp = await formatApi.exportMarkdown({
        content: displayContent,
        format: "pdf",
        title: projectTitle || "文章",
      });
      const blob = new Blob([resp.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectTitle || "article"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(""), 2000);
    }
  }

  async function handleLoadFromLocal() {
    setSaveStatus("loading");
    try {
      const result = await openFile(["md", "txt"]);
      setContent(result.content);
      setSaveStatus("loaded");
      setTimeout(() => setSaveStatus(""), 2000);
    } catch (err: any) {
      if (err.name !== "AbortError" && err.message !== "AbortError") {
        setSaveStatus("error");
        setTimeout(() => setSaveStatus(""), 2000);
      } else setSaveStatus("");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin h-8 w-8 text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-200/30 flex flex-col">
      <header className="bg-surface-50/70 backdrop-blur-[3px] border-b border-surface-300 sticky top-0 z-30">
        <StepPageFrame
          wide
          title="格式处理"
          subtitle={contentSource === "previous" ? "已从上一步顺移" : undefined}
          stepId={stepId}
          actions={
            <>
              <button
                onClick={handleLoadFromLocal}
                className={clsx(
                  "wen-btn text-xs inline-flex items-center gap-1",
                  saveStatus === "loaded" &&
                    "!bg-green-50 !text-green-600 border-green-200",
                )}
              >
                <FolderOpen size={14} />
                {saveStatus === "loaded" ? "已读取" : "打开"}
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowSaveMenu(!showSaveMenu)}
                  disabled={!displayContent}
                  className={clsx(
                    "wen-btn text-xs inline-flex items-center gap-1",
                    saveStatus === "saved" &&
                      "!bg-green-50 !text-green-600 border-green-200",
                    saveStatus === "error" &&
                      "!bg-red-50 !text-red-600 border-red-200",
                    !displayContent && "opacity-50 cursor-not-allowed",
                  )}
                >
                  <Save size={14} />
                  {saveStatus === "saved" ? "已保存" : "保存"}
                  <ChevronDown size={12} />
                </button>
                {showSaveMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowSaveMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 wen-panel border border-surface-300 z-30 min-w-32 py-1">
                      <button
                        onClick={() => handleSaveAs("md")}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-200/30 text-xs text-ink-700"
                      >
                        Markdown
                      </button>
                      <button
                        onClick={() => handleSaveAs("html")}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-200/30 text-xs text-ink-700"
                      >
                        HTML
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="w-px h-5 bg-gray-200 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={() => {
                  setShowStyleBar(!showStyleBar);
                  if (!showStyleBar) setUseCustomStyle(true);
                }}
                className={clsx(
                  "wen-btn text-xs inline-flex items-center gap-1",
                  showStyleBar && "wen-btn-active",
                )}
              >
                <Settings2 size={14} />
                格式编辑
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  className="wen-btn text-xs inline-flex items-center gap-1"
                >
                  <Palette size={14} />
                  {useCustomStyle ? "自定义" : currentTheme}
                  <ChevronDown size={12} />
                </button>
                {showThemeMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-20"
                      onClick={() => setShowThemeMenu(false)}
                    />
                    <div className="fixed right-4 z-40 mt-1 wen-panel border border-surface-300 min-w-36 py-1">
                      <button
                        onClick={() => {
                          setUseCustomStyle(true);
                          setShowThemeMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-200/30 text-xs text-ink-700"
                      >
                        自定义样式{" "}
                        {useCustomStyle && (
                          <Check
                            size={12}
                            className="ml-auto text-primary-500"
                          />
                        )}
                      </button>
                      <div className="border-t border-surface-200 my-1" />
                      <div className="max-h-72 overflow-y-auto">
                        {themes.map((t) => (
                          <button
                            key={t.name}
                            onClick={() => {
                              setCurrentTheme(t.name);
                              setUseCustomStyle(false);
                              setShowThemeMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-surface-200/30 text-xs text-ink-700"
                          >
                            {t.name}{" "}
                            {!useCustomStyle && currentTheme === t.name && (
                              <Check
                                size={12}
                                className="ml-auto text-primary-500"
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="w-px h-5 bg-gray-200 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={handleCopyHtml}
                disabled={!displayContent || copying}
                className={clsx(
                  "wen-btn text-xs inline-flex items-center gap-1",
                  copySuccess &&
                    "!bg-green-50 !text-green-600 border-green-200",
                  (!displayContent || copying) &&
                    "opacity-50 cursor-not-allowed",
                )}
              >
                {copying ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : copySuccess ? (
                  <ClipboardCheck size={14} />
                ) : (
                  <Copy size={14} />
                )}
                {copying ? "处理中..." : copySuccess ? "已复制" : "复制微信"}
              </button>
              <div className="w-px h-5 bg-gray-200 shrink-0 hidden sm:block" />
              <button
                type="button"
                onClick={handleDownloadDocx}
                disabled={!displayContent}
                className="wen-btn text-xs inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Download size={14} />
                DOCX
              </button>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={!displayContent}
                className="wen-btn text-xs inline-flex items-center gap-1 disabled:opacity-50"
              >
                <Download size={14} />
                PDF
              </button>
            </>
          }
        >
          {null}
        </StepPageFrame>

        {showStyleBar && (
          <div className="border-t border-surface-200 bg-surface-50/70 backdrop-blur-[3px] px-4 py-2.5">
            <div className="flex items-start gap-4">
              <div className="flex flex-col gap-1.5 shrink-0">
                <div className="flex flex-wrap gap-1">
                  {styleTargets.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => {
                        setActiveTarget(t.key);
                        setCustomColorInput(
                          customStyle[t.key] === "transparent"
                            ? ""
                            : customStyle[t.key],
                        );
                      }}
                      className={clsx(
                        "px-2 py-0.5 text-xs rounded transition-colors",
                        activeTarget === t.key
                          ? "wen-chip-active"
                          : "bg-surface-200/50 text-ink-600 hover:bg-gray-200",
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-ink-400 shrink-0">当前:</span>
                  <span
                    className="w-4 h-4 rounded border border-surface-300 shrink-0"
                    style={{
                      backgroundColor:
                        customStyle[activeTarget] === "transparent"
                          ? "#fff"
                          : customStyle[activeTarget],
                    }}
                  />
                  <span className="text-xs text-ink-500 font-mono">
                    {customStyle[activeTarget]}
                  </span>
                  {customStyle[activeTarget] !== "transparent" && (
                    <button
                      onClick={() => applyColor("transparent")}
                      className="text-xs text-ink-400 hover:text-red-500"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => applyColor(c)}
                      className={clsx(
                        "w-5 h-5 rounded border transition-transform hover:scale-125",
                        customStyle[activeTarget] === c
                          ? "border-primary-500 ring-1 ring-primary-300 scale-110"
                          : "border-surface-300",
                      )}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="color"
                    value={
                      customStyle[activeTarget] === "transparent"
                        ? "#ffffff"
                        : customStyle[activeTarget]
                    }
                    onChange={(e) => applyColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-surface-300"
                  />
                  <input
                    type="text"
                    value={customColorInput}
                    onChange={(e) => setCustomColorInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleCustomColorApply()
                    }
                    placeholder="#ff6600"
                    className="w-24 px-2 py-0.5 text-xs border border-surface-300 rounded font-mono"
                  />
                  <button
                    onClick={handleCustomColorApply}
                    className="px-2 py-0.5 text-xs bg-surface-200/50 hover:bg-gray-200 rounded transition-colors"
                  >
                    应用
                  </button>
                </div>
              </div>

              <div className="shrink-0 flex flex-col gap-1.5 border-l border-surface-200 pl-4">
                <select
                  value={customStyle.fontFamily}
                  onChange={(e) => updateStyle("fontFamily", e.target.value)}
                  className="px-2 py-0.5 text-xs border border-surface-300 rounded"
                >
                  {fontOptions.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ink-400">字号</span>
                  <input
                    type="range"
                    min={12}
                    max={20}
                    value={customStyle.pFontSize}
                    onChange={(e) =>
                      updateStyle("pFontSize", parseInt(e.target.value))
                    }
                    className="w-16 accent-primary-500"
                  />
                  <span className="text-xs text-ink-500 w-6">
                    {customStyle.pFontSize}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-ink-400">行高</span>
                  <input
                    type="range"
                    min={1.2}
                    max={3}
                    step={0.1}
                    value={customStyle.pLineHeight}
                    onChange={(e) =>
                      updateStyle("pLineHeight", parseFloat(e.target.value))
                    }
                    className="w-16 accent-primary-500"
                  />
                  <span className="text-xs text-ink-500 w-6">
                    {customStyle.pLineHeight}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <button
                    onClick={() => {
                      setSaveStyleName(customStyle.name || "新样式");
                      setShowSaveStyleDialog(!showSaveStyleDialog);
                    }}
                    className="p-1 text-ink-400 hover:text-primary-500 rounded"
                    title="保存样式"
                  >
                    <Download size={14} />
                  </button>
                  {savedStyles.length > 0 && (
                    <div className="relative">
                      <button
                        className="p-1 text-ink-400 hover:text-primary-500 rounded"
                        title="加载样式"
                      >
                        <Upload size={14} />
                      </button>
                    </div>
                  )}
                </div>
                {showSaveStyleDialog && (
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      value={saveStyleName}
                      onChange={(e) => setSaveStyleName(e.target.value)}
                      placeholder="样式名"
                      className="w-16 px-1 py-0.5 text-xs border border-surface-300 rounded"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveStyle()}
                    />
                    <button
                      onClick={handleSaveStyle}
                      className="px-1.5 py-0.5 text-xs wen-btn-seal"
                    >
                      存
                    </button>
                    <button
                      onClick={() => setShowSaveStyleDialog(false)}
                      className="px-1.5 py-0.5 text-xs text-ink-400 hover:bg-surface-200/50 rounded"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {savedStyles.length > 0 && (
                  <div className="max-h-24 overflow-y-auto space-y-0.5">
                    {savedStyles.map((s, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <button
                          onClick={() => handleLoadStyle(s)}
                          className="text-xs text-primary-600 hover:underline truncate max-w-16"
                        >
                          {s.name}
                        </button>
                        <button
                          onClick={() => handleDeleteStyle(s.name)}
                          className="text-ink-300 hover:text-red-400"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex">
        <div className="w-1/2 border-r border-surface-300 flex flex-col">
          <div className="px-4 py-1.5 bg-surface-200/30 border-b border-surface-200">
            <span className="text-xs text-ink-500 font-medium">
              Markdown 编辑
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full p-4 font-mono text-sm leading-relaxed resize-none outline-none bg-surface-50/70 backdrop-blur-[3px] focus:bg-surface-200/30 transition-colors"
              placeholder="输入或粘贴 Markdown 内容..."
            />
          </div>
        </div>
        <div className="w-1/2 flex flex-col bg-surface-200/50">
          <div className="px-4 py-1.5 bg-surface-200/30 border-b border-surface-200 flex items-center justify-between">
            <span className="text-xs text-ink-500 font-medium">预览</span>
            <span className="text-xs text-ink-400">
              {PHONE_WIDTH}px · {useCustomStyle ? "自定义" : currentTheme}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-6 flex justify-center items-start">
            <div
              className="bg-surface-50/70 backdrop-blur-[3px] overflow-hidden"
              style={{ width: `${PHONE_WIDTH}px`, minHeight: "300px" }}
            >
              {displayContent ? (
                <div
                  className="preview-content"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-ink-400">
                  <FileText size={32} className="mb-3 opacity-50" />
                  <p className="text-sm">暂无内容</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: previewCss }} />
    </div>
  );
}
