import React from 'react';
import { User, Bot, Settings, Play, CheckCircle } from 'lucide-react';
import type { Message, ToolInvocation } from 'ai';

interface ConversationViewProps {
  messages: Message[];
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
  message: Message;
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
          
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="space-y-3 mt-3">
              {message.toolInvocations.map((invocation, index) => (
                <ToolInvocationRenderer key={index} invocation={invocation} />
              ))}
            </div>
          )}
        </div>
        
        <div className={`text-xs text-slate-500 dark:text-slate-400 mt-1 ${
          isUser ? 'text-right' : 'text-left'
        }`}>
          ID: {message.id}
        </div>
      </div>
    </div>
  );
}

interface ToolInvocationRendererProps {
  invocation: ToolInvocation;
}

function ToolInvocationRenderer({ invocation }: ToolInvocationRendererProps) {
  const isCompleted = invocation.state === 'result';
  
  return (
    <div className="border border-slate-200 dark:border-slate-600 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-slate-600 dark:text-slate-400" />
          <span className="font-medium text-sm text-slate-700 dark:text-slate-300">
            {invocation.toolName}
          </span>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
            isCompleted 
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
          }`}>
            {isCompleted ? <CheckCircle className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            {isCompleted ? 'Completed' : 'Calling'}
          </div>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          {invocation.toolCallId}
        </span>
      </div>
      
      {Object.keys(invocation.args).length > 0 && (
        <div className="mb-3">
          <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Arguments:
          </div>
          <pre className="text-xs bg-slate-100 dark:bg-slate-800 p-2 rounded overflow-x-auto">
            {JSON.stringify(invocation.args, null, 2)}
          </pre>
        </div>
      )}
      
              {invocation.state === 'result' && 'result' in invocation && (
          <div>
            <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              Result:
            </div>
            <div className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
              <pre className="whitespace-pre-wrap text-green-800 dark:text-green-200 overflow-x-auto">
                {(invocation as any).result}
              </pre>
            </div>
          </div>
        )}
    </div>
  );
} 