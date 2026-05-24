"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  writingApi,
  projectsApi,
  styleApi,
  contentApi,
} from "@/lib/api/client";
import { showToast } from "@/components/ui/Toast";
import { AntiAiPanel } from "@/components/writing/AntiAiPanel";
import {
  GlobalPromptModal,
  ShortenModal,
} from "@/components/writing/WritingAssistModals";
import { PlaybookPanel } from "@/components/writing/PlaybookPanel";
import { DraftVersionPanel } from "@/components/writing/DraftVersionPanel";
import {
  MarkdownEditor,
  type MarkdownEditorHandle,
} from "@/components/ui/MarkdownEditor";
import { isTauri, saveFile, writeToWorkspace, openFile } from "@/lib/platform";
import { importContentFromFile, saveDraftContent, loadDraftForStep, getDraftContent, getProjectOutlineMarkdown } from "@/lib/contentFlow";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectDraft } from "@/lib/hooks/useProjectDraft";
import { getApiError } from "@/lib/apiError";
import { countArticleWords } from "@/lib/textUtils";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import {
  Sparkles,
  Loader2,
  MessageSquare,
  Wand2,
  RefreshCw,
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
  Scan,
  BookOpen,
  ArrowDownWideNarrow,
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

const writingStyles = [
  { id: "professional", label: "正式专业", description: "适合商务和专业文章" },
  { id: "casual", label: "轻松随意", description: "适合博客和社交媒体" },
  { id: "conversational", label: "对话式", description: "像和朋友聊天一样" },
  { id: "academic", label: "学术严谨", description: "适合论文和研究报告" },
  { id: "poetic", label: "诗意优美", description: "富有文学性" },
  { id: "humorous", label: "幽默风趣", description: "轻松活泼" },
];

export default function WritingPage() {
  const params = useParams();
  const { currentProject, workspace } = useAppStore();
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

  const [selectedStyle, setSelectedStyle] = useState("professional");
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);

  const [aiResult, setAiResult] = useState<{
    action: string;
    original: string;
    result: string;
    showCompare: boolean;
  } | null>(null);

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
  const [styleProfiles, setStyleProfiles] = useState<
    Array<{ _id: string; name: string }>
  >([]);
  const [styleProfileId, setStyleProfileId] = useState<string>("");
  const [playbookRefreshKey, setPlaybookRefreshKey] = useState(0);
  const [rightPanel, setRightPanel] = useState<"playbook" | "antiAi" | null>(
    null,
  );
  const [aiBusyAction, setAiBusyAction] = useState<string | null>(null);
  const [showGlobalPrompt, setShowGlobalPrompt] = useState(false);
  const [showShortenModal, setShowShortenModal] = useState(false);
  const [globalPromptLoading, setGlobalPromptLoading] = useState(false);
  const [shortenLoading, setShortenLoading] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [serverDraftPreview, setServerDraftPreview] = useState<string | null>(null);
  const [versionCount, setVersionCount] = useState(0);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

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

  function toggleRightPanel(panel: "playbook" | "antiAi") {
    setRightPanel((prev) => (prev === panel ? null : panel));
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
    styleApi
      .list()
      .then((r) => setStyleProfiles(r.data || []))
      .catch(() => {});
    if (currentProject?.styleProfileId)
      setStyleProfileId(currentProject.styleProfileId);
  }, [params.id]);

  async function saveStyleProfile(id: string) {
    setStyleProfileId(id);
    if (currentProject) {
      await projectsApi.update(currentProject._id, {
        styleProfileId: id || null,
      });
    }
  }

  async function handleFastDraft() {
    if (!params.id || !projectId) return;

    let sectionCount = 0;
    try {
      const outlineState = await writingApi.getSectionDraft(projectId);
      sectionCount = outlineState.data.sections?.length ?? 0;
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

    setIsAIAction(true);
    try {
      const resp = await writingApi.fastDraft({
        projectId: params.id as string,
        styleProfileId: styleProfileId || undefined,
      });
      setContent(resp.data.content);
      lastSavedContentRef.current = resp.data.content;
      prevEditorContentRef.current = resp.data.content;
      setShowModeSelector(false);
      const missing = resp.data.missingSections ?? [];
      if (missing.length > 0) {
        showToast(
          "error",
          `已生成，但有 ${missing.length} 个章节标题未出现在正文中，请检查或逐节重写`,
        );
      } else {
        showToast(
          "success",
          `已按大纲生成 ${resp.data.sectionCount} 节，约 ${countArticleWords(resp.data.content)} 字`,
        );
      }
    } catch (error: unknown) {
      showToast("error", getApiError(error, "按大纲生成失败"));
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

    setIsAIAction(true);
    try {
      const response = await writingApi.frameworkGenerate({
        projectId,
        outline: frameworkOutline.trim() || undefined,
        styleProfileId: styleProfileId || undefined,
      });
      setContent(response.data.content);
      lastSavedContentRef.current = response.data.content;
      prevEditorContentRef.current = response.data.content;
      setShowFrameworkInput(false);
      const missing = response.data.missingSections ?? [];
      if (missing.length > 0) {
        showToast(
          "error",
          `已生成，但有 ${missing.length} 个章节未出现在正文中，请检查`,
        );
      } else {
        showToast(
          "success",
          `已按项目大纲生成，约 ${countArticleWords(response.data.content)} 字`,
        );
      }
    } catch (error: unknown) {
      showToast("error", getApiError(error, "按大纲生成失败"));
    } finally {
      setIsAIAction(false);
    }
  }

  async function handleAIAction(action: string, selection?: string) {
    if (action === "shorten" && !selection?.trim()) {
      setShowShortenModal(true);
      return;
    }
    const useCompare = Boolean(selection?.trim());
    const originalText = selection?.trim() || "";
    const currentContent = contentRef.current;
    setAiBusyAction(action);
    setIsAIAction(true);
    try {
      const textToProcess = selection?.trim() || currentContent;
      if (!textToProcess.trim()) {
        showToast("error", "请先输入或选中要处理的内容");
        return;
      }

      switch (action) {
        case "continue": {
          const resp = await writingApi.continue(
            currentContent,
            undefined,
            styleProfileId || undefined,
          );
          const addition = resp.data.continuation?.trim();
          if (!addition) {
            showToast("error", "续写结果为空，请重试");
            return;
          }
          setContent((prev) => prev + addition);
          showToast("success", "续写完成");
          break;
        }
        case "polish": {
          const resp = await writingApi.polish(
            textToProcess,
            selectedStyle,
            styleProfileId || undefined,
          );
          const resultText = resp.data.polishedContent?.trim();
          if (!resultText) {
            showToast("error", "润色结果为空，请重试");
            return;
          }
          if (useCompare) {
            setAiResult({
              action,
              original: originalText,
              result: resultText,
              showCompare: true,
            });
          } else {
            setContent(resultText);
            showToast("success", "润色完成（已自动去 AI 味）");
          }
          break;
        }
        case "expand": {
          const resp = await writingApi.expand(
            textToProcess,
            500,
            styleProfileId || undefined,
          );
          const resultText = resp.data.expandedContent?.trim();
          if (!resultText) {
            showToast("error", "扩写结果为空，请重试");
            return;
          }
          if (useCompare) {
            setAiResult({
              action,
              original: originalText,
              result: resultText,
              showCompare: true,
            });
          } else {
            setContent(resultText);
            showToast("success", "扩写完成（已自动去 AI 味）");
          }
          break;
        }
        case "rewrite": {
          const resp = await writingApi.rewrite(textToProcess, selectedStyle);
          const resultText = resp.data.rewrittenContent?.trim();
          if (!resultText) {
            showToast("error", "风格转换结果为空，请重试");
            return;
          }
          if (useCompare) {
            setAiResult({
              action,
              original: originalText,
              result: resultText,
              showCompare: true,
            });
          } else {
            setContent(resultText);
            showToast("success", "风格转换完成（已自动去 AI 味）");
          }
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
      setIsAIAction(false);
      setAiBusyAction(null);
    }
  }

  function applyAIResult() {
    if (!aiResult) return;
    setContent((prev) => prev.replace(aiResult.original, aiResult.result));
    setAiResult(null);
  }

  async function handleApplyGlobalPrompt(instruction: string) {
    if (!content.trim()) {
      showToast("error", "请先输入文章内容");
      return;
    }
    setGlobalPromptLoading(true);
    setIsAIAction(true);
    try {
      const resp = await writingApi.applyPrompt(
        content,
        instruction,
        styleProfileId || undefined,
      );
      const resultText = resp.data.content?.trim();
      if (!resultText) {
        showToast("error", "改稿结果为空，请重试");
        return;
      }
      setContent(resultText);
      setShowGlobalPrompt(false);
      showToast("success", "已按整体提示词改稿");
    } catch (error: unknown) {
      showToast("error", getApiError(error, "整体改稿失败"));
    } finally {
      setGlobalPromptLoading(false);
      setIsAIAction(false);
    }
  }

  async function handleShortenApply(targetWordCount: number) {
    const currentContent = contentRef.current;
    if (!currentContent.trim()) {
      showToast("error", "请先输入文章内容");
      return;
    }
    setShortenLoading(true);
    setIsAIAction(true);
    setAiBusyAction("shorten");
    try {
      const resp = await writingApi.shorten(currentContent, {
        targetWordCount,
        sourceWordCount: countArticleWords(currentContent),
        styleProfileId: styleProfileId || undefined,
      });
      const resultText = resp.data.shortenedContent?.trim();
      if (!resultText) {
        showToast("error", "缩写结果为空，请重试");
        return;
      }
      setContent(resultText);
      setShowShortenModal(false);
      const target = resp.data.targetWordCount ?? targetWordCount;
      showToast("success", `缩写完成，目标约 ${target} 字`);
    } catch (error: unknown) {
      showToast("error", getApiError(error, "缩写失败"));
    } finally {
      setShortenLoading(false);
      setIsAIAction(false);
      setAiBusyAction(null);
    }
  }

  const aiBtnClass = (action: string) =>
    clsx(
      "wen-btn",
      aiBusyAction === action &&
        "wen-btn-active border-primary-400 text-primary-700",
    );

  const subtitleParts: string[] = [];
  if (contentSource === "previous") subtitleParts.push("已顺移");
  if (lastSaved)
    subtitleParts.push(`已保存 ${lastSaved.toLocaleTimeString("zh-CN")}`);
  const frameSubtitle =
    subtitleParts.length > 0 ? subtitleParts.join(" · ") : undefined;

  return (
    <StepPageFrame
      title="写出草稿"
      subtitle={frameSubtitle}
      stepId={stepId}
      fullWidth
      actions={
        <>
          <button
            type="button"
            onClick={async () => {
              const imported = await importContentFromFile();
              if (imported) {
                setContent(imported);
                setContentSource("saved");
                setShowImportHint(false);
              }
            }}
            className="wen-btn"
          >
            <FolderOpen size={12} strokeWidth={1.5} className="text-ink-400" />
            导入
          </button>
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="wen-btn"
          >
            <Clipboard size={12} strokeWidth={1.5} className="text-ink-400" />
            粘贴
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowStyleDropdown(!showStyleDropdown)}
              className="wen-btn"
            >
              <Wand2 size={12} strokeWidth={1.5} className="text-ink-400" />
              {writingStyles.find((s) => s.id === selectedStyle)?.label}
              <ChevronDown size={12} className="text-ink-300" />
            </button>
            {showStyleDropdown && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-surface-100 border border-surface-300 py-1 z-10">
                {writingStyles.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => {
                      setSelectedStyle(style.id);
                      setShowStyleDropdown(false);
                    }}
                    className={clsx(
                      "w-full text-left px-3 py-1.5 text-xs hover:bg-surface-200/60",
                      selectedStyle === style.id &&
                        "text-primary-600 font-kaiti",
                    )}
                  >
                    <p>{style.label}</p>
                    <p className="text-[10px] text-ink-400">
                      {style.description}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowGlobalPrompt(true)}
            disabled={!content.trim() || globalPromptLoading || !!aiBusyAction}
            className="wen-btn"
          >
            {globalPromptLoading ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <MessageSquare size={12} className="text-ink-400" />
            )}
            整体提示词
          </button>
          <button
            type="button"
            onClick={() => toggleRightPanel("playbook")}
            className={clsx(
              "wen-btn",
              rightPanel === "playbook" && "wen-btn-active",
            )}
          >
            <BookOpen size={12} strokeWidth={1.5} />
            Playbook
          </button>
          <button
            type="button"
            onClick={() => toggleRightPanel("antiAi")}
            className={clsx(
              "wen-btn",
              rightPanel === "antiAi" && "wen-btn-active",
            )}
          >
            <Scan size={12} strokeWidth={1.5} />
            去AI味
          </button>
          <button
            type="button"
            onClick={() => handleAIAction("continue")}
            disabled={!content.trim() || !!aiBusyAction}
            className={aiBtnClass("continue")}
          >
            {aiBusyAction === "continue" ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <Sparkles size={12} className="text-primary-500" />
            )}
            续写
          </button>
          <button
            type="button"
            onClick={() => handleAIAction("polish")}
            disabled={!content.trim() || !!aiBusyAction}
            className={aiBtnClass("polish")}
          >
            {aiBusyAction === "polish" ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <Sparkles size={12} className="text-purple-500" />
            )}
            润色
          </button>
          <button
            type="button"
            onClick={() => handleAIAction("expand")}
            disabled={!content.trim() || !!aiBusyAction}
            className={aiBtnClass("expand")}
          >
            {aiBusyAction === "expand" ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <RefreshCw size={12} className="text-green-500" />
            )}
            扩写
          </button>
          <button
            type="button"
            onClick={() => setShowShortenModal(true)}
            disabled={!content.trim() || shortenLoading || !!aiBusyAction}
            className={aiBtnClass("shorten")}
          >
            {shortenLoading || aiBusyAction === "shorten" ? (
              <Loader2 className="animate-spin" size={12} />
            ) : (
              <ArrowDownWideNarrow size={12} className="text-accent-600" />
            )}
            缩写
          </button>
          <button
            type="button"
            onClick={() => setShowVersionPanel(true)}
            className="wen-btn"
          >
            <History size={12} strokeWidth={1.5} className="text-ink-400" />
            版本
          </button>
          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving || !content.trim()}
            className="wen-btn-seal"
          >
            {isSaving ? <Loader2 className="animate-spin" size={12} /> : null}
            {isSaving ? "保存中" : "保存"}
          </button>
          <button
            type="button"
            onClick={handleSaveAs}
            disabled={isSaving || !content.trim()}
            className="wen-btn"
          >
            <Download size={12} strokeWidth={1.5} className="text-ink-400" />
            另存
          </button>
        </>
      }
    >
      {showModeSelector && (
        <div className="wen-panel-padded p-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="wen-title text-ink-900 mb-2">
              选择写作模式
            </h2>
            <p className="text-ink-500">根据文章类型选择最适合的AI辅助模式</p>
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

      {!showModeSelector && selectedMode && (
        <div className="wen-panel-padded p-3 mb-4 flex items-center gap-2 text-sm">
          <span className="text-ink-500">当前模式：</span>
          <span
            className={clsx(
              "inline-flex items-center gap-1.5 px-2.5 py-1 font-medium",
              selectedMode === "coach"
                ? "bg-purple-100 text-purple-700"
                : selectedMode === "fast"
                  ? "bg-blue-100 text-blue-700"
                  : selectedMode === "mixed"
                    ? "bg-green-100 text-green-700"
                    : "bg-accent-100 text-accent-700",
            )}
          >
            {modes.find((m) => m.id === selectedMode)?.name || selectedMode}
          </span>
          <button
            onClick={() => setShowModeSelector(true)}
            className="text-primary-500 hover:underline ml-auto"
          >
            切换模式
          </button>
        </div>
      )}

      {!showModeSelector && selectedMode === "fast" && (
        <div className="mb-4">
          <button
            onClick={handleFastDraft}
            disabled={isAIAction}
            className="w-full py-2 bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            按大纲快速生成全文初稿
          </button>
        </div>
      )}

      {!showModeSelector &&
        (selectedMode === "mixed" || selectedMode === "fast") &&
        params.id && (
          <div className="mb-4">
            <SectionWriterPanel
              projectId={params.id as string}
              draftContent={content}
              styleProfileId={styleProfileId || undefined}
              onAppend={(text) =>
                setContent((prev) => (prev ? prev + "\n\n" : "") + text)
              }
            />
          </div>
        )}

      {!showModeSelector && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs text-ink-500">风格画像:</label>
          <select
            value={styleProfileId}
            onChange={(e) => saveStyleProfile(e.target.value)}
            className="text-xs border px-2 py-1 flex-1 max-w-xs"
          >
            <option value="">无（默认）</option>
            {styleProfiles.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
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
              className="px-4 py-2 bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50"
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
                  className="px-4 py-2 bg-purple-500 text-white hover:bg-purple-600"
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
                  className="px-4 py-2 bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
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
                  className="px-4 py-2 bg-green-500 text-white hover:bg-green-600"
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
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-sm"
                >
                  <RotateCcw size={16} />
                  恢复已保存草稿
                </button>
              ) : null}
              {versionCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setShowVersionPanel(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white hover:bg-primary-700 text-sm"
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

        <div
          className={clsx(
            "gap-4",
            rightPanel
              ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px]"
              : "",
          )}
        >
          <div className="min-w-0">
            <MarkdownEditor
              ref={editorRef}
              value={content}
              onChange={setContent}
              onSave={handleSave}
              isSaving={isSaving}
              onAIAction={handleAIAction}
              aiBusyAction={aiBusyAction}
              minHeight={rightPanel ? "calc(100vh - 12rem)" : "calc(100vh - 10rem)"}
              placeholder="开始撰写您的文章..."
            />
          </div>
          {rightPanel && (
            <aside className="lg:sticky lg:top-4 lg:self-start max-h-[calc(100vh-10rem)] overflow-y-auto">
              {rightPanel === "playbook" && (
                <PlaybookPanel refreshKey={playbookRefreshKey} />
              )}
              {rightPanel === "antiAi" && (
                <AntiAiPanel
                  content={content}
                  onApplyFix={(fixed) => setContent(fixed)}
                  styleProfileId={styleProfileId || undefined}
                  active={rightPanel === "antiAi"}
                />
              )}
            </aside>
          )}
        </div>

        {isAIAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-surface-100 p-8 text-center">
              <Loader2 className="animate-spin h-12 w-12 text-primary-500 mx-auto mb-4" />
              <p className="text-ink-700 font-medium">AI 正在处理...</p>
            </div>
          </div>
        )}

        {aiResult && aiResult.showCompare && (
          <div className="wen-panel-padded p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="wen-title text-ink-900 flex items-center gap-2">
                <MessageSquare size={20} className="text-primary-500" /> AI
                处理结果
              </h3>
              <button
                onClick={() => setAiResult(null)}
                className="text-ink-400 hover:text-ink-600"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="wen-title mb-2">原文</h4>
                <div className="bg-surface-200/30 p-4 text-sm whitespace-pre-wrap">
                  {aiResult.original}
                </div>
              </div>
              <div>
                <h4 className="wen-title mb-2">AI 修改后</h4>
                <div className="bg-primary-50 p-4 text-sm whitespace-pre-wrap border border-primary-200">
                  {aiResult.result || "处理中..."}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setAiResult(null)}
                className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 "
              >
                取消
              </button>
              <button onClick={applyAIResult} className="wen-btn-seal">
                <Check size={16} /> 应用修改
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => handleAIAction("rewrite")}
          disabled={!content.trim() || !!aiBusyAction}
          className="inline-flex items-center gap-2 px-4 py-2 border border-surface-300 text-sm hover:bg-surface-200/30 disabled:opacity-50"
        >
          {aiBusyAction === "rewrite" ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Wand2 size={16} className="text-accent-500" />
          )}
          风格转换
        </button>
        <button
          type="button"
          onClick={() => setShowShortenModal(true)}
          disabled={!content.trim() || shortenLoading || !!aiBusyAction}
          className="inline-flex items-center gap-2 px-4 py-2 border border-surface-300 text-sm hover:bg-surface-200/30 disabled:opacity-50"
        >
          {shortenLoading || aiBusyAction === "shorten" ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <ArrowDownWideNarrow size={16} className="text-accent-600" />
          )}
          缩写
        </button>
      </div>

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
      <GlobalPromptModal
        open={showGlobalPrompt}
        loading={globalPromptLoading}
        onClose={() => !globalPromptLoading && setShowGlobalPrompt(false)}
        onApply={handleApplyGlobalPrompt}
      />
      <ShortenModal
        open={showShortenModal}
        loading={shortenLoading}
        content={contentRef.current || content}
        onClose={() => !shortenLoading && setShowShortenModal(false)}
        onApply={handleShortenApply}
      />
    </StepPageFrame>
  );
}
