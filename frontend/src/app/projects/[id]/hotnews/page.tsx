"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { hotnewsApi, topicsApi } from "@/lib/api/client";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import type { HotNewsItem } from "@/types";
import {
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  X,
  Target,
  Users,
  Hash,
  ExternalLink,
  Lightbulb,
  BarChart3,
  Bookmark,
  Search,
  ArrowLeft,
} from "lucide-react";
import { clsx } from "clsx";

interface MinedTopic {
  title: string;
  angle: string;
  newsValue?: string;
  potentialAudience?: string;
  searchKeywords?: string[];
  tags: string[];
}

interface SearchLink {
  keyword: string;
  platforms: { name: string; url: string }[];
}

export default function HotnewsPage() {
  const params = useParams();
  const router = useRouter();
  const { stepId } = useStepFromRoute();
  const inputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"search" | "mining">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchLabel, setActiveSearchLabel] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const [searchItems, setSearchItems] = useState<HotNewsItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);

  const [miningKeywords, setMiningKeywords] = useState("");
  const [miningCount, setMiningCount] = useState(8);
  const [miningResult, setMiningResult] = useState<{
    topics: MinedTopic[];
    keywordsUsed?: string[];
  } | null>(null);
  const [miningLoading, setMiningLoading] = useState(false);
  const [miningError, setMiningError] = useState<string | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);

  const [searchLinks, setSearchLinks] = useState<SearchLink[]>([]);
  const [generatingLinks, setGeneratingLinks] = useState(false);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function runSearch(query?: string) {
    const q = (query ?? searchQuery).trim();
    if (!q) {
      setSearchError("请输入搜索关键词");
      inputRef.current?.focus();
      return;
    }

    setSearchLoading(true);
    setSearchError(null);
    setSearchWarning(null);
    setSearchItems([]);
    setHasSearched(true);
    setActiveSearchLabel(q);
    setSearchQuery(q);
    setView("search");

    try {
      const response = await hotnewsApi.search({ query: q });
      if (response.data?.items?.length > 0) {
        setSearchItems(response.data.items);
        if (response.data.warnings?.length) {
          setSearchWarning(response.data.warnings.join("；"));
        }
      } else if (response.data?.error) {
        setSearchError(response.data.error);
      } else if (response.data?.warnings?.length) {
        setSearchError(response.data.warnings.join("；"));
      } else {
        setSearchError("未找到相关资讯，请换关键词重试");
      }
    } catch (error: unknown) {
      const err = error as {
        friendlyMessage?: string;
        response?: { data?: { error?: string } };
      };
      setSearchError(
        err.friendlyMessage ||
          err.response?.data?.error ||
          "搜索失败，请稍后重试",
      );
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleMineTopics() {
    if (!activeSearchLabel.trim()) {
      setSearchError("请先搜索关键词");
      return;
    }

    setMiningLoading(true);
    setMiningError(null);
    setMiningResult(null);
    setSearchLinks([]);
    setView("mining");

    const baseQuery = activeSearchLabel.trim();
    const extra = miningKeywords.trim();
    const query = extra ? `${baseQuery} ${extra}`.trim() : baseQuery;

    try {
      const response = await hotnewsApi.mineTopics({
        query,
        count: miningCount,
      });
      setMiningResult(response.data);
    } catch (error: unknown) {
      const err = error as { friendlyMessage?: string; message?: string };
      setMiningError(
        err.friendlyMessage || err.message || "挖掘失败，请稍后重试",
      );
    } finally {
      setMiningLoading(false);
    }
  }

  async function handleGenerateSearchLinks(keywords: string[]) {
    if (!keywords.length) return;
    setGeneratingLinks(true);
    try {
      const response = await hotnewsApi.generateSearchLinks({ keywords });
      setSearchLinks(response.data.searchLinks || []);
    } catch {
      /* silent */
    } finally {
      setGeneratingLinks(false);
    }
  }

  async function handleSaveTopic(topic: MinedTopic) {
    if (!params.id) return;
    try {
      await topicsApi.create({
        projectId: params.id as string,
        title: topic.title,
        description: topic.angle || topic.newsValue || "",
        tags: topic.tags || [],
      });
      const go = window.confirm("选题已保存，是否前往确定选题？");
      if (go) router.push(`/projects/${params.id}/topics`);
    } catch (error: unknown) {
      const err = error as { friendlyMessage?: string };
      alert(err.friendlyMessage || "保存选题失败，请重试");
    }
  }

  if (view === "mining") {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setView("search");
              setMiningResult(null);
              setMiningError(null);
            }}
            className="p-2 hover:bg-surface-200/50 "
          >
            <ArrowLeft size={20} className="text-ink-600" />
          </button>
          <div>
            <h2 className="wen-title text-ink-900">
              「{activeSearchLabel}」· 选题挖掘
            </h2>
            <p className="text-ink-500 text-sm">基于搜索结果的 AI 分析</p>
          </div>
        </div>

        {miningLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary-500" size={32} />
            <span className="ml-3 text-ink-600">AI 正在分析搜索结果...</span>
          </div>
        )}

        {miningError && !miningLoading && (
          <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {miningError}
          </div>
        )}

        {miningResult?.topics && miningResult.topics.length > 0 && (
          <div className="space-y-3">
            {miningResult.topics.map((topic, index) => (
              <TopicCard
                key={index}
                topic={topic}
                index={index}
                expanded={expandedTopic === index}
                onToggle={() =>
                  setExpandedTopic(expandedTopic === index ? null : index)
                }
                onSave={() => handleSaveTopic(topic)}
                onSearchLinks={(kws) => handleGenerateSearchLinks(kws)}
              />
            ))}
          </div>
        )}

        {searchLinks.length > 0 && (
          <SearchLinksPanel
            links={searchLinks}
            onClose={() => setSearchLinks([])}
            generating={generatingLinks}
          />
        )}
      </div>
    );
  }

  return (
    <StepPageFrame
      wide
      title="热搜选题"
      subtitle="输入关键词直接搜索"
      stepId={stepId}
    >
      <div className="space-y-4">
        <div className="wen-panel-padded p-5 space-y-3">
          <label
            htmlFor="hotnews-query"
            className="block text-sm font-medium text-ink-700"
          >
            搜索关键词
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
              />
              <input
                id="hotnews-query"
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="例如：DeepSeek 发布、新能源汽车政策、AI 写作"
                className="w-full pl-9 pr-3 py-3 border border-surface-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
            </div>
            <button
              onClick={() => runSearch()}
              disabled={searchLoading}
              className="wen-btn-seal px-4 py-2 text-sm font-medium disabled:opacity-50 shrink-0"
            >
              {searchLoading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                "搜索资讯"
              )}
            </button>
          </div>
          <p className="text-xs text-ink-400">
            Bing · DuckDuckGo · Google 多引擎实时搜索
          </p>
        </div>

        {searchWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-sm text-amber-800">
            {searchWarning}
          </div>
        )}

        {searchError && (
          <div className="p-4 bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{searchError}</span>
          </div>
        )}

        {searchLoading && (
          <div className="flex items-center justify-center py-12 text-ink-500 text-sm">
            <Loader2 className="animate-spin text-primary-500 mr-2" size={20} />
            正在搜索「{activeSearchLabel || searchQuery}」，约需 15–30
            秒，请稍候…
          </div>
        )}

        {!searchLoading &&
          hasSearched &&
          searchItems.length === 0 &&
          !searchError && (
            <div className="text-center py-12 text-ink-500 text-sm">
              暂无结果，请换关键词重试
            </div>
          )}

        {!searchLoading && searchItems.length > 0 && (
          <>
            <p className="text-sm text-ink-600">
              「
              <span className="font-medium text-ink-900">
                {activeSearchLabel}
              </span>
              」共 {searchItems.length} 条结果
            </p>
            <div className="space-y-3">
              {searchItems.map((item, i) => (
                <div key={i} className="wen-panel-padded p-4 ">
                  <div className="flex items-start gap-3">
                    <span
                      className={clsx(
                        "w-7 h-7 flex items-center justify-center text-xs font-bold shrink-0",
                        i < 3
                          ? "wen-chip-active"
                          : "bg-surface-200/50 text-ink-600",
                      )}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <a
                        href={item.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-ink-900 hover:text-primary-600"
                      >
                        {item.title}
                        <ExternalLink
                          size={12}
                          className="inline ml-1 text-ink-400"
                        />
                      </a>
                      {item.content && (
                        <p className="text-ink-600 text-sm mt-1.5 line-clamp-2">
                          {item.content}
                        </p>
                      )}
                      <span className="inline-block mt-2 text-xs px-1.5 py-0.5 rounded bg-surface-200/50 text-ink-500">
                        {item.source === "baidu"
                          ? "百度"
                          : item.source === "bing"
                            ? "Bing"
                            : item.source === "duckduckgo"
                              ? "DuckDuckGo"
                              : item.source === "google"
                                ? "Google"
                                : "Tavily"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="wen-panel-padded p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Target className="text-primary-600" size={20} />
                <div>
                  <h3 className="wen-title text-ink-900">AI 挖掘选题</h3>
                  <p className="text-xs text-ink-500">
                    基于上方「{activeSearchLabel}」的搜索结果
                  </p>
                </div>
              </div>
              <input
                type="text"
                value={miningKeywords}
                onChange={(e) => setMiningKeywords(e.target.value)}
                placeholder="补充说明（可选，会追加到完整搜索句后）"
                className="w-full px-4 py-2.5 border border-surface-300 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleMineTopics}
                disabled={miningLoading}
                className="wen-btn-seal w-full justify-center py-2.5 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
              >
                {miningLoading ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Sparkles size={18} />
                )}
                开始智能挖掘
              </button>
            </div>
          </>
        )}
      </div>
    </StepPageFrame>
  );
}

function TopicCard({
  topic,
  index,
  expanded,
  onToggle,
  onSave,
  onSearchLinks,
}: {
  topic: MinedTopic;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSave: () => void;
  onSearchLinks: (kws: string[]) => void;
}) {
  return (
    <div
      className={clsx(
        "wen-panel-padded border",
        expanded ? "border-primary-300" : "border-surface-300",
      )}
    >
      <div className="p-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <span
              className={clsx(
                "w-8 h-8 flex items-center justify-center text-sm font-bold shrink-0",
                index < 3 ? "wen-chip-active" : "bg-surface-200/50 text-ink-600",
              )}
            >
              {index + 1}
            </span>
            <h4 className="wen-title text-ink-900">{topic.title}</h4>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSave();
              }}
              className="p-2 text-ink-400 hover:text-primary-500"
            >
              <Bookmark size={18} />
            </button>
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t space-y-3 text-sm text-ink-700">
          {topic.angle && (
            <p>
              <Lightbulb size={14} className="inline mr-1" />
              {topic.angle}
            </p>
          )}
          {topic.newsValue && (
            <p>
              <BarChart3 size={14} className="inline mr-1" />
              {topic.newsValue}
            </p>
          )}
          {topic.potentialAudience && (
            <p>
              <Users size={14} className="inline mr-1" />
              {topic.potentialAudience}
            </p>
          )}
          {topic.searchKeywords?.length ? (
            <div className="flex flex-wrap gap-2">
              {topic.searchKeywords.map((kw, i) => (
                <button
                  key={i}
                  onClick={() => onSearchLinks([kw])}
                  className="px-2 py-1 bg-blue-50 text-blue-700 text-xs text-left"
                  title={kw}
                >
                  {kw}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function SearchLinksPanel({
  links,
  onClose,
  generating,
}: {
  links: SearchLink[];
  onClose: () => void;
  generating: boolean;
}) {
  return (
    <div className="wen-panel-padded border p-5">
      <div className="flex justify-between mb-3">
        <h3 className="wen-title">搜索链接</h3>
        <button onClick={onClose}>
          <X size={18} />
        </button>
      </div>
      {generating && <Loader2 className="animate-spin" size={16} />}
      {links.map((item, i) => (
        <div key={i} className="mb-3">
          <p className="text-sm font-medium mb-1">{item.keyword}</p>
          <div className="flex flex-wrap gap-2">
            {item.platforms.map((p, j) => (
              <a
                key={j}
                href={p.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs px-2 py-1 border hover:bg-surface-200/30"
              >
                {p.name}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
