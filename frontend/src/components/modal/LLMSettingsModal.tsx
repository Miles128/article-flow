'use client';

import { useState, useEffect } from 'react';
import { X, Settings, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { clsx } from 'clsx';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LLMSettingsModal({ isOpen, onClose }: LLMSettingsModalProps) {
  const { llmConfig, setLlmConfig } = useAppStore();
  
  const [apiKey, setApiKey] = useState(llmConfig.apiKey);
  const [baseUrl, setBaseUrl] = useState(llmConfig.baseUrl);
  const [modelName, setModelName] = useState(llmConfig.modelName);
  const [temperature, setTemperature] = useState(llmConfig.temperature);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(llmConfig.apiKey);
      setBaseUrl(llmConfig.baseUrl);
      setModelName(llmConfig.modelName);
      setTemperature(llmConfig.temperature);
      setTestResult(null);
      setHasChanges(false);
    }
  }, [isOpen, llmConfig]);

  useEffect(() => {
    const changed = 
      apiKey !== llmConfig.apiKey ||
      baseUrl !== llmConfig.baseUrl ||
      modelName !== llmConfig.modelName ||
      temperature !== llmConfig.temperature;
    setHasChanges(changed);
  }, [apiKey, baseUrl, modelName, temperature, llmConfig]);

  function handleSave() {
    setLlmConfig({
      apiKey,
      baseUrl,
      modelName,
      temperature,
    });
    setHasChanges(false);
    onClose();
  }

  async function handleTestConnection() {
    if (!apiKey.trim()) {
      setTestResult('error');
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setTestResult('success');
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings size={20} className="text-gray-600" />
            <h2 className="text-xl font-bold text-gray-900">LLM 设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Base URL
            </label>
            <input
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              例如：https://api.openai.com/v1、https://api.deepseek.com/v1
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              模型名称
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="gpt-3.5-turbo"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm font-mono"
            />
            <p className="text-xs text-gray-500 mt-1">
              例如：gpt-3.5-turbo、gpt-4、deepseek-chat
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              温度: {temperature.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>精确</span>
              <span>平衡</span>
              <span>创意</span>
            </div>
          </div>

          {testResult && (
            <div className={clsx(
              'p-3 rounded-lg text-sm flex items-center gap-2',
              testResult === 'success' 
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}>
              {testResult === 'success' ? (
                <><Check size={16} /> 连接成功</>
              ) : (
                <>连接失败，请检查配置</>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={handleTestConnection}
            disabled={testing || !apiKey.trim()}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {testing && <Loader2 size={14} className="animate-spin" />}
            {testing ? '测试中...' : '测试连接'}
          </button>
          
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
