'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { outlineApi } from '@/lib/api/client';
import type { OutlineNode } from '@/types';
import { 
  ListOrdered, 
  Plus, 
  Trash2, 
  GripVertical,
  Sparkles,
  Loader2,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { clsx } from 'clsx';

export default function OutlinePage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [outline, setOutline] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateTopic, setGenerateTopic] = useState('');

  useEffect(() => {
    setCurrentStep(4);
    loadOutline();
    loadTemplates();
  }, []);

  async function loadOutline() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await outlineApi.getByProject(params.id as string);
      setOutline(response.data);
    } catch (error) {
      console.error('Failed to load outline:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadTemplates() {
    try {
      const response = await outlineApi.getTemplates();
      setTemplates(response.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  async function generateOutline() {
    if (!generateTopic.trim()) return;
    setIsGenerating(true);
    try {
      const response = await outlineApi.generate({
        topic: generateTopic,
        targetWordCount: currentProject?.targetWordCount || 2000,
      });
      setOutline(response.data);
    } catch (error) {
      console.error('Failed to generate outline:', error);
    } finally {
      setIsGenerating(false);
    }
  }

  function addNode(parentId?: string | number) {
    const newNode: OutlineNode = {
      id: Date.now(),
      title: '新节点',
      content: '',
      children: [],
    };
    
    if (outline) {
      const newOutline = { ...outline };
      if (parentId) {
        const addToParent = (nodes: OutlineNode[]): OutlineNode[] => {
          return nodes.map(node => {
            if (node.id === parentId) {
              return {
                ...node,
                children: [...(node.children || []), newNode],
              };
            }
            if (node.children) {
              return { ...node, children: addToParent(node.children) };
            }
            return node;
          });
        };
        newOutline.nodes = addToParent(newOutline.nodes || []);
      } else {
        newOutline.nodes = [...(newOutline.nodes || []), newNode];
      }
      setOutline(newOutline);
    } else {
      setOutline({
        title: '文章大纲',
        nodes: [newNode],
      });
    }
  }

  function updateNode(id: string | number, title: string) {
    if (!outline) return;
    
    const updateRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map(node => {
        if (node.id === id) {
          return { ...node, title };
        }
        if (node.children) {
          return { ...node, children: updateRecursive(node.children) };
        }
        return node;
      });
    };
    
    setOutline({
      ...outline,
      nodes: updateRecursive(outline.nodes || []),
    });
  }

  function deleteNode(id: string | number) {
    if (!outline) return;
    
    const deleteRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.filter(node => node.id !== id).map(node => {
        if (node.children) {
          return { ...node, children: deleteRecursive(node.children) };
        }
        return node;
      });
    };
    
    setOutline({
      ...outline,
      nodes: deleteRecursive(outline.nodes || []),
    });
  }

  function renderNode(node: OutlineNode, level: number = 0) {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(node.title);
    
    const hasChildren = node.children && node.children.length > 0;
    
    return (
      <div key={node.id} className="select-none">
        <div 
          className={clsx(
            'group flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 transition-colors',
            { 'ml-6': level > 0 }
          )}
        >
          <GripVertical size={16} className="text-gray-300 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {hasChildren ? (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-6" />
          )}
          
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                updateNode(node.id, editTitle);
                setIsEditing(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  updateNode(node.id, editTitle);
                  setIsEditing(false);
                }
              }}
              className="flex-1 px-2 py-1 border border-primary-300 rounded focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              autoFocus
            />
          ) : (
            <span 
              onClick={() => setIsEditing(true)}
              className="flex-1 text-sm cursor-text"
            >
              {node.title}
            </span>
          )}
          
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => addNode(node.id)}
              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
              title="添加子节点"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => deleteNode(node.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="删除节点"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <ListOrdered className="text-primary-500" size={24} />
              列出大纲
            </h2>
            <p className="text-gray-500 mt-1">AI 智能生成、拖拽式编辑、模板库支持</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <ListOrdered size={16} />
              模板
            </button>
            <button
              onClick={() => addNode()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
            >
              <Plus size={16} />
              添加节点
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {(!outline || !outline.nodes || outline.nodes.length === 0) ? (
              <div className="text-center py-16">
                <ListOrdered className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">还没有大纲</h3>
                <p className="text-gray-500 mb-6">使用 AI 生成或手动创建大纲</p>
                <button
                  onClick={() => addNode()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                >
                  <Plus size={16} />
                  创建第一个节点
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900">{outline.title || '文章大纲'}</h3>
                </div>
                {outline.nodes?.map((node: OutlineNode) => renderNode(node))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-primary-500" />
              AI 生成大纲
            </h3>
            
            <div className="space-y-3">
              <textarea
                value={generateTopic}
                onChange={(e) => setGenerateTopic(e.target.value)}
                placeholder="输入文章主题，让 AI 帮你生成大纲..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm resize-none"
              />
              <button
                onClick={generateOutline}
                disabled={isGenerating || !generateTopic.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 text-sm"
              >
                {isGenerating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <Sparkles size={16} />
                )}
                生成大纲
              </button>
            </div>
          </div>

          {showTemplates && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">大纲模板</h3>
              <div className="space-y-2">
                {templates.map((template, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setOutline({
                        title: template.name,
                        nodes: template.structure,
                      });
                      setShowTemplates(false);
                    }}
                    className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all"
                  >
                    <p className="font-medium text-gray-900 text-sm">{template.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">操作提示</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-600">1</span>
                </div>
                <span>点击节点文字进行编辑</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-600">2</span>
                </div>
                <span>点击 + 按钮添加子节点</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded bg-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary-600">3</span>
                </div>
                <span>点击箭头展开/折叠子节点</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
