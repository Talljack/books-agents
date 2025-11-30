"use client";

import { useState, useEffect, useCallback } from "react";
import {
  UserModelConfig,
  ModelInfo,
  PROVIDERS,
  DEFAULT_CONFIG,
  getProviderConfig,
  StoredModelConfig,
  LLMProvider,
} from "@/types/model-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// localStorage key
const STORAGE_KEY = "bookfinder-model-config";

/**
 * 从 localStorage 加载配置
 */
function loadConfig(): StoredModelConfig {
  if (typeof window === "undefined") {
    return {
      activeConfig: DEFAULT_CONFIG,
      savedConfigs: {},
    };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load config:", e);
  }

  return {
    activeConfig: DEFAULT_CONFIG,
    savedConfigs: {},
  };
}

/**
 * 保存配置到 localStorage
 */
function saveConfig(config: StoredModelConfig) {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save config:", e);
  }
}

/**
 * 模型设置组件
 */
export function ModelSettings({ onClose }: { onClose?: () => void }) {
  const [storedConfig, setStoredConfig] = useState<StoredModelConfig>(() => loadConfig());
  const [selectedProvider, setSelectedProvider] = useState<string>(
    storedConfig.activeConfig.provider
  );
  const [selectedModel, setSelectedModel] = useState<string>(storedConfig.activeConfig.model);
  const [apiKey, setApiKey] = useState<string>("");
  const [customBaseUrl, setCustomBaseUrl] = useState<string>("");
  const [ollamaHost, setOllamaHost] = useState<string>(
    storedConfig.activeConfig.ollamaHost || "http://localhost:11434"
  );
  const [customModel, setCustomModel] = useState<string>("");

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    error?: string;
    latency?: number;
    models?: string[];
  } | null>(null);
  const [saving, setSaving] = useState(false);

  // 动态模型列表
  const [dynamicModels, setDynamicModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const currentProvider = getProviderConfig(selectedProvider as LLMProvider);

  // 获取当前显示的模型列表
  const displayModels = dynamicModels.length > 0 ? dynamicModels : currentProvider?.models || [];

  // 动态获取模型列表
  const fetchModels = useCallback(
    async (provider: string, key?: string, baseUrl?: string) => {
      setLoadingModels(true);
      setModelsError(null);

      try {
        const params = new URLSearchParams({ provider });
        if (key) params.append("apiKey", key);
        if (baseUrl) params.append("baseUrl", baseUrl);

        const response = await fetch(`/api/model-config/models?${params.toString()}`);
        const data = await response.json();

        if (data.models && data.models.length > 0) {
          setDynamicModels(data.models);
          // 如果当前选择的模型不在列表中，选择第一个
          if (!data.models.find((m: ModelInfo) => m.id === selectedModel)) {
            setSelectedModel(data.models[0].id);
          }
          if (data.fallback) {
            setModelsError(data.error || "使用预定义模型列表");
          }
        } else {
          setDynamicModels([]);
          setModelsError(data.error || "未获取到模型列表");
        }
      } catch (e) {
        console.error("Failed to fetch models:", e);
        setDynamicModels([]);
        setModelsError("获取模型列表失败");
      } finally {
        setLoadingModels(false);
      }
    },
    [selectedModel]
  );

  // 加载保存的配置
  useEffect(() => {
    const saved = storedConfig.savedConfigs[selectedProvider];
    if (saved) {
      setApiKey(saved.apiKey || "");
      setCustomBaseUrl(saved.baseUrl || "");
      if (saved.lastModel) {
        setSelectedModel(saved.lastModel);
      }
    } else {
      setApiKey("");
      setCustomBaseUrl("");
      // 选择第一个模型
      if (currentProvider?.models.length) {
        setSelectedModel(currentProvider.models[0].id);
      }
    }
    // 重置动态模型列表
    setDynamicModels([]);
    setModelsError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider]);

  // 当服务商变化时，尝试获取模型列表
  // 只有 Ollama 和 OpenRouter 可以不需要 API Key 获取模型列表
  useEffect(() => {
    if (selectedProvider === "ollama") {
      // Ollama 是本地服务，不需要 API Key
      fetchModels("ollama", undefined, ollamaHost);
    } else if (selectedProvider === "openrouter") {
      // OpenRouter 的模型列表 API 是公开的，不需要 API Key
      fetchModels("openrouter", apiKey);
    }
    // 其他服务商需要 API Key 才能获取模型列表
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProvider, ollamaHost]);

  // 当 API Key 输入后，自动获取模型列表
  useEffect(() => {
    // 只有当 API Key 有值且不是 Ollama/OpenRouter 时才自动获取
    if (
      apiKey &&
      selectedProvider !== "ollama" &&
      selectedProvider !== "openrouter" &&
      currentProvider?.requiresApiKey
    ) {
      // 使用防抖，避免输入过程中频繁请求
      const timer = setTimeout(() => {
        fetchModels(selectedProvider, apiKey, customBaseUrl);
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, selectedProvider, customBaseUrl]);

  // 刷新模型列表按钮
  const handleRefreshModels = () => {
    if (selectedProvider === "ollama") {
      fetchModels("ollama", undefined, ollamaHost);
    } else {
      fetchModels(selectedProvider, apiKey, customBaseUrl);
    }
  };

  // 测试连接
  async function handleTest() {
    setTesting(true);
    setTestResult(null);

    try {
      const config: UserModelConfig = {
        provider: selectedProvider as LLMProvider,
        model: selectedProvider === "custom" ? customModel : selectedModel,
        apiKey: apiKey || undefined,
        baseUrl: customBaseUrl || undefined,
        ollamaHost: selectedProvider === "ollama" ? ollamaHost : undefined,
      };

      const response = await fetch("/api/model-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      setTestResult(result);

      // 如果测试返回了模型列表，更新动态模型
      if (result.models && result.models.length > 0) {
        setDynamicModels(result.models.map((m: string) => ({ id: m, name: m, isFree: true })));
      }
    } catch {
      setTestResult({ success: false, error: "测试请求失败" });
    } finally {
      setTesting(false);
    }
  }

  // 保存配置
  async function handleSave() {
    setSaving(true);

    const newConfig: StoredModelConfig = {
      activeConfig: {
        provider: selectedProvider as LLMProvider,
        model: selectedProvider === "custom" ? customModel : selectedModel,
        apiKey: apiKey || undefined,
        baseUrl: customBaseUrl || undefined,
        ollamaHost: selectedProvider === "ollama" ? ollamaHost : undefined,
      },
      savedConfigs: {
        ...storedConfig.savedConfigs,
        [selectedProvider]: {
          apiKey: apiKey || undefined,
          baseUrl: customBaseUrl || undefined,
          lastModel: selectedProvider === "custom" ? customModel : selectedModel,
        },
      },
    };

    saveConfig(newConfig);
    setStoredConfig(newConfig);

    // 通知服务器更新配置
    try {
      await fetch("/api/model-config/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newConfig.activeConfig),
      });
    } catch (e) {
      console.error("Failed to update server config:", e);
    }

    setSaving(false);
    onClose?.();
  }

  // 是否已从 API 获取到模型列表
  const hasApiModels = dynamicModels.length > 0;

  // 是否需要 API Key 但还没有输入
  const needsApiKey = currentProvider?.requiresApiKey && !apiKey;

  // 是否是不需要 API Key 就能获取模型列表的服务商
  const canFetchWithoutKey = selectedProvider === "ollama" || selectedProvider === "openrouter";

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h2 className="mb-6 text-2xl font-bold">模型设置</h2>

      {/* 当前配置显示 */}
      <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:bg-blue-900/20">
        <div className="text-sm">
          <strong>当前使用:</strong>{" "}
          <span className="text-blue-600 dark:text-blue-400">
            {getProviderConfig(storedConfig.activeConfig.provider)?.icon}{" "}
            {getProviderConfig(storedConfig.activeConfig.provider)?.name} /{" "}
            {storedConfig.activeConfig.model}
          </span>
        </div>
      </div>

      {/* Step 1: 服务商选择 */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
            1
          </span>
          <label className="text-sm font-medium">选择服务商</label>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => setSelectedProvider(provider.id)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                selectedProvider === provider.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
              }`}
            >
              <div className="mb-1 text-xl">{provider.icon}</div>
              <div className="text-sm font-medium">{provider.name}</div>
              <div className="truncate text-xs text-gray-500">{provider.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: API Key / Ollama 地址 配置 */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
            2
          </span>
          <label className="text-sm font-medium">
            {selectedProvider === "ollama" ? "配置 Ollama 地址" : "配置 API Key"}
          </label>
          {!currentProvider?.requiresApiKey && selectedProvider !== "ollama" && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-600">
              无需配置
            </span>
          )}
        </div>

        {/* Ollama Host */}
        {selectedProvider === "ollama" && (
          <div>
            <div className="flex gap-2">
              <Input
                value={ollamaHost}
                onChange={(e) => setOllamaHost(e.target.value)}
                placeholder="http://localhost:11434"
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshModels}
                disabled={loadingModels}
              >
                {loadingModels ? "检测中..." : "检测模型"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              默认为 http://localhost:11434，点击&quot;检测模型&quot;获取已安装的模型列表
            </p>
          </div>
        )}

        {/* API Key */}
        {currentProvider?.requiresApiKey && (
          <div>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`输入 ${currentProvider.name} API Key`}
                className="flex-1"
              />
              {apiKey && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshModels}
                  disabled={loadingModels}
                >
                  {loadingModels ? "获取中..." : "获取模型"}
                </Button>
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              API Key 仅保存在本地浏览器中，不会上传到服务器。
              {apiKey ? ' 点击"获取模型"可获取可用模型列表。' : " 请先输入 API Key。"}
            </p>
          </div>
        )}

        {/* 自定义 Base URL */}
        {selectedProvider === "custom" && (
          <div className="mt-3">
            <label className="mb-1 block text-xs font-medium text-gray-600">API 地址</label>
            <Input
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
            />
          </div>
        )}

        {/* OpenRouter 特殊提示 */}
        {selectedProvider === "openrouter" && (
          <p className="mt-1 text-xs text-blue-600">
            💡 OpenRouter 是唯一一个模型列表公开的付费服务商，可先选择模型再配置 API Key
          </p>
        )}
      </div>

      {/* Step 3: 模型选择 */}
      <div className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
            3
          </span>
          <label className="text-sm font-medium">选择模型</label>
          {selectedProvider !== "custom" && (
            <button
              onClick={handleRefreshModels}
              disabled={loadingModels || (needsApiKey && !canFetchWithoutKey)}
              className={`ml-auto flex items-center gap-1 text-xs ${
                loadingModels || (needsApiKey && !canFetchWithoutKey)
                  ? "cursor-not-allowed text-gray-400"
                  : "text-blue-500 hover:text-blue-600"
              }`}
            >
              {loadingModels ? <span className="animate-spin">⟳</span> : <span>🔄</span>}
              {loadingModels ? "加载中..." : "刷新列表"}
            </button>
          )}
        </div>

        {selectedProvider === "custom" ? (
          // 自定义: 手动输入
          <Input
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="输入模型名称，如 gpt-4"
          />
        ) : (
          // 显示模型列表（动态或预定义热门模型）
          <>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full rounded-lg border bg-white p-3 dark:bg-gray-800"
              disabled={loadingModels}
            >
              {displayModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} {model.isFree ? "🆓" : ""}{" "}
                  {model.description ? `- ${model.description}` : ""}
                </option>
              ))}
            </select>

            {/* 模型列表状态提示 */}
            {loadingModels && <p className="mt-1 text-xs text-blue-600">⏳ 正在获取模型列表...</p>}
            {modelsError && <p className="mt-1 text-xs text-amber-600">⚠️ {modelsError}</p>}
            {hasApiModels && !modelsError && !loadingModels && (
              <p className="mt-1 text-xs text-green-600">
                ✓ 已从 API 获取 {dynamicModels.length} 个可用模型
              </p>
            )}
            {!hasApiModels && !modelsError && !loadingModels && (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:bg-amber-900/20">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {needsApiKey && !canFetchWithoutKey ? (
                    <>
                      📋 当前显示 <strong>{currentProvider?.name}</strong> 的热门模型。
                      <br />
                      💡 输入 API Key 后将自动获取完整的可用模型列表。
                    </>
                  ) : (
                    <>
                      📋 显示预定义的热门模型列表。
                      <br />
                      💡 点击&quot;刷新列表&quot;可获取最新的模型列表。
                    </>
                  )}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* 测试结果 */}
      {testResult && (
        <div
          className={`mb-6 rounded-lg p-4 ${
            testResult.success
              ? "border border-green-200 bg-green-50 dark:bg-green-900/20"
              : "border border-red-200 bg-red-50 dark:bg-red-900/20"
          }`}
        >
          {testResult.success ? (
            <div className="text-green-700 dark:text-green-300">
              ✅ 连接成功！延迟: {testResult.latency}ms
            </div>
          ) : (
            <div className="text-red-700 dark:text-red-300">❌ {testResult.error}</div>
          )}
        </div>
      )}

      {/* 按钮 */}
      <div className="flex gap-3">
        <Button
          onClick={handleTest}
          disabled={testing || (needsApiKey && !canFetchWithoutKey)}
          variant="outline"
          className="flex-1"
        >
          {testing ? "测试中..." : "测试连接"}
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || (needsApiKey && !canFetchWithoutKey)}
          className="flex-1"
        >
          {saving ? "保存中..." : "保存配置"}
        </Button>
      </div>
    </div>
  );
}

/**
 * 导出获取当前配置的函数
 */
export function getCurrentModelConfig(): UserModelConfig {
  const stored = loadConfig();
  return stored.activeConfig;
}
