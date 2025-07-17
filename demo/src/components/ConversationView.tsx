import React from 'react';
import { User, Bot, Settings, Play, CheckCircle } from 'lucide-react';
import type { UIMessage } from 'ai';

interface ConversationViewProps {
  messages: UIMessage[];
}

export function ConversationView({ messages }: ConversationViewProps) {
  return (
    <div className="space-y-6">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}

interface MessageBubbleProps {
  message: UIMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-700 text-white'
      }`}>
        {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </div>
      
      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div className={`rounded-2xl p-4 ${
          isUser 
            ? 'bg-blue-600 text-white ml-12' 
            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 mr-12'
        }`}>
          {message.content && (
            <div className="whitespace-pre-wrap mb-3 last:mb-0">
              {message.content}
            </div>
          )}
          
          {message.parts && message.parts.length > 0 && (
            <div className="space-y-3 mt-3">
              {message.parts.map((part, index) => {
                if (part.type === 'tool-invocation' && part.toolInvocation) {
                  const invocation = part.toolInvocation;
                  return (
                    <ToolInvocationCard key={index} invocation={invocation} />
                  );
                }
                return null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToolInvocationCardProps {
  invocation: {
    state: string;
    toolCallId: string;
    toolName: string;
    args: any;
    result?: any;
  };
}

function ToolInvocationCard({ invocation }: ToolInvocationCardProps) {
  const isCompleted = invocation.state === 'result';
  
  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-3">
      <div className="flex items-center gap-2 mb-2">
        <div className={`p-1 rounded ${
          isCompleted 
            ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' 
            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-600 dark:text-yellow-400'
        }`}>
          {isCompleted ? <CheckCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </div>
        <span className="font-medium text-sm">
          {invocation.toolName}
        </span>
        <span className={`text-xs px-2 py-1 rounded-full ${
          isCompleted 
            ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' 
            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
        }`}>
          {isCompleted ? 'Completed' : 'Running'}
        </span>
      </div>
      
      {invocation.args && Object.keys(invocation.args).length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Arguments:</div>
          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded border overflow-x-auto">
            {JSON.stringify(invocation.args, null, 2)}
          </pre>
        </div>
      )}
      
      {invocation.result && (
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Result:</div>
          <div className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded border">
            {typeof invocation.result === 'string' 
              ? invocation.result 
              : JSON.stringify(invocation.result, null, 2)
            }
          </div>
        </div>
      )}
    </div>
  );
} 