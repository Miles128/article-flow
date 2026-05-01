'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppStore } from '@/lib/store';
import { researchApi } from '@/lib/api/client';
import type { ResearchMaterial } from '@/types';
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
  Copy
} from 'lucide-react';
import { clsx } from 'clsx';

const sourceTypes = [
  { id: 'web', label: '网页', icon: Link2 },
  { id: 'file', label: '文件', icon: FileText },
  { id: 'image', label: '图片', icon: Image },
];

export default function ResearchPage() {
  const params = useParams();
  const { currentProject, setCurrentStep } = useAppStore();
  const [materials, setMaterials] = useState<ResearchMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState('web');
  const [urlInput, setUrlInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState<string | null>(null);

  useEffect(() => {
    setCurrentStep(3);
    loadMaterials();
  }, []);

  async function loadMaterials() {
    if (!params.id) return;
    try {
      setLoading(true);
      const response = await researchApi.getByProject(params.id as string);
      setMaterials(response.data);
    } catch (error) {
      console.error('Failed to load materials:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchUrl() {
    if (!urlInput.trim()) return;
    setIsFetching(true);
    try {
      const response = await researchApi.fetchUrl(urlInput.trim());
      setTextInput(response.data.content);
    } catch (error) {
      console.error('Failed to fetch URL:', error);
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
        title: '资料标题',
        content: textInput,
        summary: '',
        keywords: [],
        citation: '',
      });
      setShowAddModal(false);
      setUrlInput('');
      setTextInput('');
      loadMaterials();
    } catch (error) {
      console.error('Failed to add material:', error);
    }
  }

  async function summarizeMaterial(materialId: string, content: string) {
    setIsSummarizing(materialId);
    try {
      await researchApi.summarize(content, 100);
    } catch (error) {
      console.error('Failed to summarize:', error);
    } finally {
      setIsSummarizing(null);
    }
  }

  async function deleteMaterial(materialId: string) {
    try {
      await researchApi.delete(materialId);
      loadMaterials();
    } catch (error) {
      console.error('Failed to delete material:', error);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="text-primary-500" size={24} />
              搜集资料
            </h2>
            <p className="text-gray-500 mt-1">多源内容采集、智能摘要生成、关键词提取</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            添加资料
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin h-10 w-10 text-primary-500 mx-auto" />
        </div>
      ) : materials.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-16 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">还没有资料</h3>
          <p className="text-gray-500 mb-6">添加网页、文件或图片作为参考资料</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            <Plus size={18} />
            添加第一个资料
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {materials.map((material) => {
            const Icon = sourceTypes.find(t => t.id === material.sourceType)?.icon || FileText;
            return (
              <div key={material._id} className="bg-white rounded-xl border border-gray-200 p-6 hover:border-primary-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon size={20} className="text-primary-500" />
                    <span className="text-sm text-gray-500 capitalize">{material.sourceType}</span>
                  </div>
                  <button
                    onClick={() => deleteMaterial(material._id)}
                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <h3 className="font-medium text-gray-900 mb-2">{material.title}</h3>
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
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">{material.content}</p>
                {material.keywords && material.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {material.keywords.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => summarizeMaterial(material._id, material.content)}
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
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">添加资料</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                          'flex-1 py-3 rounded-lg border-2 transition-colors',
                          selectedSourceType === type.id
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <Icon
                          size={20}
                          className={clsx(
                            'mx-auto mb-1',
                            selectedSourceType === type.id
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          )}
                        />
                        <span className={clsx(
                          'text-sm font-medium',
                          selectedSourceType === type.id
                            ? 'text-primary-700'
                            : 'text-gray-600'
                        )}>
                          {type.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedSourceType === 'web' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  网页 URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
                  />
                  <button
                    onClick={fetchUrl}
                    disabled={isFetching || !urlInput.trim()}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {isFetching ? <Loader2 className="animate-spin" size={18} /> : '获取'}
                  </button>
                </div>
              </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  内容
                </label>
                <textarea
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder="粘贴或输入内容..."
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={addMaterial}
                disabled={!textInput.trim()}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
