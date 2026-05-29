"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore, useWritingStyleStore, getStepPath, getWorkflowSteps } from "@/lib/store";
import { writingApi, projectsApi, contentApi, writingStreamApi } from "@/lib/api/client";
import { useProjectStyleProfile } from "@/lib/hooks/useProjectStyleProfile";
import { showToast } from "@/components/ui/Toast";
import {
  ShortenModal,
  ExpandModal,
} from "@/components/writing/WritingAssistModals";
import { SelectionAiMenu } from "@/components/writing/SelectionAiMenu";
import {
  DocumentAiSheet,
  type DocumentExprAction,
} from "@/components/writing/DocumentAiSheet";
import { StyleRewriteSheet } from "@/components/writing/StyleRewriteSheet";
import { AntiAiSheet } from "@/components/writing/AntiAiSheet";
import { PlaybookSheet } from "@/components/writing/PlaybookSheet";
import { WritingOverflowMenu } from "@/components/writing/WritingOverflowMenu";
import {
  WritingFloatChip,
  WritingFloatSeal,
} from "@/components/writing/WritingFloatChip";
import { useWritingToolbarSlot } from "@/lib/writingToolbarSlot";
import {
  clampStyleIntensity,
  defaultIntensityForStyle,
  normalizeWritingStyleId,
  writingTargetStyleLabel,
} from "@/lib/writingStyles";
import type { RewriteStreamStats } from "@/lib/writingStream";
import { useWritingStyles } from "@/lib/hooks/useWritingStyles";
import { useWritingIntents } from "@/lib/hooks/useWritingIntents";
import { useWritingIntentStore } from "@/lib/store/writingIntentStore";
import {
  normalizeWritingIntentId,
  type WritingIntentId,
} from "@/lib/writingIntent";
import { useWritingAiScore } from "@/lib/hooks/useWritingAiScore";
import { WritingAiScoreBadge } from "@/components/writing/WritingAiScoreBadge";
import { SectionWriterPanel } from "@/components/writing/SectionWriterPanel";
import { DraftVersionPanel } from "@/components/writing/DraftVersionPanel";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/ui/MarkdownEditor";
import { isTauri, saveFile, writeToWorkspace, openFile } from "@/lib/platform";
import {
  importContentFromFile,
  saveDraftContent,
  loadDraftForStep,
  getDraftContent,
  getProjectOutlineMarkdown,
  countFastDraftSections,
} from "@/lib/contentFlow";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectDraft } from "@/lib/hooks/useProjectDraft";
import { getApiError } from "@/lib/apiError";
import { streamWritingAi } from "@/lib/writingStream";
import {
  countArticleWords,
  mergePreservedTitle,
  normalizeParagraphSpacing,
  replaceTextInDocument,
} from "@/lib/textUtils";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import {
  Sparkles,
  Loader2,
  ChevronDown,
  Copy,
  Check,
  AlertCircle,
  GraduationCap,
  Zap,
  Shuffle,
  LayoutTemplate,
  ArrowRight,
  Lightbulb,
  Target,
  Clock,
  BarChart3,
  Download,
  FolderOpen,
  Clipboard,
  RotateCcw,
  History,
} from "lucide-react";
import { clsx } from "clsx";

interface WritingMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  aiGeneration: string;
  timeEstimate: string;
  aiDetectionRate: string;
  quality: string;
  bestFor: string;
  workflow: string;
}

const modeIcons: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap size={28} />,
  Zap: <Zap size={28} />,
  Shuffle: <Shuffle size={28} />,
  LayoutTemplate: <LayoutTemplate size={28} />,
};

