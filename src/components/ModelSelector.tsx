/**
 * 模型选择器组件
 */

import { useState, useEffect, useRef } from 'react';
import { ModelInfo } from '../types/chat';
import './ModelSelector.css';

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ 
  models, 
  selectedModel, 
  onModelChange,
  disabled = false 
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 获取当前选中的模型信息
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
  };

  // 获取模型图标
  const getModelIcon = (modelId: string) => {
    const icons: Record<string, string> = {
      'qwen': '🌟',
      'deepseek': '🔮',
      'doubao': '🫧',
      'zhipu': '✨',
    };
    return icons[modelId] || '🤖';
  };

  return (
    <div className={`model-selector ${disabled ? 'disabled' : ''}`} ref={dropdownRef}>
      <button 
        className="model-selector-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <span className="model-icon">{getModelIcon(currentModel?.id || '')}</span>
        <span className="model-name">{currentModel?.name || '选择模型'}</span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="model-dropdown">
          {models.map(model => (
            <div 
              key={model.id}
              className={`model-option ${model.id === selectedModel ? 'selected' : ''}`}
              onClick={() => handleSelect(model.id)}
            >
              <span className="model-icon">{getModelIcon(model.id)}</span>
              <div className="model-info">
                <span className="model-name">
                  {model.name}
                  {model.isDefault && <span className="default-badge">默认</span>}
                </span>
                <span className="model-description">{model.description}</span>
              </div>
              {model.id === selectedModel && (
                <span className="check-icon">✓</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
