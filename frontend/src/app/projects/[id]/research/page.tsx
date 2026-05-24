"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { researchApi, topicsApi, hotnewsApi } from "@/lib/api/client";
import { showToast } from "@/components/ui/Toast";
import { getApiError } from "@/lib/apiError";
import { buildTopicSearchQuery } from "@/lib/searchQuery";
import { useStepFromRoute } from "@/lib/hooks/useStepFromRoute";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import type { ResearchMaterial, Claim, HotNewsItem, Topic } from "@/types";
import {
  Search,
  Plus,
  Link2,
  FileText,
  Image,
  Trash2,
  Loader2,
  Sparkles,
  ExternalLink,
  Copy,
  ArrowRight,
  SkipForward,
  Target,
  AlertCircle,
  Globe,
} from "lucide-react";
import { clsx } from "clsx";

const sourceTypes = [
  { id: "web", label: "网页", icon: Link2 },
  { id: "file", label: "文件", icon: FileText },
  { id: "image", label: "图片", icon: Image },
];

export default function ResearchPage() {
  const params = useParams();
  const router = useRouter();
  const { currentProject } = useAppStore();
  const { stepId } = useStepFromRoute();
  const [materials, setMaterials] = useState<ResearchMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState("web");
  const [urlInput, setUrlInput] = useState("");
  const [textInput, setTextInput] = useState("");
  const [isFetching, setIsFetching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<{
    title: string;
    description?: string;
  } | null>(null);
  const [projectTopics, setProjectTopics] = useState<Topic[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [claimText, setClaimText] = useState("");
  const [claimQuote, setClaimQuote] = useState("");
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeSearchQuery, setActiveSearchQuery] = useState("");
  const [searchItems, setSearchItems] = useState<HotNewsItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchWarning, setSearchWarning] = useState<string | null>(null);
  const [addingResultUrl, setAddingResultUrl] = useState<string | null>(null);

  useEffect(() => {
    loadMaterials();
    loadClaims();
    loadSelectedTopic();
  }, [params.id]);

  async function loadClaims() {
    if (!params.id) return;
    try {
      const resp = await researchApi.getClaims(params.id as string);
      setClaims(resp.data);
    } catch {
      setClaims([]);
    }
  }

  async function addClaim() {
    if (!params.id || !claimText.trim()) return;
    await researchApi.createClaim({
      projectId: params.id as string,
      text: claimText.trim(),
      sourceQuote: claimQuote.trim(),
    });
    setClaimText("");
    setClaimQuote("");
    loadClaims();
  }

  async function loadSelectedTopic() {
    if (!params.id) return;
    try {
      const response = await topicsApi.getByProject(params.id as string);
      const topics = response.data || [];
      setProjectTopics(topics);
      const selected =
        topics.find((t) => t.status === "selected") || topics[0] || null;
      if (selected) {
        setSelectedTopic({
          title: selected.title,
          description: selected.description,
        });
        setSearchQuery(buildTopicSearchQuery(selected));
      }
    } catch {
      setProjectTopics([]);
    }
  }

  async function loadMaterials() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await researchApi.getByProject(params.id as string);
      setMaterials(response.data);
    } catch (error) {
      console.error("Failed to load materials:", error);
    } finally {
      setLoading(false);
    }
  }

  async function runWebSearch(queryOverride?: string) {
    const q = (queryOverride ?? searchQuery).trim();
    if (!q) {
      showToast("error", "请输入完整标题或搜索句");
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSearchWarning(null);
    setSearchItems([]);
    setActiveSearchQuery(q);
    setSearchQuery(q);
    try {
      const response = await hotnewsApi.search({ query: q, maxResults: 12 });
      const items = response.data?.items || [];
      if (items.length > 0) {
        setSearchItems(items);
        if (response.data.warnings?.length) {
          setSearchWarning(response.data.warnings.join("；"));
        }
      } else if (response.data?.error) {
        setSearchError(response.data.error);
      } else {
        setSearchError("未找到相关结果，请换关键词重试");
      }
    } catch (error: unknown) {
      showToast("error", getApiError(error, "搜索失败"));
    } finally {
      setSearchLoading(false);
    }
  }

  async function addSearchResultAsMaterial(item: HotNewsItem) {
    if (!params.id) return;
    const url = item.url || "";
    setAddingResultUrl(url || item.title);
    try {
      let title = item.title || "网络资料";
      let content = item.content || "";
      if (url) {
        try {
          const fetched = await researchApi.fetchUrl(url);
          title = fetched.data.title || title;
          content = fetched.data.content || content;
        } catch {
          showToast("error", "页面抓取失败，已保存摘要");
        }
      }
      if (!content.trim()) {
        showToast("error", "无法获取有效内容");
        return;
      }
      await researchApi.create({
        projectId: params.id as string,
        sourceType: "web",
        sourceUrl: url,
        title,
        content,
        summary: item.content?.slice(0, 200) || "",
        keywords: [],
        citation: "",
      });
      showToast("success", "已添加为资料");
      loadMaterials();
    } catch (error: unknown) {
      const err = error as { friendlyMessage?: string; message?: string };
      showToast("error", err.friendlyMessage || "添加资料失败");
    } finally {
      setAddingResultUrl(null);
    }
  }

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setIsFetching(true);
    try {
      const response = await researchApi.fetchUrl(urlInput.trim());
      setTextInput(response.data.content);
    } catch (error: unknown) {
      const err = error as { friendlyMessage?: string; message?: string };
      showToast("error", err.friendlyMessage || "获取网页失败");
    } finally {
      setIsFetching(false);
    }
  }

  async function addMaterial() {
    if (!params.id) return;
    try {
      await researchApi.create({
        projectId: params.id as string,
        sourceType: selectedSourceType as any,
        sourceUrl: urlInput,
        title: "资料标题",
        content: textInput,
        summary: "",
        keywords: [],
        citation: "",
      });
      setShowAddModal(false);
      setUrlInput("");
      setTextInput("");
      loadMaterials();
    } catch (error) {
      console.error("Failed to add material:", error);
    }
  }

  async function summarizeMaterial(materialId: string, content: string) {
    setIsSummarizing(materialId);
    try {
      const response = await researchApi.summarize(content, 100);
      const summary = response.data.summary;
      if (summary) {
        setMaterials((prev) =>
          prev.map((m) => (m._id === materialId ? { ...m, summary } : m)),
        );
      }
    } catch (error) {
      console.error("Failed to summarize:", error);
    } finally {
      setIsSummarizing(null);
    }
  }

  async function deleteMaterial(materialId: string) {
    try {
      await researchApi.delete(materialId);
      loadMaterials();
    } catch (error) {
      console.error("Failed to delete material:", error);
    }
  }

  return (
    <StepPageFrame
      wide
      title="搜集资料"
      subtitle={selectedTopic ? `选题：${selectedTopic.title}` : undefined}
      stepId={stepId}
      actions={
        <button
          onClick={() => setShowAddModal(true)}
          className="wen-btn-seal text-xs"
        >
          <Plus size={14} />
          添加
        </button>
      }
    >
      <div className="wen-panel-padded p-5 mb-6">
        <h3 className="wen-title text-ink-900 mb-3 flex items-center gap-2">
          <Globe size={18} className="text-primary-500" />
          网络搜索
        </h3>
        <p className="text-xs text-ink-500 mb-3">
          使用完整选题标题进行短语搜索（不会拆成单个词或标签）
        </p>
        {projectTopics.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {projectTopics.map((topic) => (
              <button
                key={topic._id}
                type="button"
                onClick={() => {
                  const q = buildTopicSearchQuery(topic);
                  setSelectedTopic({
                    title: topic.title,
                    description: topic.description,
                  });
                  setSearchQuery(q);
                  runWebSearch(q);
                }}
                className="text-xs px-2 py-1 border border-surface-300 hover:border-primary-400 hover:text-primary-600 text-left max-w-full truncate"
                title={topic.title}
              >
                {topic.title}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 mb-3">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runWebSearch()}
            placeholder={
              selectedTopic
                ? `完整标题：${selectedTopic.title}`
                : "粘贴完整标题搜索…"
            }
            className="flex-1 px-4 py-2 border border-surface-300 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          />
          <button
            onClick={() => runWebSearch()}
            disabled={searchLoading || !searchQuery.trim()}
            className="wen-btn-seal disabled:opacity-50 text-sm"
          >
            {searchLoading ? (
              <Loader2 className="animate-spin" size={16} />
            ) : (
              <Search size={16} />
            )}
            搜索
          </button>
        </div>
        {activeSearchQuery && (
          <p className="text-xs text-ink-500 mb-2">
            正在搜索完整标题：
            <span className="text-ink-800 ml-1">{activeSearchQuery}</span>
          </p>
        )}
        {searchWarning && (
          <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
            <AlertCircle size={12} /> {searchWarning}
          </p>
        )}
        {searchError && (
          <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
            <AlertCircle size={12} /> {searchError}
          </p>
        )}
        {searchItems.length > 0 && (
          <ul className="space-y-2 max-h-80 overflow-y-auto">
            {searchItems.map((item, i) => (
              <li
                key={`${item.url}-${i}`}
                className="border border-surface-200 p-3 hover:border-primary-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 line-clamp-2">
                      {item.title}
                    </p>
                    {item.content && (
                      <p className="text-xs text-ink-500 mt-1 line-clamp-2">
                        {item.content}
                      </p>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary-600 hover:underline inline-flex items-center gap-1 mt-1"
                      >
                        <ExternalLink size={10} /> {item.url}
                      </a>
                    )}
                  </div>
                  <button
                    onClick={() => addSearchResultAsMaterial(item)}
                    disabled={addingResultUrl === (item.url || item.title)}
                    className="shrink-0 px-3 py-1.5 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50"
                  >
                    {addingResultUrl === (item.url || item.title) ? (
                      <Loader2 className="animate-spin inline" size={12} />
                    ) : (
                      "抓取并添加"
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto" />
        </div>
      ) : materials.length === 0 ? (
        <div className="wen-panel-padded p-16 text-center">
          <Search className="w-16 h-16 text-ink-300 mx-auto mb-4" />
          <h3 className="wen-title">还没有资料</h3>
          <p className="text-ink-500 mb-6">添加网页、文件或图片作为参考资料</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="wen-btn-seal transition-colors"
          >
            <Plus size={18} />
            添加第一个资料
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-8">
            {materials.map((material) => {
              const Icon =
                sourceTypes.find((t) => t.id === material.sourceType)?.icon ||
                FileText;
              return (
                <div
                  key={material._id}
                  className="wen-panel-padded p-6 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon size={20} className="text-primary-500" />
                      <span className="text-sm text-ink-500 capitalize">
                        {material.sourceType}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteMaterial(material._id)}
                      className="p-1 text-ink-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <h3 className="wen-title text-ink-900 mb-2">
                    {material.title}
                  </h3>
                  {material.sourceUrl && (
                    <a
                      href={material.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary-600 hover:underline flex items-center gap-1 mb-3"
                    >
                      <ExternalLink size={12} />
                      查看来源
                    </a>
                  )}
                  <p className="text-sm text-ink-600 line-clamp-3 mb-3">
                    {material.content}
                  </p>
                  {material.keywords && material.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {material.keywords.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-surface-200/50 text-ink-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() =>
                      summarizeMaterial(material._id, material.content)
                    }
                    disabled={isSummarizing === material._id}
                    className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                  >
                    {isSummarizing === material._id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    AI 摘要
                  </button>
                </div>
              );
            })}
          </div>

          <div className="wen-panel-padded border border-amber-200 p-6">
            <h3 className="wen-title text-ink-900 mb-3">
              主张登记表（claims）
            </h3>
            <p className="text-xs text-ink-500 mb-4">
              将正文中的数据/结论与资料来源绑定，发布前可核查幻觉风险。
            </p>
            <div className="flex gap-2 mb-3">
              <input
                value={claimText}
                onChange={(e) => setClaimText(e.target.value)}
                placeholder="主张内容"
                className="flex-1 border px-3 py-2 text-sm"
              />
              <input
                value={claimQuote}
                onChange={(e) => setClaimQuote(e.target.value)}
                placeholder="来源摘录"
                className="flex-1 border px-3 py-2 text-sm"
              />
              <button
                onClick={addClaim}
                className="px-3 py-2 bg-amber-500 text-white text-sm"
              >
                登记
              </button>
            </div>
            <ul className="space-y-2 mb-4">
              {claims.map((c) => (
                <li
                  key={c._id}
                  className="text-sm p-2 bg-amber-50 rounded border border-amber-100"
                >
                  <strong>{c.text}</strong>
                  {c.sourceQuote && (
                    <span className="text-ink-500 block text-xs mt-1">
                      来源: {c.sourceQuote}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            <button
              onClick={async () => {
                if (!params.id) return;
                setIsVerifying(true);
                try {
                  const draft = materials
                    .map((m) => m.summary || m.content)
                    .join("\n");
                  const resp = await researchApi.verifyClaims(
                    params.id as string,
                    draft,
                  );
                  setVerifyResult(resp.data);
                } finally {
                  setIsVerifying(false);
                }
              }}
              disabled={isVerifying || claims.length === 0}
              className="text-xs px-3 py-1.5 border hover:bg-surface-200/30"
            >
              {isVerifying ? "核查中..." : "核查主张与资料"}
            </button>
            {verifyResult?.summary && (
              <p className="text-xs text-ink-600 mt-2">
                {verifyResult.summary}（风险: {verifyResult.hallucinationRisk})
              </p>
            )}
          </div>
        </>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-100 max-w-2xl w-full p-6">
            <h2 className="wen-title text-ink-900 mb-6">添加资料</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-2">
                  资料类型
                </label>
                <div className="flex gap-2">
                  {sourceTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedSourceType(type.id)}
                        className={clsx(
                          "flex-1 py-3 border-2 transition-colors",
                          selectedSourceType === type.id
                            ? "border-primary-500 bg-primary-50"
                            : "border-surface-300 hover:border-surface-300",
                        )}
                      >
                        <Icon
                          size={20}
                          className={clsx(
                            "mx-auto mb-1",
                            selectedSourceType === type.id
                              ? "text-primary-600"
                              : "text-ink-400",
                          )}
                        />
                        <span
                          className={clsx(
                            "text-sm font-medium",
                            selectedSourceType === type.id
                              ? "text-primary-700"
                              : "text-ink-600",
                          )}
                        >
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSourceType === "web" && (
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1">
                    网页 URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 px-4 py-2 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                    />
                    <button
                      onClick={fetchUrl}
                      disabled={isFetching || !urlInput.trim()}
                      className="px-4 py-2 bg-surface-200/50 text-ink-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    >
                      {isFetching ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        "获取"
                      )}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1">
                  内容
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="粘贴或输入内容..."
                  rows={8}
                  className="w-full px-4 py-2 border border-surface-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-ink-600 hover:bg-surface-200/50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={addMaterial}
                disabled={!textInput.trim()}
                className="wen-btn-seal disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </StepPageFrame>
  );
}
