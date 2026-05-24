"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/store";
import { reviewApi, contentApi, writingApi } from "@/lib/api/client";
import {
  ContentEvalCard,
  CriticCard,
} from "@/components/content/ContentScorePanels";
import type { ContentEvalResult, CriticResult } from "@/types";
import { importContentFromFile, saveDraftContent } from "@/lib/contentFlow";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { useProjectDraft } from "@/lib/hooks/useProjectDraft";
import { getApiError } from "@/lib/apiError";
import { showToast } from "@/components/ui/Toast";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import type { Comment } from "@/types";
import {
  Plus,
  Trash2,
  MessageSquare,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  Send,
  User,
  FileSearch,
  Palette,
  SearchCheck,
  Shield,
  Target,
  BarChart3,
  TrendingUp,
  ArrowRight,
  FolderOpen,
  Clipboard,
} from "lucide-react";
import { clsx } from "clsx";

interface ReviewPass {
  id: string;
  name: string;
  icon: string;
  focus: string;
  order: number;
  description: string;
}

interface ReviewResult {
  passType: string;
  score?: number;
  overall?: string;
  issues?: Array<{
    type: string;
    position: string;
    original: string;
    suggestion: string;
    severity: string;
  }>;
  correctedContent?: string;
  aiTasteScore?: number;
  beforeAfter?: {
    beforeScore: number;
    afterScore: number;
    improvement: string;
  };
}

const passIcons: Record<string, React.ReactNode> = {
  FileSearch: <FileSearch size={24} />,
  Palette: <Palette size={24} />,
  SearchCheck: <SearchCheck size={24} />,
};

const passColors: Record<string, string> = {
  content: "border-blue-200 bg-blue-50",
  style: "border-purple-200 bg-purple-50",
  detail: "border-green-200 bg-green-50",
};

