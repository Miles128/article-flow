"use client";

import {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Bold,
  Italic,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Link,
  Image,
  Heading1,
  Heading2,
  Heading3,
  Code2,
  CheckSquare,
  Minus,
  Eye,
  Edit3,
  Columns,
  Save,
  Undo,
  Redo,
  Copy,
  Sparkles,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { countArticleWords } from "@/lib/textUtils";

type EditorMode = "edit" | "preview" | "split";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  showToolbar?: boolean;
  seamlessToolbar?: boolean;
  placeholder?: string;
  minHeight?: number | string;
  onAIAction?: (action: string, selection?: string) => void;
  aiBusyAction?: string | null;
  onSelectionChange?: (
    selection: { start: number; end: number; text: string } | null,
  ) => void;
}

export interface MarkdownEditorHandle {
  insertAtCursor: (text: string) => void;
  focus: () => void;
  scrollToTop: () => void;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={clsx(
      "p-1.5 text-ink-500 hover:text-ink-900 transition-colors",
      active && "text-primary-600",
    )}
  >
    {children}
  </button>
);

export const MarkdownEditor = forwardRef<
  MarkdownEditorHandle,
  MarkdownEditorProps
>(function MarkdownEditor(
  {
    value,
    onChange,
    onSave,
    isSaving = false,
    showToolbar = true,
    seamlessToolbar = false,
    placeholder = "开始输入...",
    minHeight = 400,
    onAIAction,
    aiBusyAction = null,
    onSelectionChange,
  },
  ref,
) {
  const [mode, setMode] = useState<EditorMode>("split");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const caretRef = useRef({ start: 0, end: 0 });
  const [selection, setSelection] = useState<{
    start: number;
    end: number;
    text: string;
  } | null>(null);

  const updateCaret = () => {
    if (!textareaRef.current) return;
    caretRef.current = {
      start: textareaRef.current.selectionStart,
      end: textareaRef.current.selectionEnd,
    };
  };

  useImperativeHandle(
    ref,
    () => ({
      insertAtCursor(text: string) {
        const el = textareaRef.current;
        const start =
          el && document.activeElement === el
            ? el.selectionStart
            : caretRef.current.start;
        const end =
          el && document.activeElement === el
            ? el.selectionEnd
            : caretRef.current.end;
        const newText = value.substring(0, start) + text + value.substring(end);
        onChange(newText);
        const pos = start + text.length;
        caretRef.current = { start: pos, end: pos };
        setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(pos, pos);
          }
        }, 0);
      },
      focus() {
        textareaRef.current?.focus();
      },
      scrollToTop() {
        const el = textareaRef.current;
        if (el) el.scrollTop = 0;
      },
    }),
    [value, onChange],
  );

  const insertMarkdown = (
    before: string,
    after: string = before,
    placeholder: string = "",
  ) => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;
    const newText =
      value.substring(0, start) +
      before +
      selectedText +
      after +
      value.substring(end);

    onChange(newText);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(
          start + before.length,
          start + before.length + selectedText.length,
        );
      }
    }, 0);
  };

  const insertLine = (prefix: string, placeholder: string = "") => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const beforeLine = value.substring(0, lineStart);
    const afterLine = value.substring(start);
    const currentLine = value.substring(lineStart, start);

    const newText =
      beforeLine + prefix + (currentLine || placeholder) + afterLine;
    onChange(newText);
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    updateCaret();
    if (start !== end) {
      const next = {
        start,
        end,
        text: value.substring(start, end),
      };
      setSelection(next);
      onSelectionChange?.(next);
    } else {
      setSelection(null);
      onSelectionChange?.(null);
    }
  };

  const statsText = selection?.text?.trim() ? selection.text : value;
  const wordCount = countArticleWords(statsText);
  const charCount = value.length;

  return (
    <div
      className={clsx(
        "overflow-hidden bg-surface-50/70 backdrop-blur-[2px]",
        seamlessToolbar
          ? "border-x border-b border-surface-300 border-t-0"
          : "border border-surface-300",
      )}
    >
      {showToolbar && (
        <div
          className={clsx(
            seamlessToolbar
              ? "wen-toolbar-seamless border-b border-surface-300"
              : "wen-toolbar",
            "flex-wrap gap-1",
          )}
        >
          <div className="flex items-center gap-0.5 flex-wrap">
            <ToolbarButton
              onClick={() => insertMarkdown("**", "**", "粗体文字")}
              title="粗体 (Ctrl+B)"
            >
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("*", "*", "斜体文字")}
              title="斜体 (Ctrl+I)"
            >
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("~~", "~~", "删除线")}
              title="删除线"
            >
              <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-surface-300 mx-0.5" />

            <ToolbarButton
              onClick={() => insertLine("# ", "一级标题")}
              title="一级标题"
            >
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertLine("## ", "二级标题")}
              title="二级标题"
            >
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertLine("### ", "三级标题")}
              title="三级标题"
            >
              <Heading3 size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-surface-300 mx-0.5" />

            <ToolbarButton
              onClick={() => insertLine("- ", "列表项")}
              title="无序列表"
            >
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertLine("1. ", "列表项")}
              title="有序列表"
            >
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertLine("- [ ] ", "任务")}
              title="任务列表"
            >
              <CheckSquare size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-surface-300 mx-0.5" />

            <ToolbarButton
              onClick={() => insertLine("> ", "引用文字")}
              title="引用"
            >
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("`", "`", "代码")}
              title="行内代码"
            >
              <Code size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("```\n", "\n```", "代码块")}
              title="代码块"
            >
              <Code2 size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("[", "](链接地址)", "链接文字")}
              title="链接"
            >
              <Link size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertMarkdown("![", "](图片地址)", "图片描述")}
              title="图片"
            >
              <Image size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => insertLine("---\n", "")}
              title="分割线"
            >
              <Minus size={16} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            {onAIAction && (
              <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-2">
                <button
                  type="button"
                  onClick={() => onAIAction("continue", selection?.text)}
                  disabled={!!aiBusyAction}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm disabled:opacity-50"
                  title="AI 续写"
                >
                  {aiBusyAction === "continue" ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  续写
                </button>
                {selection && (
                  <>
                    <button
                      type="button"
                      onClick={() => onAIAction("polish", selection.text)}
                      disabled={!!aiBusyAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-accent-50 text-accent-600 rounded-lg hover:bg-accent-100 transition-colors text-sm disabled:opacity-50"
                      title="AI 润色"
                    >
                      {aiBusyAction === "polish" ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : null}
                      润色
                    </button>
                    <button
                      type="button"
                      onClick={() => onAIAction("expand", selection.text)}
                      disabled={!!aiBusyAction}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm disabled:opacity-50"
                      title="AI 扩写"
                    >
                      {aiBusyAction === "expand" ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : null}
                      扩写
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="w-px h-5 bg-surface-300 mx-0.5" />

            <div className="flex items-center gap-2 text-xs text-ink-500 border-l border-surface-300 pl-2">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={clsx(
                  "hover:text-ink-900 transition-colors",
                  mode === "edit" && "text-primary-600 font-kaiti",
                )}
              >
                编辑
              </button>
              <button
                type="button"
                onClick={() => setMode("split")}
                className={clsx(
                  "hover:text-ink-900 transition-colors",
                  mode === "split" && "text-primary-600 font-kaiti",
                )}
              >
                双栏
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={clsx(
                  "hover:text-ink-900 transition-colors",
                  mode === "preview" && "text-primary-600 font-kaiti",
                )}
              >
                预览
              </button>
            </div>

            {onSave && (
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="wen-btn-seal text-sm"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? "保存中..." : "保存"}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex min-h-[400px]" style={{ minHeight: minHeight }}>
        {(mode === "edit" || mode === "split") && (
          <div
            className={clsx(
              "flex-1 flex flex-col",
              mode === "split" && "border-r border-surface-300",
            )}
          >
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onSelect={handleSelectionChange}
              onClick={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              onBlur={updateCaret}
              placeholder={placeholder}
              className="flex-1 w-full p-4 resize-none focus:outline-none font-editor text-[15px] leading-[1.9] text-ink-800 bg-transparent placeholder:text-ink-300"
              spellCheck={false}
            />
          </div>
        )}

        {(mode === "preview" || mode === "split") && (
          <div className="flex-1 overflow-y-auto bg-surface-50/40">
            <div className="md-preview font-editor p-6 max-w-none">
              {value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1({ children }) {
                      return (
                        <h1 className="wen-title mt-8 mb-4 pb-2 border-b-2 border-primary-200 first:mt-0">
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }) {
                      return (
                        <h2 className="wen-title mt-7 mb-3 pl-3 border-l-4 border-primary-500">
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }) {
                      return (
                        <h3 className="wen-title mt-5 mb-2">{children}</h3>
                      );
                    },
                    h4({ children }) {
                      return (
                        <h4 className="wen-title mt-4 mb-2">{children}</h4>
                      );
                    },
                    h5({ children }) {
                      return (
                        <h5 className="wen-title mt-3 mb-1">{children}</h5>
                      );
                    },
                    h6({ children }) {
                      return (
                        <h6 className="wen-title mt-3 mb-1 text-ink-500">
                          {children}
                        </h6>
                      );
                    },
                    p({ children }) {
                      return (
                        <p className="text-[15px] leading-[1.85] text-ink-700 my-3">
                          {children}
                        </p>
                      );
                    },
                    strong({ children }) {
                      return (
                        <strong className="font-semibold text-ink-900">
                          {children}
                        </strong>
                      );
                    },
                    em({ children }) {
                      return (
                        <em className="italic text-ink-600">{children}</em>
                      );
                    },
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const isInline = !match;
                      return !isInline ? (
                        <SyntaxHighlighter
                          style={tomorrow as any}
                          language={match ? match[1] : "text"}
                          PreTag="div"
                          className="rounded-lg text-sm"
                        >
                          {String(children).replace(/\n$/, "")}
                        </SyntaxHighlighter>
                      ) : (
                        <code
                          className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-red-600"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    table({ children }) {
                      return (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border-collapse border border-gray-300">
                            {children}
                          </table>
                        </div>
                      );
                    },
                    thead({ children }) {
                      return <thead className="bg-gray-100">{children}</thead>;
                    },
                    th({ children }) {
                      return (
                        <th className="border border-gray-300 px-4 py-2 text-left font-semibold">
                          {children}
                        </th>
                      );
                    },
                    td({ children }) {
                      return (
                        <td className="border border-gray-300 px-4 py-2">
                          {children}
                        </td>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-600">
                          {children}
                        </blockquote>
                      );
                    },
                    ul({ children }) {
                      return <ul className="list-disc pl-6">{children}</ul>;
                    },
                    ol({ children }) {
                      return <ol className="list-decimal pl-6">{children}</ol>;
                    },
                    li({ children }) {
                      return <li className="my-1">{children}</li>;
                    },
                    hr() {
                      return <hr className="my-4 border-gray-300" />;
                    },
                    img({ src, alt }) {
                      return (
                        <img
                          src={src}
                          alt={alt || ""}
                          className="max-w-full h-auto rounded-lg shadow"
                        />
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          className="text-primary-600 hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {value}
                </ReactMarkdown>
              ) : (
                <p className="text-gray-400 italic">暂无内容</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-surface-300 px-4 py-2 flex items-center justify-between text-xs text-ink-400">
        <div className="flex items-center gap-4 text-ink-400">
          <span>
            {selection?.text?.trim() ? "选中" : "字数"}:{" "}
            <span className="font-kaiti tabular-nums text-ink-600">
              {wordCount}
            </span>
          </span>
          <span>
            字符:{" "}
            <span className="font-kaiti tabular-nums text-ink-600">
              {selection?.text?.trim() ? selection.text.length : charCount}
            </span>
          </span>
        </div>
        <span className="text-ink-300">Markdown</span>
      </div>
    </div>
  );
});
