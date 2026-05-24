"use client";

import { useState, useRef } from "react";
import { styleApi } from "@/lib/api/client";
import { importContentFromFile } from "@/lib/contentFlow";
import { AppShell } from "@/components/layout/AppShell";
import { StepPageFrame } from "@/components/layout/StepPageFrame";
import {
  Palette,
  Plus,
  Trash2,
  FileText,
  Loader2,
  Save,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Type,
  AlignLeft,
  Hash,
  Copy,
  Check,
  FolderOpen,
  Clipboard,
} from "lucide-react";

interface StyleData {
  paragraph: {
    avgLength: number;
    medianLength: number;
    minLength: number;
    maxLength: number;
    distribution: { short: number; medium: number; long: number };
    totalCount: number;
  };
  sentence: {
    avgLength: number;
    medianLength: number;
    minLength: number;
    maxLength: number;
    distribution: { short: number; medium: number; long: number };
    totalCount: number;
  };
  formatting: {
    usesLists: boolean;
    usesHeaders: boolean;
    usesQuotes: boolean;
    usesBold: boolean;
  };
  tone: {
    exclamationRatio: number;
    questionRatio: number;
  };
  sentenceStarters: { text: string; count: number }[];
  connectors: { text: string; count: number }[];
  totalChars: number;
  sourceCount: number;
}

interface SavedProfile {
  _id: string;
  name: string;
  styleData: StyleData;
  createdAt: string;
}

