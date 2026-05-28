"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useAppStore,
  getContentTypeSteps,
  getStepPath,
  CONTENT_TYPE_CONFIG,
  type ContentType,
} from "@/lib/store";
import { ChevronRight, BarChart3 } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { getStepIcon } from "@/lib/stepIcons";

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject, setCurrentStep } = useAppStore();

  const projectId = params.id as string;

  useEffect(() => {
    if (currentProject) {
      setCurrentStep(currentProject.currentStep || 1);
    }
  }, [currentProject]);

  if (!currentProject) {
    return null;
  }

  return (
    <div className="px-6 py-4 max-w-4xl mx-auto">
      <div className="wen-panel-padded p-8 mb-8">
        <h2 className="wen-title mb-4">写作工作流</h2>
        <p className="text-ink-500 mb-8">
          选择一个步骤开始或继续您的文章写作。您可以随时从任一环节开始或跳转。
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(() => {
            const ct = (currentProject.contentType || "article") as ContentType;
            const steps = getContentTypeSteps(ct);
            return steps.map((step) => {
              const Icon = getStepIcon(step.icon);
              const isActive = currentProject.currentStep === step.id;
              const stepPath = getStepPath(step.id, currentProject._id, ct);

              return (
                <Link
                  key={step.id}
                  href={stepPath}
                  className={clsx(
                    "group flex items-center gap-4 p-4 border-2 transition-all",
                    isActive
                      ? "border-primary-500 bg-primary-50"
                      : "border-surface-300 hover:border-primary-300 hover:bg-surface-200/30",
                  )}
                >
                  <div
                    className={clsx(
                      "w-12 h-12 flex items-center justify-center",
                      isActive
                        ? "bg-primary-100 text-primary-700"
                        : "bg-surface-200/50 text-ink-500 group-hover:bg-primary-100 group-hover:text-primary-600",
                    )}
                  >
                    <Icon size={24} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={clsx(
                          "text-sm font-bold",
                          isActive ? "text-primary-600" : "text-ink-400",
                        )}
                      >
                        步骤 {step.id}
                      </span>

                      {isActive && (
                        <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 ">
                          当前步骤
                        </span>
                      )}
                    </div>
                    <h3
                      className={clsx(
                        "font-semibold",
                        isActive
                          ? "text-primary-700"
                          : "text-ink-900 group-hover:text-primary-600",
                      )}
                    >
                      {step.name}
                    </h3>
                    <p className="text-sm text-ink-500 line-clamp-1">
                      {step.description}
                    </p>
                  </div>

                  <ChevronRight
                    size={20}
                    className={clsx(
                      "transition-colors",
                      isActive
                        ? "text-primary-500"
                        : "text-ink-300 group-hover:text-primary-500",
                    )}
                  />
                </Link>
              );
            });
          })()}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="wen-panel-padded p-6">
          <h3 className="wen-title">写作进度</h3>
          <p className="text-2xl font-bold text-ink-900">
            {currentProject.wordCount} / {currentProject.targetWordCount}
          </p>
          <p className="text-sm text-ink-500 mt-1">字</p>
          <div className="w-full bg-gray-200 h-2 mt-3">
            <div
              className="bg-primary-500 h-2 "
              style={{
                width: `${Math.min(100, Math.round((currentProject.wordCount / currentProject.targetWordCount) * 100))}%`,
              }}
            />
          </div>
        </div>

        <div className="wen-panel-padded p-6">
          <h3 className="wen-title">AI 味检测</h3>
          <p className="text-2xl font-bold">
            <span
              className={clsx(
                currentProject.aiTasteScore < 30
                  ? "text-green-600"
                  : currentProject.aiTasteScore < 50
                    ? "text-yellow-600"
                    : "text-red-600",
              )}
            >
              {currentProject.aiTasteScore}%
            </span>
          </p>
          <p className="text-sm text-ink-500 mt-1">
            {currentProject.aiTasteScore < 30
              ? "AI味低，继续保持"
              : currentProject.aiTasteScore < 50
                ? "AI味中等，建议优化"
                : "AI味较高，需要修改"}
          </p>
        </div>

        <div className="wen-panel-padded p-6">
          <h3 className="wen-title">内容类型</h3>
          <p className="text-2xl font-bold text-ink-900">
            {
              (
                CONTENT_TYPE_CONFIG[
                  (currentProject.contentType || "article") as ContentType
                ] || CONTENT_TYPE_CONFIG.article
              ).label
            }
          </p>
          <p className="text-sm text-ink-500 mt-1">
            {
              (
                CONTENT_TYPE_CONFIG[
                  (currentProject.contentType || "article") as ContentType
                ] || CONTENT_TYPE_CONFIG.article
              ).description
            }
          </p>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link
          href={`/projects/${params.id}/stats`}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm text-ink-500 hover:text-primary-600 border border-surface-300 hover:border-primary-300 transition-colors"
        >
          <BarChart3 size={16} />
          查看写作统计
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
