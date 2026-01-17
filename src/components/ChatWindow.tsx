/**
 * 聊天窗口主组件
 */

import { useChat } from '../hooks/useChat';
import { Header } from './Header';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import './ChatWindow.css';

export function ChatWindow() {
  const {
    messages,
    isLoading,
    error,
    models,
    selectedModel,
    setSelectedModel,
    sendMessage,
    clearMessages,
    stopGeneration,
  } = useChat();

  return (
    <div className="chat-window">
      <Header 
        onClear={clearMessages} 
        messageCount={messages.length}
      />
      
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      <MessageList messages={messages} isLoading={isLoading} />
      
      <MessageInput 
        onSend={sendMessage} 
        isLoading={isLoading}
        onStop={stopGeneration}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  );
}