export default function ReviewPage() {
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const {
    projectId,
    content,
    setContent,
    contentId,
    setContentId,
    contentSource,
  } = useProjectDraft();
  const [comments, setComments] = useState<Comment[]>([]);
  const [reviewPasses, setReviewPasses] = useState<ReviewPass[]>([]);
  const [aiClicheDb, setAiClicheDb] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [activePass, setActivePass] = useState<string>("content");
  const [passResults, setPassResults] = useState<Record<string, ReviewResult>>(
    {},
  );
  const [isRunningPass, setIsRunningPass] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [pipelineReport, setPipelineReport] = useState("");
  const [ruleScan, setRuleScan] = useState<any>(null);
  const [evalResult, setEvalResult] = useState<ContentEvalResult | null>(null);
  const [criticResult, setCriticResult] = useState<CriticResult | null>(null);
  const [pipelinePassed, setPipelinePassed] = useState<boolean | null>(null);
  const [isRunningEval, setIsRunningEval] = useState(false);

  const [authenticityResult, setAuthenticityResult] = useState<any>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);

  const [showAddComment, setShowAddComment] = useState(false);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    loadReviewPasses();
    loadComments();
  }, [projectId]);

  async function loadReviewPasses() {
    try {
      const response = await reviewApi.getReviewPasses();
      setReviewPasses(response.data.passes);
      setAiClicheDb(response.data.aiClicheDb);
    } catch (error) {
      console.error("Failed to load review passes:", error);
    }
  }

  async function loadComments() {
    if (!projectId) return;
    try {
      setLoading(true);
      const response = await reviewApi.getComments(projectId);
      setComments(response.data);
    } catch (error) {
      console.error("Failed to load comments:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addComment() {
    if (!newComment.trim() || !projectId) return;
    try {
      await reviewApi.createComment({
        projectId,
        content: newComment,
        author: "我",
      });
      setShowAddComment(false);
      setNewComment("");
      loadComments();
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  }

  async function toggleResolve(commentId: string, resolved: boolean) {
    try {
      await reviewApi.updateComment(commentId, { resolved: !resolved });
      loadComments();
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  }

  async function runSinglePass(passType: string) {
    if (!content.trim()) return;
    setIsRunningPass(true);
    setActivePass(passType);
    try {
      const response = await reviewApi.runReviewPass(content, passType);
      setPassResults((prev) => ({ ...prev, [passType]: response.data }));
    } catch (error) {
      showToast("error", getApiError(error, `审校 ${passType} 失败`));
      console.error(`Review pass ${passType} failed:`, error);
    } finally {
      setIsRunningPass(false);
    }
  }

  async function runAllPasses() {
    if (!content.trim()) return;
    setIsRunningAll(true);
    try {
      const response = await reviewApi.runReviewAll(content);
      setPassResults(response.data.results);
    } catch (error) {
      showToast("error", getApiError(error, "三轮审校失败"));
      console.error("Review all failed:", error);
    } finally {
      setIsRunningAll(false);
    }
  }

  async function runPipeline() {
    if (!content.trim()) return;
    setIsRunningAll(true);
    try {
      const response = await reviewApi.runReviewPipeline(content, {
        title: currentProject?.selectedTitle || currentProject?.title,
        topic: currentProject?.title,
        platform: "wechat",
      });
      setPassResults(response.data.results as Record<string, ReviewResult>);
      setPipelineReport(response.data.reportMarkdown || "");
      setRuleScan(response.data.ruleScan);
      setEvalResult(response.data.eval || null);
      setCriticResult(response.data.critic || null);
      setPipelinePassed(response.data.passed ?? null);
    } catch (error) {
      showToast("error", getApiError(error, "审校流水线失败"));
      console.error("Review pipeline failed:", error);
    } finally {
      setIsRunningAll(false);
    }
  }

  async function runRuleEvalOnly() {
    if (!content.trim()) return;
    setIsRunningEval(true);
    try {
      const [evalResp, scanResp] = await Promise.all([
        contentApi.eval(
          content,
          currentProject?.selectedTitle || currentProject?.title,
        ),
        writingApi.scanAiRules(content),
      ]);
      setEvalResult(evalResp.data as ContentEvalResult);
      setRuleScan(scanResp.data);
    } catch (error) {
      console.error("Rule eval failed:", error);
    } finally {
      setIsRunningEval(false);
    }
  }

  async function checkAuthenticity() {
    if (!content.trim()) return;
    setIsCheckingAuth(true);
    try {
      const response = await reviewApi.checkAuthenticity(content);
      setAuthenticityResult(response.data);
    } catch (error) {
      showToast("error", getApiError(error, "真实性检查失败"));
      console.error("Authenticity check failed:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  }

  async function applyCorrectedContent(result: ReviewResult) {
    if (!result.correctedContent || !projectId) return;
    const before = content;
    setContent(result.correctedContent);
    try {
      const id = await saveDraftContent(
        projectId,
        result.correctedContent,
        contentId,
      );
      setContentId(id);
      if (before.trim() && before !== result.correctedContent) {
        try {
          await contentApi.learnPlaybook({
            before,
            after: result.correctedContent,
            projectId,
            styleProfileId: currentProject?.styleProfileId || undefined,
          });
          showToast("success", "已从审校修改中学习改稿规律");
        } catch {
          /* ignore */
        }
      }
    } catch (error) {
      console.error("Failed to persist corrected content:", error);
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getSeverityColor = (severity: string) => {
    if (severity === "high") return "bg-red-100 text-red-700 border-red-200";
    if (severity === "medium")
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-surface-200/50 text-ink-600 border-surface-300";
  };

  const resolvedCount = comments.filter((c) => c.resolved).length;
  const pendingCount = comments.length - resolvedCount;

  return (
    <StepPageFrame
      wide
      title="修改审核"
      subtitle="内容→风格→细节 · 子步骤审校"
      stepId={stepId}
      actions={
        <>
          {contentSource === "previous" ? (
            <span className="text-[10px] text-accent-600 bg-accent-50 px-1.5 py-0.5 rounded">
              已顺移
            </span>
          ) : null}
          <button
            onClick={async () => {
              const imported = await importContentFromFile();
              if (imported) setContent(imported);
            }}
            className="wen-btn text-xs inline-flex items-center gap-1"
          >
            <FolderOpen size={12} className="text-ink-500" />
            导入
          </button>
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text.trim()) setContent(text);
              } catch {}
            }}
            className="wen-btn text-xs inline-flex items-center gap-1"
          >
            <Clipboard size={12} className="text-ink-500" />
            粘贴
          </button>
          <button
            onClick={() => setShowAddComment(true)}
            className="wen-btn-seal text-xs"
          >
            <Plus size={12} /> 评论
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
        {reviewPasses.map((pass) => {
          const result = passResults[pass.id];
          const isActive = activePass === pass.id;
          return (
            <button
              key={pass.id}
              onClick={() => {
                setActivePass(pass.id);
                if (!result && !isRunningPass) runSinglePass(pass.id);
              }}
              className={clsx(
                "text-left p-5 border-2 transition-all",
                result
                  ? "border-green-300 bg-green-50"
                  : isActive
                    ? "border-primary-400 bg-primary-50"
                    : "border-surface-300 hover:border-surface-300 bg-surface-100",
              )}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={clsx(
                    "p-2.5 ",
                    pass.id === "content"
                      ? "bg-blue-100 text-blue-600"
                      : pass.id === "style"
                        ? "bg-purple-100 text-purple-600"
                        : "bg-green-100 text-green-600",
                  )}
                >
                  {passIcons[pass.icon]}
                </div>
                <div>
                  <h3 className="wen-title text-ink-900">
                    第{pass.order}遍：{pass.name}
                  </h3>
                  {(() => {
                    const displayScore = result?.score ?? result?.aiTasteScore;
                    return displayScore !== undefined ? (
                      <span
                        className={clsx(
                          "text-sm font-bold",
                          getScoreColor(displayScore),
                        )}
                      >
                        评分 {displayScore}/100
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
              <p className="text-sm text-ink-600">{pass.focus}</p>
              <p className="text-xs text-ink-400 mt-1">{pass.description}</p>
              {isRunningPass && isActive && (
                <Loader2 className="animate-spin mt-2" size={16} />
              )}
            </button>
          );
        })}
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={runPipeline}
          disabled={isRunningAll || !content.trim()}
          className="wen-btn-seal disabled:opacity-50"
        >
          {isRunningAll ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Sparkles size={16} />
          )}
          一键审校流水线
        </button>
        <button
          onClick={runAllPasses}
          disabled={isRunningAll || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-surface-300 hover:bg-surface-200/30 disabled:opacity-50 text-sm"
        >
          仅 LLM 三轮
        </button>
        <button
          onClick={runRuleEvalOnly}
          disabled={isRunningEval || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 disabled:opacity-50 text-sm"
        >
          {isRunningEval ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <BarChart3 size={16} />
          )}
          规则量表评估
        </button>
        <button
          onClick={checkAuthenticity}
          disabled={isCheckingAuth || !content.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50"
        >
          {isCheckingAuth ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <Shield size={16} />
          )}
          5维真实性检查
        </button>
      </div>

      {(ruleScan || pipelineReport || evalResult || criticResult) && (
        <div className="mb-6 space-y-4">
          {pipelinePassed !== null && (
            <div
              className={clsx(
                "p-3 text-sm font-medium text-center",
                pipelinePassed
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800",
              )}
            >
              流水线综合结论：
              {pipelinePassed
                ? "✅ 通过（规则 + 量表 + Critic）"
                : "⚠️ 未完全通过，请按下方建议修改"}
            </div>
          )}
          {ruleScan && (
            <p className="text-sm p-3 bg-purple-50 border border-purple-200 ">
              规则扫描: {ruleScan.score}/100 —{" "}
              {ruleScan.passed ? "✅ 通过" : "⚠️ 需优化"}（{ruleScan.matchCount}{" "}
              处）
              {ruleScan.gateStatus && ` · 门禁 ${ruleScan.gateStatus}`}
            </p>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {evalResult && <ContentEvalCard evalResult={evalResult} />}
            {criticResult && <CriticCard critic={criticResult} />}
          </div>
          {pipelineReport && (
            <details className="p-4 bg-surface-200/30 border ">
              <summary className="text-sm font-medium cursor-pointer text-ink-700">
                完整 Markdown 报告
              </summary>
              <pre className="text-xs whitespace-pre-wrap max-h-40 overflow-y-auto text-ink-700 mt-2">
                {pipelineReport}
              </pre>
            </details>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {passResults[activePass] && (
            <div
              className={clsx(
                " border-2 p-6",
                passColors[activePass] || "border-surface-300 bg-surface-100",
              )}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="wen-title text-ink-900 flex items-center gap-2">
                  {reviewPasses.find((p) => p.id === activePass)?.name} 结果
                </h3>
                {(() => {
                  const displayScore =
                    passResults[activePass].score ??
                    passResults[activePass].aiTasteScore;
                  return displayScore !== undefined ? (
                    <span
                      className={clsx(
                        "text-2xl font-bold",
                        getScoreColor(displayScore),
                      )}
                    >
                      {displayScore}/100
                    </span>
                  ) : null;
                })()}
              </div>

              {passResults[activePass].overall && (
                <p className="text-ink-700 mb-4">
                  {passResults[activePass].overall}
                </p>
              )}

              {passResults[activePass].aiTasteScore !== undefined && (
                <div className="mb-4 p-3 wen-panel-padded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">AI 味评分</span>
                    <span className="font-bold text-lg">
                      {passResults[activePass].aiTasteScore}/100
                    </span>
                  </div>
                  {passResults[activePass].beforeAfter && (
                    <div className="flex items-center gap-2 text-sm text-ink-500">
                      <span>
                        修改前:{" "}
                        {passResults[activePass].beforeAfter.beforeScore}
                      </span>
                      <ArrowRight size={14} />
                      <span className="text-green-600 font-medium">
                        修改后: {passResults[activePass].beforeAfter.afterScore}
                      </span>
                      <span className="text-xs">
                        ({passResults[activePass].beforeAfter.improvement})
                      </span>
                    </div>
                  )}
                </div>
              )}

              {passResults[activePass].issues &&
                passResults[activePass].issues!.length > 0 && (
                  <div className="space-y-3 mb-4">
                    <h4 className="wen-title text-ink-700">
                      发现问题 ({passResults[activePass].issues!.length})
                    </h4>
                    {passResults[activePass].issues!.map((issue, idx) => (
                      <div key={idx} className="bg-surface-100 p-3 border">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded text-xs font-medium border",
                              getSeverityColor(issue.severity),
                            )}
                          >
                            {issue.severity === "high"
                              ? "高"
                              : issue.severity === "medium"
                                ? "中"
                                : "低"}
                          </span>
                          <span className="text-xs text-ink-500">
                            {issue.type}
                          </span>
                          <span className="text-xs text-ink-400 ml-auto">
                            {issue.position}
                          </span>
                        </div>
                        <p className="text-sm text-ink-500 line-through mb-1">
                          {issue.original?.slice(0, 120)}
                          {(issue.original?.length || 0) > 120 ? "..." : ""}
                        </p>
                        <p className="text-sm text-green-700">
                          {issue.suggestion}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

              {passResults[activePass].correctedContent && (
                <button
                  onClick={() => applyCorrectedContent(passResults[activePass])}
                  className="wen-btn-seal w-full justify-center py-2"
                >
                  应用修改后的全文
                </button>
              )}
            </div>
          )}

          {authenticityResult && (
            <div className="wen-panel-padded border border-accent-200 p-6">
              <h3 className="wen-title text-ink-900 mb-4 flex items-center gap-2">
                <Shield size={20} className="text-accent-500" />{" "}
                5维真实性检查报告
              </h3>

              <div className="flex items-center gap-4 mb-6">
                <div className="text-center">
                  <span
                    className={clsx(
                      "inline-flex items-center justify-center w-20 h-20 text-2xl font-bold",
                      authenticityResult.overallScore >= 8
                        ? "bg-green-100 text-green-600"
                        : authenticityResult.overallScore >= 5
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-red-100 text-red-600",
                    )}
                  >
                    {authenticityResult.overallScore}/10
                  </span>
                  <p className="mt-1 text-xs text-ink-500">综合评分</p>
                </div>
                <div className="text-center">
                  <span
                    className={clsx(
                      "inline-flex items-center justify-center w-20 h-20 text-2xl font-bold",
                      authenticityResult.estimatedAiRate < 20
                        ? "bg-green-100 text-green-600"
                        : authenticityResult.estimatedAiRate < 40
                          ? "bg-yellow-100 text-yellow-600"
                          : "bg-red-100 text-red-600",
                    )}
                  >
                    {authenticityResult.estimatedAiRate}%
                  </span>
                  <p className="mt-1 text-xs text-ink-500">预估AI检测率</p>
                </div>
                <p className="text-sm text-ink-600 flex-1">
                  {authenticityResult.overallImpression}
                </p>
              </div>

              {authenticityResult.dimensions && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {Object.entries(authenticityResult.dimensions).map(
                    ([key, dim]: [string, any]) => (
                      <div key={key} className="p-3 bg-surface-200/30 ">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-ink-700">
                            {key === "temperature"
                              ? "🌡️ 温度"
                              : key === "personality"
                                ? "👤 个性"
                                : key === "locale"
                                  ? "📍 地域性"
                                  : key === "detail"
                                    ? "🔍 真实细节"
                                    : key === "depth"
                                      ? "🧠 思想深度"
                                      : key}
                          </span>
                          <span
                            className={clsx(
                              "font-bold",
                              getScoreColor(dim.score * 10),
                            )}
                          >
                            {dim.score}/10
                          </span>
                        </div>
                        <p className="text-xs text-ink-500">{dim.finding}</p>
                      </div>
                    ),
                  )}
                </div>
              )}

              {authenticityResult.aiFlavorIssues?.length > 0 && (
                <div className="mb-4">
                  <h4 className="wen-title text-ink-900 mb-2">AI 痕迹问题</h4>
                  {authenticityResult.aiFlavorIssues.map(
                    (issue: any, i: number) => (
                      <div
                        key={i}
                        className="text-sm p-2 bg-accent-50 rounded mb-1"
                      >
                        <span className="text-accent-700 mr-2">
                          [{issue.issueType}]
                        </span>
                        <span className="text-ink-600 line-through">
                          "{issue.original}"
                        </span>
                        <span className="text-green-600 ml-2">
                          → {issue.suggestion}
                        </span>
                      </div>
                    ),
                  )}
                </div>
              )}

              {authenticityResult.fixPriority && (
                <div className="space-y-2">
                  {authenticityResult.fixPriority.high?.length > 0 && (
                    <div className="p-3 bg-red-50 ">
                      <h5 className="wen-title text-red-700 mb-1">
                        🔴 高优先级（必须改）
                      </h5>
                      {authenticityResult.fixPriority.high.map(
                        (item: any, i: number) => (
                          <p key={i} className="text-sm text-red-600">
                            • {item.item}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                  {authenticityResult.fixPriority.medium?.length > 0 && (
                    <div className="p-3 bg-yellow-50 ">
                      <h5 className="wen-title text-yellow-700 mb-1">
                        🟡 中优先级
                      </h5>
                      {authenticityResult.fixPriority.medium.map(
                        (item: any, i: number) => (
                          <p key={i} className="text-sm text-yellow-600">
                            • {item.item}
                          </p>
                        ),
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {aiClicheDb && (
            <div className="wen-panel-padded p-6">
              <h4 className="wen-title text-ink-900 mb-3">
                AI 套话库（审校参考）
              </h4>
              <div className="space-y-2">
                {Object.entries(aiClicheDb).map(
                  ([category, words]: [string, any]) => (
                    <div key={category} className="text-sm">
                      <span className="text-xs font-medium text-ink-500 uppercase">
                        {category}:{" "}
                      </span>
                      <span className="text-ink-600">{words.join(", ")}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="wen-panel-padded overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <span className="text-sm text-ink-600">评论列表</span>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-accent-600">
                  <AlertCircle size={14} className="inline" /> 待处理{" "}
                  {pendingCount}
                </span>
                <span className="text-green-600">
                  <CheckCircle2 size={14} className="inline" /> 已解决{" "}
                  {resolvedCount}
                </span>
              </div>
            </div>

            {comments.length === 0 ? (
              <div className="p-8 text-center text-ink-400">
                <MessageSquare size={40} className="mx-auto mb-2" />
                <p>暂无评论</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {comments.map((comment) => (
                  <div
                    key={comment._id}
                    className={clsx("p-3", comment.resolved && "opacity-50")}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-ink-400" />
                        <span className="text-sm font-medium">
                          {comment.author}
                        </span>
                      </div>
                      <button
                        onClick={() =>
                          toggleResolve(comment._id, comment.resolved)
                        }
                        className={
                          comment.resolved
                            ? "text-green-500"
                            : "text-ink-300 hover:text-green-500"
                        }
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    </div>
                    <p className="text-sm text-ink-700">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="wen-panel-padded p-6">
            <h3 className="wen-title text-ink-900 mb-4">审校进度</h3>
            {reviewPasses.map((pass) => (
              <div
                key={pass.id}
                className="flex items-center gap-2 mb-2 text-sm"
              >
                <span
                  className={
                    passResults[pass.id] ? "text-green-500" : "text-ink-300"
                  }
                >
                  {passResults[pass.id] ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <AlertCircle size={14} />
                  )}
                </span>
                <span
                  className={
                    passResults[pass.id] ? "text-ink-700" : "text-ink-400"
                  }
                >
                  第{pass.order}遍：{pass.name}
                </span>
                {passResults[pass.id]?.score !== undefined && (
                  <span
                    className={clsx(
                      "ml-auto text-xs font-bold",
                      getScoreColor(passResults[pass.id].score!),
                    )}
                  >
                    {passResults[pass.id].score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddComment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-100 max-w-lg w-full p-6">
            <h2 className="wen-title text-ink-900 mb-4">添加评论</h2>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="输入评论内容..."
              rows={4}
              className="w-full px-4 py-2 border border-surface-300 focus:ring-2 focus:ring-primary-500 outline-none resize-none"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddComment(false)}
                className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 "
              >
                取消
              </button>
              <button
                onClick={addComment}
                disabled={!newComment.trim()}
                className="wen-btn-seal disabled:opacity-50"
              >
                <Send size={16} /> 发送
              </button>
            </div>
          </div>
        </div>
      )}
    </StepPageFrame>
  );
}
