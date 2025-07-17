import React, { useState, useCallback } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import type { Message } from 'ai';

interface JsonInputProps {
  onMessagesLoaded: (messages: Message[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function JsonInput({ onMessagesLoaded, loading, setLoading }: JsonInputProps) {
  const [jsonText, setJsonText] = useState('');

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      if (!jsonText.trim()) return;

      setLoading(true);
      try {
        const parsed = JSON.parse(jsonText);
        
        if (!Array.isArray(parsed)) {
          throw new Error('JSON must be an array of Message objects');
        }

        // Basic validation
        for (const item of parsed) {
          if (!item.id || !item.role || typeof item.content !== 'string') {
            throw new Error('Invalid Message format. Each message must have id, role, and content fields.');
          }
          if (!['user', 'assistant'].includes(item.role)) {
            throw new Error('Message role must be either "user" or "assistant"');
          }
        }

        onMessagesLoaded(parsed as Message[]);
        setJsonText('');
      } catch (error) {
        alert(`Error parsing JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    },
    [jsonText, onMessagesLoaded, setLoading]
  );

  const handleLoadSample = useCallback(() => {
    const sampleData: Message[] = [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello! Can you help me with a coding problem?'
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Of course! I\'d be happy to help you with your coding problem. What specific issue are you working on?'
      },
      {
        id: 'msg-3',
        role: 'user',
        content: 'I need to create a function that sorts an array of numbers.'
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'I\'ll help you create a sorting function. Let me show you a few different approaches.',
        toolInvocations: [
          {
            state: 'result',
            toolCallId: 'call_123',
            toolName: 'code_editor',
            args: {
              language: 'javascript',
              code: 'function sortNumbers(arr) {\n  return arr.sort((a, b) => a - b);\n}'
            },
            result: 'Function created successfully'
          }
        ]
      }
    ];
    
    setJsonText(JSON.stringify(sampleData, null, 2));
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="json-input" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Paste UIMessage JSON Array
        </label>
        <textarea
          id="json-input"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder="Paste your UIMessage array here..."
          className="w-full h-40 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-slate-200 font-mono text-sm"
          disabled={loading}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={!jsonText.trim() || loading}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <FileText className="h-4 w-4" />
          {loading ? 'Processing...' : 'Load Messages'}
        </button>
        
        <button
          type="button"
          onClick={handleLoadSample}
          disabled={loading}
          className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          Load Sample
        </button>
      </div>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-1">Expected format:</p>
            <pre className="text-xs bg-amber-100 dark:bg-amber-900/40 p-2 rounded mt-2 overflow-x-auto">
{`[
  {
    "id": "unique-id",
    "role": "user" | "assistant",
    "content": "message content",
    "toolInvocations": [...] // optional
  }
]`}
            </pre>
          </div>
        </div>
      </div>
    </form>
  );
} 