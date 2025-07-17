import React, { useState, useCallback } from 'react';
import { Upload, MessageSquare, FileText, Download } from 'lucide-react';
import type { Message } from 'ai';
import { ConversationView } from './components/ConversationView';
import { FileUpload } from './components/FileUpload';
import { JsonInput } from './components/JsonInput';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'json'>('upload');

  const handleMessagesLoaded = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
  }, []);

  const handleExport = useCallback(() => {
    const dataStr = JSON.stringify(messages, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'claude-conversation.json';
    link.click();
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-800 dark:text-slate-200">
              Claude Code History Viewer
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Parse and visualize Claude code history in AI SDK UIMessage format
          </p>
        </header>

        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6">
              <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button
                  onClick={() => setActiveTab('upload')}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === 'upload'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <Upload className="h-4 w-4 inline mr-2" />
                  Upload File
                </button>
                <button
                  onClick={() => setActiveTab('json')}
                  className={`px-4 py-2 font-medium text-sm rounded-t-lg transition-colors ${
                    activeTab === 'json'
                      ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  <FileText className="h-4 w-4 inline mr-2" />
                  Paste JSON
                </button>
              </div>

              {activeTab === 'upload' ? (
                <FileUpload 
                  onMessagesLoaded={handleMessagesLoaded}
                  loading={loading}
                  setLoading={setLoading}
                />
              ) : (
                <JsonInput 
                  onMessagesLoaded={handleMessagesLoaded}
                  loading={loading}
                  setLoading={setLoading}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-200">
                Conversation ({messages.length} messages)
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download className="h-4 w-4" />
                  Export JSON
                </button>
                <button
                  onClick={() => setMessages([])}
                  className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
            <ConversationView messages={messages} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App; 