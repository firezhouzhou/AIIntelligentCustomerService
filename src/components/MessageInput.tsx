/**
 * 消息输入组件 - 包含模型选择器
 */

import { useState, useRef, useEffect, KeyboardEvent, ChangeEvent } from 'react';
import { ModelInfo } from '../types/chat';
import './MessageInput.css';

interface MessageInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  onStop: () => void;
  models: ModelInfo[];
  selectedModel: string;
  onModelChange: (modelId: string) => void;
}

export function MessageInput({ 
  onSend, 
  isLoading, 
  onStop,
  models,
  selectedModel,
  onModelChange
}: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  // 获取当前选中的模型
  const currentModel = models.find(m => m.id === selectedModel) || models[0];

  // 自动调整文本框高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  // 点击外部关闭模型菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = () => {
    if (message.trim() && !isLoading) {
      onSend(message);
      setMessage('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleModelSelect = (modelId: string) => {
    onModelChange(modelId);
    setShowModelMenu(false);
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
    <div className="message-input-container">
      <div className="input-wrapper">
        {/* 模型选择按钮 */}
        <div className="model-selector-inline" ref={modelMenuRef}>
          <button 
            className="model-trigger-btn"
            onClick={() => setShowModelMenu(!showModelMenu)}
            disabled={isLoading}
            title="选择AI模型"
          >
            <span className="model-icon">{getModelIcon(currentModel?.id || '')}</span>
            <span className="model-name">{currentModel?.name || '选择模型'}</span>
            <svg className={`arrow ${showModelMenu ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6"/>
            </svg>
          </button>

          {/* 模型下拉菜单 */}
          {showModelMenu && (
            <div className="model-menu">
              <div className="model-menu-header">选择AI模型</div>
              {models.map(model => (
                <div 
                  key={model.id}
                  className={`model-menu-item ${model.id === selectedModel ? 'selected' : ''}`}
                  onClick={() => handleModelSelect(model.id)}
                >
                  <span className="model-icon">{getModelIcon(model.id)}</span>
                  <div className="model-info">
                    <span className="model-name">
                      {model.name}
                      {model.isDefault && <span className="default-tag">默认</span>}
                    </span>
                    <span className="model-desc">{model.description}</span>
                  </div>
                  {model.id === selectedModel && (
                    <span className="check-mark">✓</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 输入框 */}
        <textarea
          ref={textareaRef}
          className="message-input"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="输入您的问题... (Enter发送，Shift+Enter换行)"
          rows={1}
          disabled={isLoading}
        />
        
        {/* 发送/停止按钮 */}
        <div className="input-actions">
          {isLoading ? (
            <button className="stop-btn" onClick={onStop} title="停止生成">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button 
              className="send-btn" 
              onClick={handleSubmit} 
              disabled={!message.trim()}
              title="发送消息"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      <div className="input-tips">
        <span>💡 当前模型: <strong>{currentModel?.name}</strong> · 可点击左侧切换模型</span>
      </div>
    </div>
  );
}
