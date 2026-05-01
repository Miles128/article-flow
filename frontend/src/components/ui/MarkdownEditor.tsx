'use client';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Loader2
} from 'lucide-react';
import { clsx } from 'clsx';

type EditorMode = 'edit' | 'preview' | 'split';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  isSaving?: boolean;
  showToolbar?: boolean;
  placeholder?: string;
  minHeight?: number;
  onAIAction?: (action: string, selection?: string) => void;
}

const ToolbarButton: React.FC<{
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}> = ({ onClick, active, title, children }) => (
  <button
    onClick={onClick}
    title={title}
    className={clsx(
      'p-2 rounded hover:bg-gray-100 transition-colors',
      active ? 'bg-gray-100 text-primary-600' : 'text-gray-600'
    )}
  >
    {children}
  </button>
);

export function MarkdownEditor({
  value,
  onChange,
  onSave,
  isSaving = false,
  showToolbar = true,
  placeholder = '开始输入...',
  minHeight = 400,
  onAIAction
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<EditorMode>('split');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState<{ start: number; end: number; text: string } | null>(null);

  const insertMarkdown = (before: string, after: string = before, placeholder: string = '') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = value.substring(start, end) || placeholder;
    const newText = value.substring(0, start) + before + selectedText + after + value.substring(end);
    
    onChange(newText);
    
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(start + before.length, start + before.length + selectedText.length);
      }
    }, 0);
  };

  const insertLine = (prefix: string, placeholder: string = '') => {
    if (!textareaRef.current) return;
    
    const start = textareaRef.current.selectionStart;
    const lineStart = value.lastIndexOf('\n', start - 1) + 1;
    const beforeLine = value.substring(0, lineStart);
    const afterLine = value.substring(start);
    const currentLine = value.substring(lineStart, start);
    
    const newText = beforeLine + prefix + (currentLine || placeholder) + afterLine;
    onChange(newText);
  };

  const handleSelectionChange = () => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    if (start !== end) {
      setSelection({
        start,
        end,
        text: value.substring(start, end)
      });
    } else {
      setSelection(null);
    }
  };

  const wordCount = value.trim() ? value.trim().split(/\s+|[\u4e00-\u9fa5]|[\n\r]/).filter(Boolean).length : 0;
  const charCount = value.length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      {showToolbar && (
        <div className="border-b border-gray-200 px-2 py-1 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-1 flex-wrap">
            <ToolbarButton onClick={() => insertMarkdown('**', '**', '粗体文字')} title="粗体 (Ctrl+B)">
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('*', '*', '斜体文字')} title="斜体 (Ctrl+I)">
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('~~', '~~', '删除线')} title="删除线">
              <Strikethrough size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <ToolbarButton onClick={() => insertLine('# ', '一级标题')} title="一级标题">
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertLine('## ', '二级标题')} title="二级标题">
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertLine('### ', '三级标题')} title="三级标题">
              <Heading3 size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <ToolbarButton onClick={() => insertLine('- ', '列表项')} title="无序列表">
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertLine('1. ', '列表项')} title="有序列表">
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertLine('- [ ] ', '任务')} title="任务列表">
              <CheckSquare size={16} />
            </ToolbarButton>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <ToolbarButton onClick={() => insertLine('> ', '引用文字')} title="引用">
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('`', '`', '代码')} title="行内代码">
              <Code size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('```\n', '\n```', '代码块')} title="代码块">
              <Code2 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('[', '](链接地址)', '链接文字')} title="链接">
              <Link size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertMarkdown('![', '](图片地址)', '图片描述')} title="图片">
              <Image size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => insertLine('---\n', '')} title="分割线">
              <Minus size={16} />
            </ToolbarButton>
          </div>

          <div className="flex items-center gap-2">
            {onAIAction && (
              <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-2">
                <button
                  onClick={() => onAIAction('continue', selection?.text)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors text-sm"
                  title="AI 续写"
                >
                  <Sparkles size={14} />
                  续写
                </button>
                {selection && (
                  <>
                    <button
                      onClick={() => onAIAction('polish', selection.text)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors text-sm"
                      title="AI 润色"
                    >
                      润色
                    </button>
                    <button
                      onClick={() => onAIAction('expand', selection.text)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                      title="AI 扩写"
                    >
                      扩写
                    </button>
                  </>
                )}
              </div>
            )}

            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setMode('edit')}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  mode === 'edit' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                )}
                title="编辑模式"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => setMode('split')}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  mode === 'split' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                )}
                title="双栏模式"
              >
                <Columns size={16} />
              </button>
              <button
                onClick={() => setMode('preview')}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  mode === 'preview' ? 'bg-white shadow text-primary-600' : 'text-gray-500 hover:text-gray-700'
                )}
                title="预览模式"
              >
                <Eye size={16} />
              </button>
            </div>

            {onSave && (
              <button
                onClick={onSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={14} />
                ) : (
                  <Save size={14} />
                )}
                {isSaving ? '保存中...' : '保存'}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex min-h-[400px]" style={{ minHeight: minHeight }}>
        {(mode === 'edit' || mode === 'split') && (
          <div className={clsx(
            'flex-1 flex flex-col',
            mode === 'split' && 'border-r border-gray-200'
          )}>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onSelect={handleSelectionChange}
              onClick={handleSelectionChange}
              onKeyUp={handleSelectionChange}
              placeholder={placeholder}
              className="flex-1 w-full p-4 resize-none focus:outline-none font-mono text-sm leading-relaxed"
              spellCheck={false}
            />
          </div>
        )}

        {(mode === 'preview' || mode === 'split') && (
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 prose prose-slate max-w-none prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
              {value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      return !isInline ? (
                        <SyntaxHighlighter
                          style={tomorrow as any}
                          language={match ? match[1] : 'text'}
                          PreTag="div"
                          className="rounded-lg text-sm"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-red-600" {...props}>
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
                      return <th className="border border-gray-300 px-4 py-2 text-left font-semibold">{children}</th>;
                    },
                    td({ children }) {
                      return <td className="border border-gray-300 px-4 py-2">{children}</td>;
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
                          alt={alt || ''}
                          className="max-w-full h-auto rounded-lg shadow"
                        />
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a href={href} className="text-primary-600 hover:underline" target="_blank" rel="noopener noreferrer">
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

      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <span>字数: {wordCount}</span>
          <span>字符: {charCount}</span>
          <span>行数: {value.split('\n').length}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400">支持 Markdown 语法</span>
        </div>
      </div>
    </div>
  );
}
