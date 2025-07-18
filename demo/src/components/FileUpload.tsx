import React, { useCallback } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import type { UIMessage } from 'ai';
import { HistoryParser } from '../../../HistoryParser/src/HistoryParser';

interface FileUploadProps {
  onMessagesLoaded: (messages: UIMessage[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function FileUpload({ onMessagesLoaded, loading, setLoading }: FileUploadProps) {
  const historyParser = new HistoryParser();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        const content = await file.text();
        
        let messages: UIMessage[];
        
        if (file.name.endsWith('.jsonl')) {
          messages = historyParser.parseFromString(content);
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
        input.value = '';
      }
    },
    [onMessagesLoaded, setLoading, historyParser]
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