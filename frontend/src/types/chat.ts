export type Role = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: Role;
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
}

export type ToolStatus = 'calling' | 'done' | 'error';

export interface ToolEvent {
  id: string;
  name: string;
  args?: Record<string, unknown>;
  result?: unknown;
  status: ToolStatus;
}

export type UiStatus = 'streaming' | 'done' | 'error';

export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools: ToolEvent[];
  status: UiStatus;
  errorText?: string;
}

export type StreamEvent =
  | { type: 'token'; delta: string }
  | { type: 'tool_call'; id: string; name: string; args: Record<string, unknown> }
  | { type: 'tool_result'; id: string; name: string; result: unknown }
  | { type: 'done' }
  | { type: 'error'; message: string };

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: UiMessage[];
}
