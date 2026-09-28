export interface Conversation {
  id: string;
  title: string;
}
export interface Message {
  id: string;
  role: string;
  content: string;
  status?: string;
  executionId?: string;
  trace?: StreamEvent[];
}
export interface StreamEvent {
  type: string;
  delta?: string;
  executionId?: string;
  status?: string;
  error?: unknown;
  [key: string]: unknown;
}
