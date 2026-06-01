"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAppStore } from "@/lib/store";
import {
  projectsApi,
  writingApi,
  researchApi,
  reviewApi,
  contentApi,
} from "@/lib/api/client";
import { getDraftContent } from "@/lib/contentFlow";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Download,
  Sparkles,
} from "lucide-react";
import {
  ContentEvalCard,
  CriticCard,
} from "@/components/content/ContentScorePanels";
import type { ContentEvalResult, CriticResult } from "@/types";
import { clsx } from "clsx";

interface CheckItem {
  id: string;
  label: string;
  done: boolean;
  detail?: string;
}

const VARIANT_LABELS: Record<string, string> = {
  wechat: "公众号",
  xiaohongshu: "小红书",
  voice: "口播稿",
};

export default function PublishPage() {
  const params = useParams();
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportMd, setReportMd] = useState("");
  const [deriving, setDeriving] = useState(false);
  const [variants, setVariants] = useState<Record<string, string> | null>(null);
  const [exporting, setExporting] = useState(false);
  const [gateBlocked, setGateBlocked] = useState(false);
  const [evalResult, setEvalResult] = useState<ContentEvalResult | null>(null);
  const [criticResult, setCriticResult] = useState<CriticResult | null>(null);
  const [pipelinePassed, setPipelinePassed] = useState<boolean | null>(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    runChecks();
  }, [params.id]);

  async function runChecks() {
    if (!params.id) return;
    setLoading(true);
    const items: CheckItem[] = [];

    const hasTitle = Boolean(
      currentProject?.selectedTitle || currentProject?.title,
    );
    items.push({
      id: "title",
      label: "已选定标题",
      done: hasTitle,
      detail: currentProject?.selectedTitle || currentProject?.title,
    });

    const draft = await getDraftContent(params.id as string);
    items.push({
      id: "draft",
      label: "草稿已完成",
      done: draft.length > 200,
      detail: `${draft.length} 字`,
    });

    try {
      const scan = await writingApi.scanAiRules(draft || " ");
      items.push({
        id: "aitaste",
        label: `AI 味 < ${scan.data.targetScore}`,
        done: scan.data.passed,
        detail: `当前 ${scan.data.score}/100${scan.data.gateStatus ? ` · 门禁 ${scan.data.gateStatus}` : ""}`,
      });
    } catch {
      items.push({ id: "aitaste", label: "AI 味检测", done: false });
    }

    try {
      const gate = await contentApi.gateCheck({
        projectId: params.id as string,
      });
      items.push({
        id: "gate",
        label: "发布门禁",
        done: gate.data.allowed,
        detail: gate.data.message,
      });
      setGateBlocked(!gate.data.allowed);
    } catch {
      items.push({ id: "gate", label: "发布门禁", done: false });
    }

    try {
      const ev = await contentApi.eval(
        draft || " ",
        currentProject?.selectedTitle || currentProject?.title,
      );
      items.push({
        id: "eval",
        label: `内容评分 ≥ 75`,
        done: ev.data.passed,
        detail: `${ev.data.totalScore}/100 · AI味 ${ev.data.aiFlavorScore}`,
      });
    } catch {
      items.push({ id: "eval", label: "内容评分", done: false });
    }

    try {
      const pkg = await researchApi.getResearchPackage(params.id as string);
      const materialCount = pkg.data.materials?.length ?? 0;
      const claimCount = pkg.data.claims?.length ?? 0;
      items.push({
        id: "claims",
        label: "资料/主张已登记",
        done: materialCount > 0,
        detail: `${materialCount} 条资料, ${claimCount} 条主张`,
      });
    } catch {
      items.push({ id: "claims", label: "资料包", done: false });
    }

    items.push({
      id: "cover",
      label: "封面文案",
      done: Boolean(currentProject?.coverLine),
      detail: currentProject?.coverLine || "可在标题工坊生成",
    });

    setChecks(items);
    setLoading(false);
  }

  async function downloadStandardExport(force = false) {
    if (!params.id) return;
    setExporting(true);
    try {
      const name = (
        currentProject?.selectedTitle ||
        currentProject?.title ||
        "article"
      )
        .replace(/[/\\?%*:|"<>]/g, "-")
        .slice(0, 40);
      await projectsApi.downloadExportZip(
        params.id as string,
        `${name}-article-flow-export.zip`,
        force,
      );
      setGateBlocked(false);
    } catch (e: unknown) {
      const err = e as {
        gateBlocked?: boolean;
        friendlyMessage?: string;
        message?: string;
      };
      if (err.gateBlocked) {
        setGateBlocked(true);
        alert(
          err.friendlyMessage ||
            err.message ||
            "发布门禁未通过，请先运行人味化改写",
        );
      } else {
        throw e;
      }
    } finally {
      setExporting(false);
    }
  }

  async function runDeriveVariants() {
    if (!params.id) return;
    setDeriving(true);
    try {
      const resp = await writingApi.deriveVariants({
        projectId: params.id as string,
        persist: true,
      });
      setVariants(resp.data.variants);
    } finally {
      setDeriving(false);
    }
  }

  async function runFinalReview() {
    const draft = await getDraftContent(params.id as string);
    if (!draft.trim()) return;
    setReviewing(true);
    try {
      const resp = await reviewApi.runReviewPipeline(draft, {
        title: currentProject?.selectedTitle || currentProject?.title,
        topic: currentProject?.title,
        platform: "wechat",
      });
      setReportMd(resp.data.reportMarkdown || "");
      setEvalResult(resp.data.eval || null);
      setCriticResult(resp.data.critic || null);
      setPipelinePassed(resp.data.passed ?? null);
    } finally {
      setReviewing(false);
    }
  }

  const allDone = checks.length > 0 && checks.every((c) => c.done);

  return (
    <StepPageFrame title="发布准备" stepId={stepId}>
      {loading ? (
        <Loader2 className="animate-spin mx-auto" />
      ) : (
        <ul className="space-y-3 mb-6">
          {checks.map((c) => (
            <li
              key={c.id}
              className={clsx(
                "flex items-start gap-3 p-4 border",
                c.done
                  ? "bg-green-50 border-green-200"
                  : "bg-surface-50/70 backdrop-blur-[3px] border-surface-300",
              )}
            >
              {c.done ? (
                <CheckCircle2 className="text-green-600 shrink-0" size={20} />
              ) : (
                <Circle className="text-ink-300 shrink-0" size={20} />
              )}
              <div>
                <p className="font-medium text-ink-900">{c.label}</p>
                {c.detail && (
                  <p className="text-xs text-ink-500 mt-0.5">{c.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div
        className={clsx(
          "p-4 mb-4 text-center",
          allDone
            ? "bg-green-100 text-green-800"
            : "bg-yellow-50 text-yellow-800",
        )}
      >
        {allDone ? "发布清单已全部通过" : "请完成上述检查项后再发布"}
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={runFinalReview}
          disabled={reviewing}
          className="px-4 py-2 border text-sm hover:bg-surface-200/30 flex items-center gap-2 disabled:opacity-60"
        >
          {reviewing ? <Loader2 size={16} className="animate-spin" /> : null}
          运行终审流水线
        </button>
        <button
          onClick={() => runChecks()}
          disabled={loading}
          className="px-4 py-2 border text-sm hover:bg-surface-200/30"
        >
          刷新检查项
        </button>
        <button
          onClick={() => downloadStandardExport(false)}
          disabled={exporting}
          className="wen-btn-action-accent text-sm flex items-center gap-2 disabled:opacity-60"
        >
          {exporting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Download size={16} />
          )}
          导出标准包 (ZIP)
        </button>
        {gateBlocked && (
          <button
            onClick={() => downloadStandardExport(true)}
            disabled={exporting}
            className="px-4 py-2 border border-red-300 text-red-700 text-sm flex items-center gap-2 disabled:opacity-60"
          >
            强制导出（跳过门禁）
          </button>
        )}
        <button
          onClick={runDeriveVariants}
          disabled={deriving}
          className="px-4 py-2 border border-primary-300 text-primary-700 text-sm flex items-center gap-2 disabled:opacity-60"
        >
          {deriving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          母稿派生三形态
        </button>
      </div>

      <p className="text-xs text-ink-500 mb-4">
        标准包根目录为{" "}
        <code className="bg-surface-200/50 px-1 rounded">
          article-flow-export/
        </code>
        ，含 manifest、article.md、outline、资料与 variants。
      </p>

      {variants && (
        <div className="space-y-4 mb-6">
          {Object.entries(variants).map(([key, body]) => (
            <details key={key} className="border p-3 bg-surface-50/70 backdrop-blur-[3px]">
              <summary className="font-medium cursor-pointer">
                {VARIANT_LABELS[key] || key}
              </summary>
              <pre className="mt-2 text-xs whitespace-pre-wrap max-h-48 overflow-auto text-ink-700">
                {body}
              </pre>
            </details>
          ))}
        </div>
      )}

      {(evalResult || criticResult || pipelinePassed !== null) && (
        <div className="space-y-4 mb-6">
          {pipelinePassed !== null && (
            <div
              className={clsx(
                "p-3 text-sm font-medium text-center",
                pipelinePassed
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800",
              )}
            >
              终审结论：
              {pipelinePassed ? "✅ 可以发布" : "⚠️ 建议返回写作/审校步骤优化"}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4">
            {evalResult && <ContentEvalCard evalResult={evalResult} />}
            {criticResult && <CriticCard critic={criticResult} />}
          </div>
        </div>
      )}

      {reportMd && (
        <details className="mb-6 p-4 bg-surface-200/30 ">
          <summary className="text-sm font-medium cursor-pointer text-ink-700">
            完整审校报告
          </summary>
          <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap mt-2">
            {reportMd}
          </pre>
        </details>
      )}
    </StepPageFrame>
  );
}
