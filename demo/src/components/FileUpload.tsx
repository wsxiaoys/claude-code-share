import React, { useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import type { Message } from 'ai';

interface FileUploadProps {
  onMessagesLoaded: (messages: Message[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function FileUpload({ onMessagesLoaded, loading, setLoading }: FileUploadProps) {
  const processJSONLFile = useCallback((content: string): Message[] => {
    try {
      const lines = content.split('\n').filter(Boolean);
      const parsedData = lines.map((line) => JSON.parse(line));
      
      // Build a map of tool results by tool call ID
      const toolResultsMap = new Map<string, any>();
      parsedData.forEach((item) => {
        if (item.message && Array.isArray(item.message.content)) {
          item.message.content.forEach((c: any) => {
            if (c.type === 'tool_result' && c.tool_use_id) {
              toolResultsMap.set(c.tool_use_id, c);
            }
          });
        }
      });

      const extractedMessages: Message[] = parsedData
        .map((item) => {
          if (!item.message) {
            return null;
          }

          // Handle assistant messages
          if (item.type === 'assistant' && item.message.role === 'assistant') {
            const toolInvocations: any[] = [];
            let textContent = '';

            if (typeof item.message.content === 'string') {
              textContent = item.message.content;
            } else if (Array.isArray(item.message.content)) {
              item.message.content.forEach((c: any) => {
                if (c.type === 'text' && c.text) {
                  textContent += c.text;
                } else if (c.type === 'tool_use' && c.id && c.name) {
                  // Check if we have a result for this tool call
                  const toolResult = toolResultsMap.get(c.id);

                  const toolInvocation = {
                    state: toolResult ? 'result' : 'call',
                    toolCallId: c.id,
                    toolName: c.name,
                    args: c.input || {},
                    ...(toolResult && { result: toolResult.content || '' }),
                  };
                  toolInvocations.push(toolInvocation);
                }
              });
            }

            return {
              id: item.uuid,
              role: 'assistant',
              content: textContent || '',
              ...(toolInvocations.length > 0 && { toolInvocations }),
            } as Message;
          }

          // Handle user messages
          if (item.type === 'user' && item.message.role === 'user') {
            let content = '';
            if (typeof item.message.content === 'string') {
              content = item.message.content;
            } else if (Array.isArray(item.message.content)) {
              content = item.message.content
                .filter((c: any) => c.type !== 'tool_result')
                .map((c: any) => c.text || (c.file ? c.file.content : ''))
                .join('\n');
            }

            return {
              id: item.uuid,
              role: 'user',
              content: content,
            };
          }

          return null;
        })
        .filter((message): message is Message => message !== null);

      return extractedMessages;
    } catch (error) {
      console.error('Error processing JSONL:', error);
      throw new Error('Invalid JSONL format');
    }
  }, []);

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const content = await file.text();
        
        let messages: Message[];
        
        if (file.name.endsWith('.jsonl')) {
          messages = processJSONLFile(content);
        } else if (file.name.endsWith('.json')) {
          // Try to parse as direct JSON array
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            messages = parsed;
          } else {
            throw new Error('JSON file must contain an array of messages');
          }
        } else {
          throw new Error('Please upload a .jsonl or .json file');
        }

        onMessagesLoaded(messages);
      } catch (error) {
        alert(`Error loading file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setLoading(false);
        // Reset file input
        target.value = '';
      }
    },
    [onMessagesLoaded, setLoading, processJSONLFile]
  );

  return (
    <div className="space-y-4">
      <div className="text-center">
        <label
          htmlFor="file-upload"
          className={`inline-flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            loading
              ? 'border-slate-300 bg-slate-50 cursor-not-allowed'
              : 'border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:hover:bg-slate-600'
          }`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className={`w-8 h-8 mb-4 ${loading ? 'text-slate-400' : 'text-slate-500'}`} />
            <p className={`mb-2 text-sm ${loading ? 'text-slate-400' : 'text-slate-500'}`}>
              <span className="font-semibold">
                {loading ? 'Processing...' : 'Click to upload'}
              </span>
              {!loading && ' or drag and drop'}
            </p>
            <p className={`text-xs ${loading ? 'text-slate-400' : 'text-slate-500'}`}>
              JSONL or JSON files only
            </p>
          </div>
          <input
            id="file-upload"
            type="file"
            className="hidden"
            accept=".jsonl,.json"
            onChange={handleFileUpload}
            disabled={loading}
          />
        </label>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-medium mb-1">Supported formats:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>JSONL:</strong> Claude code history export files (.jsonl)</li>
              <li><strong>JSON:</strong> Pre-processed UIMessage arrays (.json)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 