export default function WritingPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject, workspace, setDraftStatusText } = useAppStore();
  const { styleProfileId, styleProfiles, saveStyleProfile } =
    useProjectStyleProfile();
  const {
    styles: writingStyles,
    defaultStyle: defaultWritingStyle,
    intensityRange,
  } = useWritingStyles();
  const { stepId } = useStepFromRoute();
  const lastSavedContentRef = useRef<string>("");
  const lastSnapshotAtRef = useRef<number>(0);
  const prevEditorContentRef = useRef<string>("");
  const draftReadyRef = useRef(false);
  const contentRef = useRef<string>("");
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const [showModeSelector, setShowModeSelector] = useState(true);
  const [showImportHint, setShowImportHint] = useState(false);
  const {
    projectId,
    content,
    setContent,
    contentId,
    setContentId,
    contentSource,
    setContentSource,
  } = useProjectDraft({
    onLoaded: (loaded) => {
      draftReadyRef.current = true;
      prevEditorContentRef.current = loaded.content;
      setPreStyleContent(null);
      if (loaded.content.trim()) {
        lastSavedContentRef.current = loaded.content;
        setShowModeSelector(false);
        setShowImportHint(false);
      } else {
        setShowImportHint(true);
      }
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isAIAction, setIsAIAction] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [modes, setModes] = useState<WritingMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>("");

  const {
    targetStyle: writingTargetStyle,
    intensityByStyle,
    setTargetStyle: setWritingTargetStyle,
    setIntensityForStyle,
  } = useWritingStyleStore();
  const {
    intent: writingIntent,
    finishCoherence,
    insightPass,
    setIntent: setWritingIntent,
    setFinishCoherence,
    setInsightPass,
  } = useWritingIntentStore();
  const { intents: writingIntents, defaultIntent, loaded: intentsLoaded } =
    useWritingIntents();
  const [briefLoading, setBriefLoading] = useState(false);

  useEffect(() => {
    if (intentsLoaded) {
      setWritingIntent(normalizeWritingIntentId(defaultIntent));
    }
  }, [defaultIntent, intentsLoaded, setWritingIntent]);

  const writingStyleIntensity = clampStyleIntensity(
    intensityByStyle[writingTargetStyle] ??
      defaultIntensityForStyle(
        writingTargetStyle,
        writingStyles,
        intensityRange,
      ),
    writingTargetStyle,
    writingStyles,
    intensityRange,
  );

  useEffect(() => {
    const normalized = normalizeWritingStyleId(writingTargetStyle);
    if (normalized !== writingTargetStyle) {
      setWritingTargetStyle(normalized);
      return;
    }
    if (!writingStyles.some((s) => s.id === writingTargetStyle)) {
      setWritingTargetStyle(defaultWritingStyle);
    }
  }, [defaultWritingStyle, writingStyles, writingTargetStyle, setWritingTargetStyle]);

  function handleWritingStyleChange(id: string) {
    setWritingTargetStyle(id);
    const saved = intensityByStyle[id];
    if (saved == null) {
      setIntensityForStyle(
        id,
        defaultIntensityForStyle(id, writingStyles, intensityRange),
      );
    }
  }

  function handleWritingIntensityChange(pct: number) {
    const clamped = clampStyleIntensity(
      pct,
      writingTargetStyle,
      writingStyles,
      intensityRange,
    );
    setIntensityForStyle(writingTargetStyle, clamped);
  }
  const [rewriteLoading, setRewriteLoading] = useState(false);
  /** 首次「风格转换」前的全文，供「恢复正式」本地还原（不调大模型） */
  const [preStyleContent, setPreStyleContent] = useState<string | null>(null);

  const [coachSection, setCoachSection] = useState<{
    title: string;
    guide: string;
    feedback: string;
    userInput: string;
    phase: "guide" | "writing" | "feedback";
  } | null>(null);
  const [isCoachLoading, setIsCoachLoading] = useState(false);

  const [frameworkOutline, setFrameworkOutline] = useState("");
  const [frameworkOutlineLoaded, setFrameworkOutlineLoaded] = useState(false);
  const [frameworkOutlineLoading, setFrameworkOutlineLoading] = useState(false);
  const [showFrameworkInput, setShowFrameworkInput] = useState(false);
  const [playbookRefreshKey, setPlaybookRefreshKey] = useState(0);
  const [showDocumentSheet, setShowDocumentSheet] = useState(false);
  const [showStyleSheet, setShowStyleSheet] = useState(false);
  const [selectionMenuOpen, setSelectionMenuOpen] = useState(false);
  const [showAntiAiSheet, setShowAntiAiSheet] = useState(false);
  const [showPlaybookSheet, setShowPlaybookSheet] = useState(false);
  const [customStylePickId, setCustomStylePickId] = useState("");
  const [aiBusyAction, setAiBusyAction] = useState<string | null>(null);
  const [showShortenModal, setShowShortenModal] = useState(false);
  const [showExpandModal, setShowExpandModal] = useState(false);
  const rewriteScopeRef = useRef<{ text: string; isSelection: boolean }>({
    text: "",
    isSelection: false,
  });
  const [modalScopeText, setModalScopeText] = useState("");
  const [editorSelection, setEditorSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [selectionAnchor, setSelectionAnchor] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const aiScopeRef = useRef<{ text: string; isSelection: boolean }>({
    text: "",
    isSelection: false,
  });
  const toolbarSelectionRef = useRef<{
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [globalPromptLoading, setGlobalPromptLoading] = useState(false);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [expandLoading, setExpandLoading] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [serverDraftPreview, setServerDraftPreview] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState(0);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    if (styleProfileId) setCustomStylePickId(styleProfileId);
  }, [styleProfileId]);

  async function refreshRecoveryHints() {
    if (!projectId || content.trim()) {
      setServerDraftPreview(null);
      setVersionCount(0);
      return;
    }
    try {
      const saved = await getDraftContent(projectId);
      setServerDraftPreview(saved.trim() ? saved.slice(0, 80) : null);
    } catch {
      setServerDraftPreview(null);
    }
    try {
      const resp = await writingApi.listVersions(projectId);
      setVersionCount(resp.data.versions?.length ?? 0);
    } catch {
      setVersionCount(0);
    }
  }

  useEffect(() => {
    refreshRecoveryHints();
  }, [projectId, content]);

  useEffect(() => {
    if (!draftReadyRef.current || !projectId) return;
    const prev = prevEditorContentRef.current;
    if (prev.trim() && !content.trim()) {
      void writingApi
        .snapshotDraft({ projectId, content: prev, note: "清空前备份" })
        .then(() => refreshRecoveryHints())
        .catch(() => {});
      showToast("info", "内容已清空，可从「版本」或「恢复草稿」找回");
    }
    prevEditorContentRef.current = content;
  }, [content, projectId]);

  async function handleRecoverSavedDraft() {
    if (!projectId) return;
    try {
      const loaded = await loadDraftForStep(projectId, stepId);
      if (!loaded.content.trim()) {
        showToast("error", "服务器上没有已保存的草稿");
        return;
      }
      setContent(loaded.content);
      setContentId(loaded.contentId);
      setContentSource("saved");
      lastSavedContentRef.current = loaded.content;
      prevEditorContentRef.current = loaded.content;
      setPreStyleContent(null);
      setShowImportHint(false);
      setShowModeSelector(false);
      setLastSaved(new Date());
      showToast("success", "已恢复上次保存的草稿");
    } catch (error: unknown) {
      showToast("error", getApiError(error, "恢复草稿失败"));
    }
  }

  async function handleStartFresh() {
    setShowModeSelector(true);
    setShowImportHint(false);
    showToast("info", "已打开写作模式，可重新生成或自由撰写");
  }

  function openDocumentSheet() {
    snapshotToolbarSelection();
    setShowDocumentSheet(true);
  }

  function openStyleSheet() {
    snapshotToolbarSelection();
    setShowDocumentSheet(false);
    setSelectionMenuOpen(false);
    if (styleProfileId) setCustomStylePickId(styleProfileId);
    setShowStyleSheet(true);
  }

  function handleSelectionContextMenu(payload: {
    start: number;
    end: number;
    text: string;
    x: number;
    y: number;
  }) {
    toolbarSelectionRef.current = {
      start: payload.start,
      end: payload.end,
      text: payload.text,
    };
    setEditorSelection({
      start: payload.start,
      end: payload.end,
      text: payload.text,
    });
    setSelectionAnchor({ x: payload.x, y: payload.y });
    setSelectionMenuOpen(true);
  }

  function openAntiAiSheet() {
    snapshotToolbarSelection();
    setShowDocumentSheet(false);
    setShowAntiAiSheet(true);
  }

  function getScopeLabel(): string {
    const scope = getAiScope();
    const words = countArticleWords(scope.text);
    return scope.isSelection ? `选中 ${words} 字` : `全文 ${words.toLocaleString()} 字`;
  }

  async function handlePasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) return;
      editorRef.current?.insertAtCursor(text);
      setContentSource("saved");
      setShowImportHint(false);
      setShowModeSelector(false);
    } catch {
      alert("无法读取剪贴板");
    }
  }

  useEffect(() => {
    loadModes();
  }, [params.id]);

  useEffect(() => {
    const parts: string[] = [];
    if (contentSource === "previous") parts.push("已顺移");
    if (lastSaved) {
      const t = lastSaved.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      parts.push(`已保存 ${t}`);
    }
    setDraftStatusText(parts.length > 0 ? parts.join(" · ") : null);
    return () => setDraftStatusText(null);
  }, [contentSource, lastSaved, setDraftStatusText]);

  async function handleGenerateBrief() {
    if (!projectId) return;
    setBriefLoading(true);
    try {
      const resp = await writingApi.generateBrief({
        projectId,
        writingIntent,
      });
      const thesis = (resp.data.brief?.thesis as string) || "";
      showToast(
        "success",
        thesis
          ? `写前 Brief 已生成：${thesis.slice(0, 40)}${thesis.length > 40 ? "…" : ""}`
          : "写前 Brief 已生成",
      );
    } catch (error: unknown) {
      showToast("error", getApiError(error, "生成 Brief 失败"));
    } finally {
      setBriefLoading(false);
    }
  }

  async function handleFastDraft() {
    if (!params.id || !projectId) return;

    let sectionCount = 0;
    try {
      const outlineState = await writingApi.getSectionDraft(projectId);
      const draftMeta = outlineState.data as {
        sections?: Array<{ level?: number }>;
        section_count?: number;
      };
      sectionCount =
        draftMeta.section_count ??
        countFastDraftSections(draftMeta.sections);
      if (sectionCount === 0) {
        showToast("error", "请先在「生成大纲」步骤保存大纲，再按大纲写稿");
        return;
      }
    } catch {
      showToast("error", "无法读取大纲，请先到「生成大纲」步骤检查");
      return;
    }

    if (content.trim()) {
      const ok = window.confirm(
        `将按大纲逐节重新生成全文（共 ${sectionCount} 节），当前 ${countArticleWords(content)} 字会被替换。\n\n现有内容会先自动备份到版本历史。确定继续？`,
      );
      if (!ok) return;
      await writingApi
        .snapshotDraft({ projectId, content, note: "按大纲重写前备份" })
        .catch(() => {});
    }

    setPreStyleContent(null);
    setIsAIAction(true);
    const startTime = Date.now();
    let sectionParts: string[] = [];
    let receivedCount = 0;
    let streamSectionTotal = sectionCount;
    let latestContentId = contentId;  // 闭包快照，每次存盘后同步更新

    const effectiveTarget = currentProject?.targetWordCount ?? 2000;

    try {
      const perSection = Math.max(
        50,
        Math.floor(effectiveTarget / Math.max(sectionCount, 1)),
      );
      showToast(
        "info",
        `开始流式生成（${writingTargetStyleLabel(writingTargetStyle, writingStyles)} ${writingStyleIntensity}%），共 ${sectionCount} 节，目标 ${effectiveTarget} 字...`,
      );

      const response = await writingStreamApi.fastDraftStream({
        projectId: params.id as string,
        style: writingTargetStyle,
        styleIntensity: writingStyleIntensity,
        styleProfileId: styleProfileId || undefined,
        targetWordCount: effectiveTarget,
        writingIntent,
        finishCoherence,
        insightPass: insightPass && writingIntent === "insight_commentary",
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error((errData as any).error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("浏览器不支持流式读取");

      const decoder = new TextDecoder();
      let buffer = "";

      const handleStreamEvent = (event: {
        type: string;
        index?: number;
        title?: string;
        content?: string;
        text?: string;
        message?: string;
        total?: number;
        section_count?: number;
        total_word_count?: number;
        missing_sections?: string[];
      }) => {
        if (event.type === "start") {
          if (typeof event.total === "number" && event.total > 0) {
            streamSectionTotal = event.total;
          }
          return;
        }
        if (event.type === "delta" && typeof event.content === "string") {
          setContent(event.content);
          lastSavedContentRef.current = event.content;
          prevEditorContentRef.current = event.content;
          return;
        }
        if (event.type === "section_start") {
          showToast(
            "info",
            `正在写第 ${(event.index ?? 0) + 1}/${streamSectionTotal} 节：${event.title ?? ""}`,
          );
          return;
        }
        if (event.type === "section") {
          const idx = event.index ?? receivedCount;
          sectionParts[idx] = event.content ?? "";
          receivedCount++;
          const partial = sectionParts.filter(Boolean).join("\n\n");
          setContent(partial);
          lastSavedContentRef.current = partial;
          prevEditorContentRef.current = partial;
          saveDraftContent(params.id as string, partial, latestContentId)
            .then((cid) => {
              if (cid) {
                latestContentId = cid;
                setContentId(cid);
              }
            })
            .catch(() => {});
          return;
        }
        if (event.type === "done") {
          void (async () => {
            const finalContent =
              event.content || sectionParts.filter(Boolean).join("\n\n");
            setContent(finalContent);
            lastSavedContentRef.current = finalContent;
            prevEditorContentRef.current = finalContent;
            setPreStyleContent(null);
            setShowModeSelector(false);
            requestAnimationFrame(() => editorRef.current?.scrollToTop());

            const cid = await saveDraftContent(
              params.id as string,
              finalContent,
              latestContentId,
            ).catch(() => null);
            if (cid) {
              latestContentId = cid;
              setContentId(cid);
            }

            const missing = event.missing_sections ?? [];
            if (missing.length > 0) {
              showToast(
                "error",
                `已生成，但有 ${missing.length} 个章节标题未出现在正文中`,
              );
            } else {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
              showToast(
                "success",
                `全部完成！${event.section_count} 节 / ${event.total_word_count} 字，耗时 ${elapsed}s。旧版已自动备份到版本历史。`,
              );
            }
          })();
          return;
        }
        if (event.type === "error") {
          showToast("error", event.message || "生成出错");
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (!dataLine) continue;
          try {
            handleStreamEvent(JSON.parse(dataLine.slice(6)));
          } catch {
            // skip malformed JSON
          }
        }
      }
      if (buffer.trim()) {
        const dataLine = buffer
          .split("\n")
          .find((line) => line.startsWith("data: "));
        if (dataLine) {
          try {
            handleStreamEvent(JSON.parse(dataLine.slice(6)));
          } catch {
            /* ignore */
          }
        }
      }
    } catch (error: unknown) {
      const msg = getApiError(error, "按大纲生成失败");
      showToast("error", msg);
    } finally {
      setIsAIAction(false);
    }
  }

  async function loadModes() {
    try {
      const response = await writingApi.getModes();
      setModes(response.data.modes);
    } catch {
      setModes([
        {
          id: "fast",
          name: "快速模式",
          icon: "Zap",
          description: "AI 生成初稿",
          aiGeneration: "100%",
          timeEstimate: "1-2h",
          aiDetectionRate: "25-40%",
          quality: "⭐⭐⭐",
          bestFor: "通用",
          workflow: "AI生成→审校",
        },
        {
          id: "coach",
          name: "教练模式",
          icon: "GraduationCap",
          description: "AI 引导你自己写",
          aiGeneration: "0%",
          timeEstimate: "3-4h",
          aiDetectionRate: "<15%",
          quality: "⭐⭐⭐⭐⭐",
          bestFor: "个人经历",
          workflow: "AI引导→用户写→AI检查",
        },
        {
          id: "mixed",
          name: "混合模式",
          icon: "Shuffle",
          description: "AI写框架，你填细节",
          aiGeneration: "40%",
          timeEstimate: "2-3h",
          aiDetectionRate: "18-25%",
          quality: "⭐⭐⭐⭐",
          bestFor: "教程/案例",
          workflow: "AI写信息→用户填经验",
        },
        {
          id: "framework",
          name: "框架约束",
          icon: "LayoutTemplate",
          description: "自动读取项目大纲，按结构生成",
          aiGeneration: "60-80%",
          timeEstimate: "1.5-3h",
          aiDetectionRate: "20-35%",
          quality: "⭐⭐⭐⭐",
          bestFor: "报告/标书",
          workflow: "读取项目大纲→按框架生成",
        },
      ]);
    }
  }

  async function maybeSnapshotBeforeSave(manual: boolean) {
    if (!projectId) return;
    const previous = lastSavedContentRef.current.trim();
    if (!previous) return;

    try {
      await writingApi.snapshotDraft({
        projectId,
        content: previous,
        note: manual ? "手动保存前" : "自动保存前",
      });
      lastSnapshotAtRef.current = Date.now();
    } catch {
      /* 快照失败不阻断保存 */
    }
  }

  async function handleSave(manual = false) {
    if (!projectId || !content.trim()) return;
    const beforeSnapshot = lastSavedContentRef.current;
    try {
      setIsSaving(true);
      await maybeSnapshotBeforeSave(manual);
      const id = await saveDraftContent(projectId, content, contentId);
      setContentId(id);

      if (
        beforeSnapshot.trim() &&
        beforeSnapshot !== content &&
        Math.abs(content.length - beforeSnapshot.length) >= 10
      ) {
        try {
          const learnResp = await contentApi.learnPlaybook({
            before: beforeSnapshot,
            after: content,
            projectId,
            styleProfileId: styleProfileId || undefined,
          });
          const removed = learnResp.data.removedPhrases?.length || 0;
          const added = learnResp.data.addedOralMarkers?.length || 0;
          if (removed + added > 0) {
            showToast(
              "success",
              `Playbook 已学习 ${removed + added} 条改稿规律`,
            );
            setPlaybookRefreshKey((k) => k + 1);
          }
        } catch {
          /* 学习失败不阻断保存 */
        }
      }
      lastSavedContentRef.current = content;

      if (isTauri && workspace.path && currentProject) {
        const fileName = `${currentProject.title || "草稿"}.md`;
        await writeToWorkspace(workspace.path, fileName, content);
      }

      setLastSaved(new Date());
      if (currentProject) {
        await projectsApi.update(currentProject._id, {
          wordCount: content.length,
          currentStep: 5,
        });
      }
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAs() {
    if (!content.trim()) return;
    const fileName = `${currentProject?.title || "草稿"}.md`;

    try {
      const savedPath = await saveFile({
        content,
        suggestedName: fileName,
        extensions: ["md"],
      });
      if (savedPath) alert(`已保存到: ${savedPath}`);
    } catch (err: any) {
      if (err?.message === "AbortError") return;
      alert(`保存失败: ${err.message || ""}`);
    }
  }

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (content.length > 0) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        handleSave(false);
      }, 2000);
      return () => {
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      };
    }
  }, [content]);

  function handleModeSelect(modeId: string) {
    setSelectedMode(modeId);
    setShowModeSelector(false);

    if (modeId === "framework") {
      void loadFrameworkOutlineFromProject();
    } else if (modeId === "coach") {
      handleCoachNextSection();
    }
  }

  async function loadFrameworkOutlineFromProject() {
    if (!projectId) return;
    setFrameworkOutlineLoading(true);
    setFrameworkOutlineLoaded(false);
    try {
      const md = await getProjectOutlineMarkdown(projectId);
      if (!md.trim()) {
        showToast("error", "请先在「生成大纲」步骤保存大纲");
        setShowModeSelector(true);
        setSelectedMode("");
        return;
      }
      setFrameworkOutline(md);
      setFrameworkOutlineLoaded(true);
      setShowFrameworkInput(true);
    } catch {
      showToast("error", "读取项目大纲失败");
      setShowModeSelector(true);
      setSelectedMode("");
    } finally {
      setFrameworkOutlineLoading(false);
    }
  }

  async function handleCoachNextSection() {
    setIsCoachLoading(true);
    try {
      const sectionInfo = {
        title: "当前段落",
        goal: "基于您的真实经历和思考撰写",
        wordCount: "150-200",
      };
      const response = await writingApi.coachGuide(sectionInfo, {
        styleProfileId: styleProfileId || undefined,
      });
      setCoachSection({
        title: "段落写作",
        guide: response.data.guide,
        feedback: "",
        userInput: "",
        phase: "guide",
      });
    } catch (error) {
      console.error("Coach guide failed:", error);
    } finally {
      setIsCoachLoading(false);
    }
  }

  async function handleCoachSubmitWriting() {
    if (!coachSection?.userInput.trim()) return;
    setIsCoachLoading(true);
    try {
      const response = await writingApi.coachCheck(coachSection.userInput, {
        title: coachSection.title,
        goal: "",
        wordCount: "150-200",
      });
      setCoachSection((prev) =>
        prev
          ? {
              ...prev,
              feedback: response.data.feedback,
              phase: "feedback",
            }
          : null,
      );
    } catch (error) {
      console.error("Coach check failed:", error);
    } finally {
      setIsCoachLoading(false);
    }
  }

  function handleCoachAcceptAndContinue() {
    if (!coachSection) return;
    setContent((prev) => prev + "\n\n" + coachSection.userInput);
    setCoachSection(null);
    handleCoachNextSection();
  }

  async function handleFrameworkGenerate() {
    if (!projectId) return;
    if (!frameworkOutline.trim() && !frameworkOutlineLoaded) {
      showToast("error", "没有可用的大纲");
      return;
    }

    if (content.trim()) {
      const ok = window.confirm(
        `将按项目大纲重新生成全文，当前 ${countArticleWords(content)} 字会被替换。\n\n现有内容会先自动备份。确定继续？`,
      );
      if (!ok) return;
      await writingApi
        .snapshotDraft({ projectId, content, note: "框架模式重写前备份" })
        .catch(() => {});
    }

    setPreStyleContent(null);
    setIsAIAction(true);
    try {
      const finalText = await streamWritingAi(
        {
          action: "framework_generate",
          projectId,
          outline: frameworkOutline.trim() || undefined,
          style: writingTargetStyle,
          styleIntensity: writingStyleIntensity,
          styleProfileId: styleProfileId || undefined,
          writingIntent,
        },
        {
          onStreamStart: () => setShowFrameworkInput(false),
          onDelta: (streamed) => {
            setContent(streamed);
            lastSavedContentRef.current = streamed;
            prevEditorContentRef.current = streamed;
          },
        },
      );
      setPreStyleContent(null);
      requestAnimationFrame(() => editorRef.current?.scrollToTop());
      showToast(
        "success",
        `已按项目大纲生成，约 ${countArticleWords(finalText)} 字`,
      );
    } catch (error: unknown) {
      showToast("error", getApiError(error, "按大纲生成失败"));
    } finally {
      setIsAIAction(false);
    }
  }

  function getDraftText(): string {
    return (contentRef.current || content).trim();
  }

  function snapshotToolbarSelection() {
    toolbarSelectionRef.current = editorSelection;
  }

  function getAiScope() {
    const snapped = toolbarSelectionRef.current?.text?.trim();
    if (snapped) return { text: snapped, isSelection: true };
    const sel = editorSelection?.text?.trim();
    if (sel) return { text: sel, isSelection: true };
    const full = contentRef.current || content;
    return { text: full, isSelection: false };
  }

  function applyStreamedContent(
    streamed: string,
    scope: { text: string; isSelection: boolean },
  ) {
    const normalized = normalizeParagraphSpacing(streamed);
    if (scope.isSelection) {
      const next = replaceTextInDocument(
        contentRef.current,
        scope.text,
        normalized,
      );
      setContent(next);
      lastSavedContentRef.current = next;
      prevEditorContentRef.current = next;
    } else {
      setContent(normalized);
      lastSavedContentRef.current = normalized;
      prevEditorContentRef.current = normalized;
    }
  }

  function applyAiResultToDocument(
    resultText: string,
    scope: { text: string; isSelection: boolean },
  ) {
    applyStreamedContent(resultText, scope);
  }

  function openShortenModal() {
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先输入或选中要缩写的内容");
      return;
    }
    aiScopeRef.current = scope;
    setModalScopeText(scope.text);
    setShowShortenModal(true);
  }

  function openExpandModal() {
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先输入或选中要扩写的内容");
      return;
    }
    aiScopeRef.current = scope;
    setModalScopeText(scope.text);
    setShowExpandModal(true);
  }

  async function handleCustomStyleApply(profileId: string, intensity: number) {
    const scope = getAiScope();
    if (!scope.text.trim() || !profileId) {
      showToast("error", "请先选择风格档案并输入正文");
      return;
    }
    const full = (contentRef.current || content).trim();
    if (full) setPreStyleContent((prev) => prev ?? full);
    setRewriteLoading(true);
    setAiBusyAction("rewrite");
    setShowStyleSheet(false);
    try {
      const resultText = await streamWritingAi(
        {
          action: "rewrite",
          content: scope.text,
          style: writingTargetStyle || defaultWritingStyle,
          styleIntensity: intensity,
          styleProfileId: profileId,
        },
        {
          onDelta: (streamed) => applyStreamedContent(streamed, scope),
        },
      );
      if (!resultText.trim()) {
        showToast("error", "自定义风格改写结果为空，请重试");
        return;
      }
      const name =
        styleProfiles.find((p) => p._id === profileId)?.name ?? "自定义风格";
      showToast(
        "success",
        scope.isSelection
          ? `选中片段已按「${name}」${intensity}% 改写`
          : `全文已按「${name}」${intensity}% 改写`,
      );
    } catch (error: unknown) {
      showToast("error", getApiError(error, "自定义风格改写失败"));
    } finally {
      setRewriteLoading(false);
      setAiBusyAction(null);
      toolbarSelectionRef.current = null;
    }
  }

  async function handleDocumentSheetRun(
    action: DocumentExprAction,
    extraInstruction?: string,
  ) {
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先在编辑器输入正文，或选中一段文字");
      return;
    }
    if (extraInstruction) {
      setShowDocumentSheet(false);
      await handleApplyGlobalPrompt(extraInstruction);
      return;
    }
    if (action === "antiAi") {
      openAntiAiSheet();
      return;
    }
    if (action === "expand") {
      aiScopeRef.current = scope;
      setModalScopeText(scope.text);
      setShowDocumentSheet(false);
      setShowExpandModal(true);
      return;
    }
    if (action === "shorten") {
      aiScopeRef.current = scope;
      setModalScopeText(scope.text);
      setShowDocumentSheet(false);
      setShowShortenModal(true);
      return;
    }
    setShowDocumentSheet(false);
    await handleAIAction(
      action,
      scope.isSelection ? scope.text : undefined,
    );
    toolbarSelectionRef.current = null;
  }

  function runSelectionAction(action: "polish" | "expand" | "shorten") {
    snapshotToolbarSelection();
    if (action === "expand") {
      openExpandModal();
      return;
    }
    if (action === "shorten") {
      openShortenModal();
      return;
    }
    runScopedAiAction("polish");
  }

  async function handleStyleConvert(opts?: {
    style?: string;
    intensity?: number;
    restorePlain?: boolean;
    successHint?: string;
  }) {
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先在编辑器输入正文，或选中一段文字");
      return;
    }
    const styleId = normalizeWritingStyleId(opts?.style ?? writingTargetStyle);
    const intensity = opts?.intensity ?? writingStyleIntensity;
    if (!opts?.restorePlain) {
      const full = (contentRef.current || content).trim();
      if (full) {
        setPreStyleContent((prev) => prev ?? full);
      }
    }
    rewriteScopeRef.current = scope;
    setRewriteLoading(true);
    setAiBusyAction("rewrite");
    try {
      let rewriteStats: RewriteStreamStats | undefined;
      const resultText = await streamWritingAi(
        {
          action: "rewrite",
          content: scope.text,
          style: styleId,
          styleIntensity: intensity,
          restorePlain: opts?.restorePlain,
          styleProfileId: styleProfileId || undefined,
          writingIntent,
        },
        {
          onDelta: (streamed, event) => {
            if (event.rewrite_stats) rewriteStats = event.rewrite_stats;
            applyStreamedContent(streamed, scope);
          },
        },
      );
      if (!resultText.trim()) {
        showToast("error", "风格转换结果为空，请重试");
        return;
      }
      const label = writingTargetStyleLabel(styleId, writingStyles);
      const statsHint =
        rewriteStats?.selective && rewriteStats.unit_count
          ? `（计划改 ${rewriteStats.planned_count ?? rewriteStats.rewritten_count ?? 0} 句，实际改动 ${rewriteStats.rewritten_count ?? 0}/${rewriteStats.unit_count} 句，其余原样）`
          : rewriteStats?.selective === false
            ? "（全文改写模式）"
            : "";
      const msg =
        opts?.successHint ??
        (scope.isSelection
          ? `选中片段已按浓度 ${intensity}% 流式改写${statsHint}`
          : `已按「${label}」浓度 ${intensity}% 流式改写${statsHint}`);
      showToast("success", msg);
    } catch (error: unknown) {
      showToast("error", getApiError(error, "风格转换失败"));
    } finally {
      setRewriteLoading(false);
      setAiBusyAction(null);
      toolbarSelectionRef.current = null;
    }
  }

  function handleRestorePlain() {
    const baseline = preStyleContent?.trim();
    if (!baseline) {
      showToast(
        "error",
        "没有可恢复的原文：请先用「风格转换」改写过正文，或从「版本」里找回历史稿",
      );
      return;
    }
    setContent(baseline);
    lastSavedContentRef.current = baseline;
    prevEditorContentRef.current = baseline;
    handleWritingStyleChange("professional");
    showToast("success", "已恢复为风格转换前的正文（未调用 AI）");
  }

  async function handleAIAction(action: string, selection?: string) {
    if (action === "shorten") {
      openShortenModal();
      return;
    }
    if (action === "expand") {
      openExpandModal();
      return;
    }
    if (action === "rewrite") {
      void handleStyleConvert();
      return;
    }
    const currentContent = contentRef.current || content;
    setAiBusyAction(action);
    try {
      const textToProcess = selection?.trim() || currentContent;
      if (!textToProcess.trim()) {
        showToast("error", "请先输入或选中要处理的内容");
        return;
      }
      const resultScope = selection?.trim()
        ? { text: selection.trim(), isSelection: true }
        : { text: currentContent, isSelection: false };

      switch (action) {
        case "continue": {
          const full = await streamWritingAi(
            {
              action: "continue",
              content: currentContent,
              styleProfileId: styleProfileId || undefined,
            },
            {
              onDelta: (streamed) => {
                setContent(streamed);
                lastSavedContentRef.current = streamed;
                prevEditorContentRef.current = streamed;
              },
            },
          );
          if (!full.trim() || full.length <= currentContent.length) {
            showToast("error", "续写结果为空，请重试");
            return;
          }
          showToast("success", "续写完成");
          break;
        }
        case "polish": {
          const resultText = await streamWritingAi(
            {
              action: "polish",
              content: textToProcess,
              style: "professional",
              styleProfileId: styleProfileId || undefined,
            },
            { onDelta: (streamed) => applyStreamedContent(streamed, resultScope) },
          );
          if (!resultText.trim()) {
            showToast("error", "润色结果为空，请重试");
            return;
          }
          showToast("success", "润色完成：已优化表达，文体未改");
          break;
        }
      }
    } catch (error: unknown) {
      showToast(
        "error",
        getApiError(error, "AI 处理失败，请检查后端与 LLM 配置"),
      );
      console.error("AI action failed:", error);
    } finally {
      setAiBusyAction(null);
    }
  }

  async function handleApplyGlobalPrompt(instruction: string) {
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先输入或选中要改写的内容");
      return;
    }
    setGlobalPromptLoading(true);
    setShowDocumentSheet(false);
    try {
      const resultText = await streamWritingAi(
        {
          action: "apply_prompt",
          content: scope.text,
          instruction,
          styleProfileId: styleProfileId || undefined,
        },
        {
          onStreamStart: () => setShowDocumentSheet(false),
          onDelta: (streamed) => applyStreamedContent(streamed, scope),
        },
      );
      if (!resultText.trim()) {
        showToast("error", "改稿结果为空，请重试");
        return;
      }
      showToast(
        "success",
        scope.isSelection ? "已改写选中片段" : "已智能改写全文",
      );
    } catch (error: unknown) {
      showToast("error", getApiError(error, "整体改稿失败"));
    } finally {
      setGlobalPromptLoading(false);
    }
  }

  async function handleShortenApply(targetWordCount: number) {
    const scope = aiScopeRef.current;
    if (!scope.text.trim()) {
      showToast("error", "请先输入或选中要缩写的内容");
      return;
    }
    setShortenLoading(true);
    setAiBusyAction("shorten");
    try {
      const resultText = await streamWritingAi(
        {
          action: "shorten",
          content: scope.text,
          targetWordCount,
          sourceWordCount: countArticleWords(scope.text),
          styleProfileId: styleProfileId || undefined,
        },
        {
          onStreamStart: () => setShowShortenModal(false),
          onDelta: (streamed) => applyStreamedContent(streamed, scope),
        },
      );
      if (!resultText.trim()) {
        showToast("error", "缩写结果为空，请重试");
        return;
      }
      showToast("success", `缩写完成，目标约 ${targetWordCount} 字`);
    } catch (error: unknown) {
      showToast("error", getApiError(error, "缩写失败"));
    } finally {
      setShortenLoading(false);
      setAiBusyAction(null);
    }
  }

  async function handleExpandApply(targetWordCount: number) {
    const scope = aiScopeRef.current;
    if (!scope.text.trim()) {
      showToast("error", "请先输入或选中要扩写的内容");
      return;
    }
    setExpandLoading(true);
    setAiBusyAction("expand");
    try {
      const resultText = await streamWritingAi(
        {
          action: "expand",
          content: scope.text,
          targetLength: targetWordCount,
          styleProfileId: styleProfileId || undefined,
        },
        {
          onStreamStart: () => setShowExpandModal(false),
          onDelta: (streamed) => applyStreamedContent(streamed, scope),
        },
      );
      if (!resultText.trim()) {
        showToast("error", "扩写结果为空，请重试");
        return;
      }
      showToast("success", `扩写完成，目标约 ${targetWordCount} 字`);
    } catch (error: unknown) {
      showToast("error", getApiError(error, "扩写失败"));
    } finally {
      setExpandLoading(false);
      setAiBusyAction(null);
    }
  }

  const wordCount = countArticleWords(content);
  const selectionSnippet = editorSelection?.text?.trim();
  const hasDraftText = Boolean(getDraftText());
  const aiTargetReady = Boolean(selectionSnippet || hasDraftText);
  const aiToolbarBusy = Boolean(
    isAIAction || aiBusyAction || rewriteLoading || globalPromptLoading,
  );
  const workflowSteps = getWorkflowSteps(currentProject?.contentType).length;
  const setToolbarActions = useWritingToolbarSlot((s) => s.setActions);
  const { score: aiScore, targetScore: aiTargetScore, loading: aiScoreLoading } =
    useWritingAiScore(content, !showModeSelector);

  const writingTopActions = useMemo(
    () =>
      !showModeSelector ? (
        <>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || !content.trim()}
            className="wen-btn-seal"
          >
            {isSaving ? <Loader2 className="animate-spin" size={12} /> : null}
            {isSaving ? "保存中" : "保存"}
          </button>
          <WritingOverflowMenu
            items={[
              {
                id: "outline",
                label: "按大纲写稿",
                disabled: isAIAction,
                onClick: () => void handleFastDraft(),
              },
              {
                id: "versions",
                label: "版本",
                onClick: () => setShowVersionPanel(true),
              },
              {
                id: "playbook",
                label: "Playbook",
                onClick: () => setShowPlaybookSheet(true),
              },
            {
              id: "import",
                label: "导入文件",
                onClick: async () => {
                  const imported = await importContentFromFile();
                  if (imported) {
                    setContent(imported);
                    setContentSource("saved");
                    setShowImportHint(false);
                    setShowModeSelector(false);
                  }
                },
              },
              {
                id: "paste",
                label: "粘贴内容",
                onClick: () => void handlePasteFromClipboard(),
              },
              {
                id: "prev-step",
                label: "上一步",
                disabled: stepId <= 1,
                onClick: () =>
                  router.push(
                    getStepPath(
                      stepId - 1,
                      projectId || "",
                      currentProject?.contentType,
                    ),
                  ),
              },
              {
                id: "next-step",
                label: "下一步",
                disabled: stepId >= workflowSteps,
                onClick: () =>
                  router.push(
                    getStepPath(
                      stepId + 1,
                      projectId || "",
                      currentProject?.contentType,
                    ),
                  ),
              },
            ]}
          />
        </>
      ) : null,
    [
      showModeSelector,
      isSaving,
      content,
      isAIAction,
      aiTargetReady,
      aiToolbarBusy,
      stepId,
      workflowSteps,
      projectId,
      currentProject?.contentType,
      router,
    ],
  );

  useEffect(() => {
    setToolbarActions(writingTopActions);
    return () => setToolbarActions(null);
  }, [writingTopActions, setToolbarActions]);

  function runScopedAiAction(
    action: string,
    opts?: { openModal?: boolean },
  ) {
    if (opts?.openModal) {
      if (action === "shorten") openShortenModal();
      else if (action === "expand") openExpandModal();
      return;
    }
    const scope = getAiScope();
    if (!scope.text.trim()) {
      showToast("error", "请先在编辑器输入正文，或选中一段文字");
      return;
    }
    void handleAIAction(
      action,
      scope.isSelection ? scope.text : undefined,
    ).finally(() => {
      toolbarSelectionRef.current = null;
    });
  }

  return (
    <StepPageFrame
      title={showModeSelector ? "写出草稿" : undefined}
      stepId={showModeSelector ? stepId : undefined}
      fullWidth
      toolbarOnly={!showModeSelector}
      hideToolbar={!showModeSelector}
    >
      {showModeSelector && (
        <div className="wen-panel-padded p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="wen-title text-ink-900 mb-2">
              选择写作模式
            </h2>
            <p className="text-ink-500 mb-3">
              根据文章类型选择最适合的AI辅助模式
            </p>
            <p className="text-xs text-ink-400">
              按大纲写稿将使用顶部「风格 + 浓度%」（幽默等默认偏克制）
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => handleModeSelect(mode.id)}
                className={clsx(
                  "text-left p-5 border-2 transition-all ",
                  selectedMode === mode.id
                    ? "border-primary-500 bg-primary-50"
                    : "border-surface-300 hover:border-primary-300",
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className={clsx(
                      "p-2 ",
                      mode.id === "coach"
                        ? "bg-purple-100 text-purple-600"
                        : mode.id === "fast"
                          ? "bg-blue-100 text-blue-600"
                          : mode.id === "mixed"
                            ? "bg-green-100 text-green-600"
                            : "bg-accent-100 text-accent-600",
                    )}
                  >
                    {modeIcons[mode.icon]}
                  </div>
                  <div>
                    <h3 className="wen-title text-ink-900">{mode.name}</h3>
                    <p className="text-xs text-ink-500">{mode.quality}</p>
                  </div>
                </div>

                <p className="text-sm text-ink-600 mb-3">{mode.description}</p>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-ink-400">AI 生成</span>
                    <span className="font-medium">{mode.aiGeneration}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">时间</span>
                    <span className="font-medium">{mode.timeEstimate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">AI 检测率</span>
                    <span className="font-medium">{mode.aiDetectionRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-400">适合</span>
                    <span className="font-medium text-right max-w-[120px] truncate">
                      {mode.bestFor}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-surface-200/30 text-sm text-ink-500 text-center">
            <Clock size={14} className="inline mr-1" />
            也可以先{" "}
            <button
              onClick={() => setShowModeSelector(false)}
              className="text-primary-500 underline"
            >
              跳过选择
            </button>
            ，直接开始自由写作
          </div>
        </div>
      )}

      {!showModeSelector && selectedMode === "mixed" && params.id && (
          <div className="mb-4">
            <SectionWriterPanel
              projectId={params.id as string}
              draftContent={content}
              styleProfileId={styleProfileId || undefined}
              onAppend={(text: string) =>
                setContent((prev) => (prev ? prev + "\n\n" : "") + text)
              }
            />
          </div>
        )}

      {frameworkOutlineLoading && selectedMode === "framework" && (
        <div className="wen-panel-padded p-6 mb-6 flex items-center gap-2 text-sm text-ink-500">
          <Loader2 className="animate-spin" size={18} />
          正在加载项目大纲…
        </div>
      )}

      {showFrameworkInput && selectedMode === "framework" && frameworkOutlineLoaded && (
        <div className="wen-panel-padded p-6 mb-6">
          <h3 className="wen-title text-ink-900 mb-3 flex items-center gap-2">
            <LayoutTemplate size={20} className="text-accent-500" />
            项目大纲（来自「生成大纲」步骤）
          </h3>
          <p className="text-sm text-ink-500 mb-3">
            已自动载入你在前面步骤保存的大纲。如需微调可编辑下方内容，然后按大纲生成全文。
          </p>
          <textarea
            value={frameworkOutline}
            onChange={(e) => setFrameworkOutline(e.target.value)}
            className="w-full h-48 p-3 border border-surface-300 text-sm font-mono resize-y"
            readOnly={false}
          />
          <div className="flex justify-end gap-3 mt-3">
            <button
              type="button"
              onClick={() => {
                setShowFrameworkInput(false);
              }}
              className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 "
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleFrameworkGenerate}
              disabled={!frameworkOutline.trim() || isAIAction}
              className="wen-btn-action-accent disabled:opacity-50"
            >
              {isAIAction ? (
                <Loader2 className="animate-spin inline" size={16} />
              ) : null}
              按项目大纲生成
            </button>
          </div>
        </div>
      )}

      {selectedMode === "coach" && coachSection && (
        <div className="wen-panel-padded border border-purple-200 p-6 mb-6">
          <h3 className="wen-title text-ink-900 mb-3 flex items-center gap-2">
            <GraduationCap size={20} className="text-purple-500" />
            教练模式 ·{" "}
            {coachSection.phase === "guide"
              ? "引导阶段"
              : coachSection.phase === "writing"
                ? "写作阶段"
                : "反馈阶段"}
          </h3>

          {coachSection.phase === "guide" && (
            <div>
              <div className="bg-purple-50 p-4 mb-4 whitespace-pre-wrap text-sm">
                {coachSection.guide}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() =>
                    setCoachSection((prev) =>
                      prev ? { ...prev, phase: "writing" } : null,
                    )
                  }
                  className="wen-btn-action-accent"
                >
                  开始写作 <ArrowRight size={16} className="inline ml-1" />
                </button>
              </div>
            </div>
          )}

          {coachSection.phase === "writing" && (
            <div>
              <textarea
                value={coachSection.userInput}
                onChange={(e) =>
                  setCoachSection((prev) =>
                    prev ? { ...prev, userInput: e.target.value } : null,
                  )
                }
                className="w-full h-40 p-3 border border-surface-300 text-sm resize-none mb-3"
                placeholder="在这里写出你的段落..."
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() =>
                    setCoachSection((prev) =>
                      prev ? { ...prev, phase: "guide" } : null,
                    )
                  }
                  className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 "
                >
                  返回引导
                </button>
                <button
                  onClick={handleCoachSubmitWriting}
                  disabled={!coachSection.userInput.trim() || isCoachLoading}
                  className="wen-btn-action-accent disabled:opacity-50"
                >
                  {isCoachLoading ? (
                    <Loader2 className="animate-spin inline" size={16} />
                  ) : null}
                  提交检查
                </button>
              </div>
            </div>
          )}

          {coachSection.phase === "feedback" && (
            <div>
              <div className="bg-accent-50 p-4 mb-4 whitespace-pre-wrap text-sm border border-accent-200">
                {coachSection.feedback}
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() =>
                    setCoachSection((prev) =>
                      prev ? { ...prev, phase: "writing" } : null,
                    )
                  }
                  className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 "
                >
                  继续修改
                </button>
                <button
                  onClick={handleCoachAcceptAndContinue}
                  className="wen-btn-action text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
                >
                  <Check size={16} className="inline mr-1" />
                  接受并继续下一段
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {(!content.trim() || showImportHint) && (
          <div className="bg-accent-50 border border-accent-200 p-5 text-center">
            <AlertCircle size={24} className="text-accent-500 mx-auto mb-2" />
            <h3 className="wen-title text-accent-800 mb-1">
              {serverDraftPreview || versionCount > 0
                ? "草稿为空，但可以恢复"
                : "还没有文章内容"}
            </h3>
            <p className="text-xs text-accent-600 mb-3">
              {serverDraftPreview
                ? `服务器上仍有已保存草稿：${serverDraftPreview}${serverDraftPreview.length >= 80 ? "…" : ""}`
                : versionCount > 0
                  ? `共有 ${versionCount} 个历史版本可恢复`
                  : "你可以导入已有文章、粘贴内容，或选择写作模式重新开始"}
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {serverDraftPreview ? (
                <button
                  type="button"
                  onClick={handleRecoverSavedDraft}
                  className="inline-flex items-center gap-2 wen-btn-action-accent text-sm"
                >
                  <RotateCcw size={16} />
                  恢复已保存草稿
                </button>
              ) : null}
              {versionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowVersionPanel(true)}
                  className="inline-flex items-center gap-2 wen-btn-action-accent text-sm"
                >
                  <History size={16} />
                  打开版本历史
                </button>
              ) : null}
              <button
                type="button"
                onClick={handleStartFresh}
                className="inline-flex items-center gap-2 px-4 py-2 border border-accent-400 text-accent-800 hover:bg-accent-100 text-sm"
              >
                <Sparkles size={16} />
                重新开始写作
              </button>
              <button
                type="button"
                onClick={async () => {
                  const imported = await importContentFromFile();
                  if (imported) {
                    setContent(imported);
                    setContentSource("saved");
                    setShowImportHint(false);
                    setShowModeSelector(false);
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 border border-accent-300 text-accent-700 hover:bg-accent-100 text-sm"
              >
                <FolderOpen size={16} />
                导入文件
              </button>
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                className="inline-flex items-center gap-2 px-4 py-2 border border-accent-300 text-accent-700 hover:bg-accent-100 text-sm"
              >
                <Clipboard size={16} />
                粘贴内容
              </button>
            </div>
          </div>
        )}

        <div className="min-w-0">
            <MarkdownEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onSelectionChange={(sel) => {
                setEditorSelection(sel);
                if (!sel?.text?.trim()) setSelectionMenuOpen(false);
              }}
              onSelectionContextMenu={handleSelectionContextMenu}
              showToolbar={!showModeSelector}
              forcedMode="edit"
              seamlessToolbar={!showModeSelector}
              showStatusBar={false}
              minHeight="calc(100vh - 9.5rem)"
              placeholder="开始撰写您的文章..."
              toolbarEnd={
                !showModeSelector ? (
                  <>
                    <span className="text-xs text-ink-500 font-serif tabular-nums whitespace-nowrap">
                      {wordCount.toLocaleString()} 字
                    </span>
                    <WritingAiScoreBadge
                      score={aiScore}
                      targetScore={aiTargetScore}
                      loading={aiScoreLoading}
                      onClick={openAntiAiSheet}
                    />
                    <WritingFloatChip
                      disabled={!aiTargetReady || aiToolbarBusy}
                      onClick={openDocumentSheet}
                    >
                      改表达
                    </WritingFloatChip>
                    <WritingFloatChip
                      disabled={!aiTargetReady || aiToolbarBusy}
                      variant="seal"
                      onClick={openStyleSheet}
                    >
                      改风格
                    </WritingFloatChip>
                    <WritingFloatSeal
                      disabled={!content.trim() || aiToolbarBusy}
                      onClick={() => void handleAIAction("continue")}
                    >
                      {aiBusyAction === "continue" ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : null}
                      续写
                    </WritingFloatSeal>
                  </>
                ) : undefined
              }
            />
          <SelectionAiMenu
            visible={
              !showModeSelector &&
              selectionMenuOpen &&
              Boolean(selectionSnippet)
            }
            selectionText={selectionSnippet ?? ""}
            anchor={selectionAnchor}
            busy={aiToolbarBusy}
            onClose={() => setSelectionMenuOpen(false)}
            onPolish={() => runSelectionAction("polish")}
            onExpand={() => runSelectionAction("expand")}
            onShorten={() => runSelectionAction("shorten")}
            onAntiAi={openAntiAiSheet}
            onStyleRewrite={openStyleSheet}
            onPrepareAction={snapshotToolbarSelection}
          />
        </div>

        {(isAIAction || rewriteLoading || aiBusyAction || globalPromptLoading) && (
          <div className="fixed top-0 left-0 right-0 z-50 bg-primary-500 text-white text-xs text-center py-1.5 font-medium flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" size={14} />
            {isAIAction
              ? "正在按大纲流式生成全文…"
              : rewriteLoading || aiBusyAction === "rewrite"
                ? "正在流式改写正文…"
                : aiBusyAction === "continue"
                  ? "正在流式续写…"
                  : aiBusyAction === "expand"
                    ? "正在流式扩写…"
                    : aiBusyAction === "shorten"
                      ? "正在流式缩写…"
                      : globalPromptLoading
                        ? "正在流式智能改写…"
                        : "AI 处理中…"}
          </div>
        )}

      </div>

      <DocumentAiSheet
        open={showDocumentSheet}
        onClose={() => !aiToolbarBusy && setShowDocumentSheet(false)}
        scopeLabel={getScopeLabel()}
        busy={aiToolbarBusy}
        onRun={handleDocumentSheetRun}
        intents={writingIntents}
        writingIntent={writingIntent}
        finishCoherence={finishCoherence}
        insightPass={insightPass}
        briefLoading={briefLoading}
        onIntentChange={(id: WritingIntentId) => setWritingIntent(id)}
        onFinishCoherenceChange={setFinishCoherence}
        onInsightPassChange={setInsightPass}
        onGenerateBrief={() => void handleGenerateBrief()}
      />
      <StyleRewriteSheet
        open={showStyleSheet}
        onClose={() => !rewriteLoading && setShowStyleSheet(false)}
        scopeLabel={getScopeLabel()}
        styles={writingStyles}
        styleId={writingTargetStyle}
        presetIntensity={writingStyleIntensity}
        intensityRange={intensityRange}
        profiles={styleProfiles}
        profileId={customStylePickId || styleProfileId}
        loading={rewriteLoading || aiBusyAction === "rewrite"}
        restoreDisabled={!preStyleContent?.trim() || aiToolbarBusy}
        onStyleChange={handleWritingStyleChange}
        onPresetIntensityChange={handleWritingIntensityChange}
        onProfileSelect={setCustomStylePickId}
        onRestorePlain={() => {
          handleRestorePlain();
          setShowStyleSheet(false);
        }}
        onApplyPreset={() => {
          void handleStyleConvert().finally(() => setShowStyleSheet(false));
        }}
        onApplyProfile={(id, intensity) =>
          void handleCustomStyleApply(id, intensity)
        }
        onSetProjectDefault={saveStyleProfile}
      />
      <AntiAiSheet
        open={showAntiAiSheet}
        onClose={() => setShowAntiAiSheet(false)}
        scopeLabel={getScopeLabel()}
        content={content}
        selectionText={editorSelection?.text}
        styleProfileId={styleProfileId || undefined}
        onApplyFix={(fixed) => {
          const scope = getAiScope();
          applyAiResultToDocument(fixed, scope);
          setShowAntiAiSheet(false);
        }}
      />
      <PlaybookSheet
        open={showPlaybookSheet}
        onClose={() => setShowPlaybookSheet(false)}
        refreshKey={playbookRefreshKey}
      />

      <DraftVersionPanel
        projectId={projectId || ""}
        currentContent={content}
        open={showVersionPanel}
        onClose={() => setShowVersionPanel(false)}
        onRestore={(restored, newContentId) => {
          setContent(restored);
          setContentId(newContentId);
          lastSavedContentRef.current = restored;
          setLastSaved(new Date());
          setShowImportHint(false);
          setShowModeSelector(false);
        }}
      />
      <ShortenModal
        open={showShortenModal}
        loading={shortenLoading}
        content={modalScopeText}
        onClose={() => !shortenLoading && setShowShortenModal(false)}
        onApply={handleShortenApply}
      />
      <ExpandModal
        open={showExpandModal}
        loading={expandLoading}
        content={modalScopeText}
        onClose={() => !expandLoading && setShowExpandModal(false)}
        onApply={handleExpandApply}
      />
    </StepPageFrame>
  );
}