export default function StyleExtractPage() {
  const [texts, setTexts] = useState<string[]>([]);
  const [newText, setNewText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [styleData, setStyleData] = useState<StyleData | null>(null);
  const [stylePrompt, setStylePrompt] = useState("");
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [showProfiles, setShowProfiles] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(
    "paragraph",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleAnalyze() {
    const validTexts = texts.filter((t) => t.trim().length > 10);
    if (validTexts.length === 0) return;
    setAnalyzing(true);
    try {
      const resp = await styleApi.analyze(validTexts);
      setStyleData(resp.data.styleData);
      setStylePrompt(resp.data.stylePrompt);
    } catch (e: any) {
      alert(
        "分析失败: " + (e?.response?.data?.error || e.message || "未知错误"),
      );
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleSave() {
    if (!styleData || !profileName.trim()) return;
    setSaving(true);
    try {
      const validTexts = texts.filter((t) => t.trim().length > 10);
      await styleApi.create(profileName.trim(), validTexts);
      setProfileName("");
      alert("风格档案已保存");
    } catch (e: any) {
      alert("保存失败: " + (e?.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  }

  async function loadProfiles() {
    if (showProfiles) {
      setShowProfiles(false);
      return;
    }
    setShowProfiles(true);
    setLoadingProfiles(true);
    try {
      const resp = await styleApi.list();
      setProfiles(resp.data || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoadingProfiles(false);
    }
  }

  async function handleDeleteProfile(id: string) {
    try {
      await styleApi.delete(id);
      setProfiles((prev) => prev.filter((p) => p._id !== id));
    } catch {}
  }

  function handleCopyPrompt() {
    navigator.clipboard.writeText(stylePrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleImportFiles() {
    try {
      const content = await importContentFromFile();
      if (content?.trim()) {
        setTexts((prev) => [...prev, content.trim()]);
      }
    } catch {}
  }

  function handlePasteText() {
    if (newText.trim()) {
      setTexts((prev) => [...prev, newText.trim()]);
      setNewText("");
    }
  }

  function toggleSection(section: string) {
    setExpandedSection(expandedSection === section ? null : section);
  }

  function renderBar(label: string, value: number, color: string) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="w-12 text-ink-400">{label}</span>
        <div className="flex-1 h-3 bg-surface-200 overflow-hidden">
          <div
            className={`h-full ${color}`}
            style={{ width: `${Math.min(value, 100)}%` }}
          />
        </div>
        <span className="w-12 text-right text-ink-500">{value}%</span>
      </div>
    );
  }

  return (
    <AppShell>
      <StepPageFrame
        wide
        title="风格提取"
        subtitle="分析文章写作风格"
        actions={
          <>
            <button
              type="button"
              onClick={loadProfiles}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              <Hash size={12} className="text-ink-400" />
              档案
            </button>
            <button
              type="button"
              onClick={handleImportFiles}
              className="wen-btn text-xs inline-flex items-center gap-1"
            >
              <FolderOpen size={12} className="text-ink-400" />
              导入
            </button>
            <button
              type="button"
              onClick={handlePasteText}
              disabled={!newText.trim()}
              className="wen-btn-seal text-xs inline-flex items-center gap-1 disabled:opacity-40"
            >
              <Plus size={12} className="text-ink-400" />
              添加
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-surface-0 border border-surface-200 p-4">
              <h3 className="wen-title text-ink-600 mb-3">
                添加文本
              </h3>
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="粘贴文章内容到这里，然后点击添加..."
                className="w-full h-32 px-3 py-2 border border-surface-200 text-sm focus:ring-1 focus:ring-primary-500 outline-none resize-none bg-surface-50"
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-[10px] text-ink-300">
                  {newText.length} 字
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={async () => {
                      try {
                        const t = await navigator.clipboard.readText();
                        if (t) setNewText(t);
                      } catch {}
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-ink-400 hover:bg-surface-100 rounded"
                  >
                    <Clipboard size={11} /> 粘贴
                  </button>
                  <button
                    onClick={handlePasteText}
                    disabled={!newText.trim()}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-40"
                  >
                    <Plus size={11} /> 添加
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-surface-0 border border-surface-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="wen-title text-ink-600">
                  已添加文本 ({texts.length})
                </h3>
                {texts.length > 0 && (
                  <button
                    onClick={() => setTexts([])}
                    className="text-[10px] text-red-400 hover:text-red-600"
                  >
                    清空
                  </button>
                )}
              </div>
              {texts.length === 0 ? (
                <p className="text-xs text-ink-300 text-center py-6">
                  还没有添加文本，请导入文件或粘贴内容
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {texts.map((text, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 p-2 bg-surface-50 rounded border border-surface-200"
                    >
                      <FileText
                        size={12}
                        className="text-ink-300 mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-ink-600 truncate">
                          {text.slice(0, 80)}...
                        </p>
                        <p className="text-[10px] text-ink-300">
                          {text.length} 字
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setTexts((prev) => prev.filter((_, j) => j !== i))
                        }
                        className="text-ink-300 hover:text-red-500 shrink-0"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {texts.length > 0 && (
                <button
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="w-full mt-3 py-2 bg-ink-700 text-primary-50 text-xs font-medium hover:bg-ink-800 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                >
                  {analyzing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <BarChart3 size={14} />
                  )}
                  {analyzing ? "分析中..." : "开始分析风格"}
                </button>
              )}
            </div>

            {showProfiles && (
              <div className="bg-surface-0 border border-surface-200 p-4">
                <h3 className="wen-title text-ink-600 mb-3">
                  已保存的风格档案
                </h3>
                {loadingProfiles ? (
                  <div className="text-center py-4">
                    <Loader2
                      className="animate-spin mx-auto text-ink-300"
                      size={16}
                    />
                  </div>
                ) : profiles.length === 0 ? (
                  <p className="text-xs text-ink-300 text-center py-4">
                    还没有保存的风格档案
                  </p>
                ) : (
                  <div className="space-y-2">
                    {profiles.map((p) => (
                      <div
                        key={p._id}
                        className="flex items-center gap-2 p-2 bg-surface-50 rounded border border-surface-200"
                      >
                        <Palette
                          size={12}
                          className="text-primary-500 shrink-0"
                        />
                        <span className="flex-1 text-xs text-ink-700 truncate">
                          {p.name}
                        </span>
                        <button
                          onClick={async () => {
                            try {
                              const resp = await styleApi.getPrompt(p._id);
                              setStylePrompt(resp.data.prompt);
                              setStyleData(p.styleData);
                            } catch {}
                          }}
                          className="text-[10px] text-primary-500 hover:text-primary-700"
                        >
                          加载
                        </button>
                        <button
                          onClick={() => handleDeleteProfile(p._id)}
                          className="text-ink-300 hover:text-red-500"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {styleData ? (
              <>
                <div className="bg-surface-0 border border-surface-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection("paragraph")}
                    className="w-full flex items-center justify-between p-3 hover:bg-surface-50"
                  >
                    <div className="flex items-center gap-2">
                      <AlignLeft size={14} className="text-primary-500" />
                      <span className="text-xs font-semibold text-ink-700">
                        段落风格
                      </span>
                      <span className="text-[10px] text-ink-300">
                        共 {styleData.paragraph.totalCount} 段
                      </span>
                    </div>
                    {expandedSection === "paragraph" ? (
                      <ChevronDown size={14} className="text-ink-300" />
                    ) : (
                      <ChevronRight size={14} className="text-ink-300" />
                    )}
                  </button>
                  {expandedSection === "paragraph" && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">平均长度</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.paragraph.avgLength} 字
                          </span>
                        </div>
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">中位数</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.paragraph.medianLength} 字
                          </span>
                        </div>
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">最短</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.paragraph.minLength} 字
                          </span>
                        </div>
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">最长</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.paragraph.maxLength} 字
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {renderBar(
                          "短段",
                          styleData.paragraph.distribution.short,
                          "bg-primary-300",
                        )}
                        {renderBar(
                          "中段",
                          styleData.paragraph.distribution.medium,
                          "bg-primary-400",
                        )}
                        {renderBar(
                          "长段",
                          styleData.paragraph.distribution.long,
                          "bg-primary-500",
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface-0 border border-surface-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection("sentence")}
                    className="w-full flex items-center justify-between p-3 hover:bg-surface-50"
                  >
                    <div className="flex items-center gap-2">
                      <Type size={14} className="text-primary-500" />
                      <span className="text-xs font-semibold text-ink-700">
                        句式风格
                      </span>
                      <span className="text-[10px] text-ink-300">
                        共 {styleData.sentence.totalCount} 句
                      </span>
                    </div>
                    {expandedSection === "sentence" ? (
                      <ChevronDown size={14} className="text-ink-300" />
                    ) : (
                      <ChevronRight size={14} className="text-ink-300" />
                    )}
                  </button>
                  {expandedSection === "sentence" && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">平均长度</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.sentence.avgLength} 字
                          </span>
                        </div>
                        <div className="p-2 bg-surface-50 rounded">
                          <span className="text-ink-400">中位数</span>
                          <br />
                          <span className="text-ink-800 font-medium">
                            {styleData.sentence.medianLength} 字
                          </span>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-2">
                        {renderBar(
                          "短句",
                          styleData.sentence.distribution.short,
                          "bg-accent-300",
                        )}
                        {renderBar(
                          "中句",
                          styleData.sentence.distribution.medium,
                          "bg-accent-400",
                        )}
                        {renderBar(
                          "长句",
                          styleData.sentence.distribution.long,
                          "bg-accent-500",
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-surface-0 border border-surface-200 overflow-hidden">
                  <button
                    onClick={() => toggleSection("other")}
                    className="w-full flex items-center justify-between p-3 hover:bg-surface-50"
                  >
                    <div className="flex items-center gap-2">
                      <Hash size={14} className="text-primary-500" />
                      <span className="text-xs font-semibold text-ink-700">
                        排版 & 语气 & 连接词
                      </span>
                    </div>
                    {expandedSection === "other" ? (
                      <ChevronDown size={14} className="text-ink-300" />
                    ) : (
                      <ChevronRight size={14} className="text-ink-300" />
                    )}
                  </button>
                  {expandedSection === "other" && (
                    <div className="px-3 pb-3 space-y-3 text-xs">
                      <div>
                        <p className="text-ink-400 mb-1">排版习惯</p>
                        <div className="flex flex-wrap gap-1.5">
                          {styleData.formatting.usesHeaders && (
                            <span className="px-2 py-0.5 bg-surface-100 rounded text-ink-600">
                              标题分段
                            </span>
                          )}
                          {styleData.formatting.usesLists && (
                            <span className="px-2 py-0.5 bg-surface-100 rounded text-ink-600">
                              列表罗列
                            </span>
                          )}
                          {styleData.formatting.usesQuotes && (
                            <span className="px-2 py-0.5 bg-surface-100 rounded text-ink-600">
                              引用块
                            </span>
                          )}
                          {styleData.formatting.usesBold && (
                            <span className="px-2 py-0.5 bg-surface-100 rounded text-ink-600">
                              加粗强调
                            </span>
                          )}
                          {!styleData.formatting.usesHeaders &&
                            !styleData.formatting.usesLists &&
                            !styleData.formatting.usesQuotes &&
                            !styleData.formatting.usesBold && (
                              <span className="text-ink-300">
                                纯文本，无特殊排版
                              </span>
                            )}
                        </div>
                      </div>
                      <div>
                        <p className="text-ink-400 mb-1">语气特征</p>
                        <p className="text-ink-600">
                          感叹号占比 {styleData.tone.exclamationRatio}% ·
                          问号占比 {styleData.tone.questionRatio}%
                        </p>
                      </div>
                      {styleData.connectors?.length > 0 && (
                        <div>
                          <p className="text-ink-400 mb-1">常用连接词</p>
                          <div className="flex flex-wrap gap-1.5">
                            {styleData.connectors.map((c, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded"
                              >
                                {c.text}({c.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {styleData.sentenceStarters?.length > 0 && (
                        <div>
                          <p className="text-ink-400 mb-1">常用句首</p>
                          <div className="flex flex-wrap gap-1.5">
                            {styleData.sentenceStarters.map((s, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-surface-100 text-ink-600 rounded"
                              >
                                {s.text}({s.count})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="bg-surface-0 border border-surface-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="wen-title text-ink-600">
                      风格提示词
                    </h3>
                    <button
                      onClick={handleCopyPrompt}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-ink-400 hover:bg-surface-100 rounded"
                    >
                      {copied ? (
                        <Check size={11} className="text-green-500" />
                      ) : (
                        <Copy size={11} />
                      )}
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  <pre className="text-xs text-ink-600 whitespace-pre-wrap bg-surface-50 p-3 max-h-48 overflow-y-auto font-sans leading-relaxed">
                    {stylePrompt}
                  </pre>
                </div>

                <div className="bg-surface-0 border border-surface-200 p-4">
                  <h3 className="wen-title text-ink-600 mb-2">
                    保存为风格档案
                  </h3>
                  <div className="flex gap-2">
                    <input
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="输入风格名称..."
                      className="flex-1 px-3 py-1.5 border border-surface-200 text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                    />
                    <button
                      onClick={handleSave}
                      disabled={saving || !profileName.trim()}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-ink-700 text-primary-50 text-xs hover:bg-ink-800 disabled:opacity-40"
                    >
                      {saving ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Save size={12} />
                      )}
                      保存
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-surface-0 border border-surface-200 p-12 text-center">
                <Palette size={32} className="text-ink-200 mx-auto mb-3" />
                <h3 className="wen-title mb-2">添加文章后开始分析</h3>
                <p className="text-xs text-ink-300">
                  导入 TXT/MD 文件或粘贴文本，分析写作风格
                </p>
              </div>
            )}
          </div>
        </div>
      </StepPageFrame>
    </AppShell>
  );
}
