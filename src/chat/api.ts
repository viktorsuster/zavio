import { API_URL } from '../constants/config';
import { storageService } from '../storage';

async function request(method: string, path: string, body?: unknown) {
  const token = storageService.getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body != null ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      storageService.clearAll();
      throw new Error('Prihlásenie vypršalo. Prihlás sa prosím znova.');
    }
    throw new Error(data.message || `HTTP ${res.status}`);
  }
  return data;
}

export const fetchPatients = async () => (await request('GET', '/api/users/chat/patients')).patients || [];
export const fetchConversations = async () => (await request('GET', '/api/users/chat/conversations')).conversations || [];
export const fetchConversation = async (conversationId: number) =>
  (await request('GET', `/api/users/chat/conversations/${conversationId}`)).conversation;
export const createOrGetConversation = async (otherUserId: number) =>
  (await request('POST', '/api/users/chat/conversations', { otherUserId })).conversation;
export const createGroupConversation = async (payload: { title: string; color?: string; memberIds: number[] }) =>
  (await request('POST', '/api/users/chat/conversations/group', payload)).conversation;
export const updateConversation = async (conversationId: number, payload: { title: string; color?: string }) =>
  (await request('PATCH', `/api/users/chat/conversations/${conversationId}`, payload)).conversation;
export const updateConversationNotifications = async (conversationId: number, enabled: boolean) =>
  (await request('PATCH', `/api/users/chat/conversations/${conversationId}/notifications`, { enabled })).conversation;
export const addConversationMembers = async (conversationId: number, memberIds: number[]) =>
  (await request('POST', `/api/users/chat/conversations/${conversationId}/members`, { memberIds })).conversation;
export const removeConversationMember = async (conversationId: number, memberId: number) =>
  (await request('DELETE', `/api/users/chat/conversations/${conversationId}/members/${memberId}`)).conversation;
export const leaveConversation = async (conversationId: number) =>
  request('POST', `/api/users/chat/conversations/${conversationId}/leave`);
export const fetchMessages = async (conversationId: number, limit = 50, before?: number) => {
  const suffix = before != null ? `?limit=${limit}&before=${before}` : `?limit=${limit}`;
  const data = await request('GET', `/api/users/chat/conversations/${conversationId}/messages${suffix}`);
  return { messages: data.messages || [], hasMore: data.hasMore === true };
};
export const sendMessage = async (conversationId: number, body: string) =>
  request('POST', `/api/users/chat/conversations/${conversationId}/messages`, { body });
export const setMessageReaction = async (conversationId: number, messageId: number, emoji: string | null) =>
  request('PUT', `/api/users/chat/conversations/${conversationId}/messages/${messageId}/reaction`, { emoji });
export const markConversationRead = async (conversationId: number, lastReadMessageId: number) =>
  request('POST', `/api/users/chat/conversations/${conversationId}/read`, { lastReadMessageId });
export const deleteConversation = async (conversationId: number) =>
  request('DELETE', `/api/users/chat/conversations/${conversationId}`);
export const deleteMessage = async (conversationId: number, messageId: number) =>
  request('DELETE', `/api/users/chat/conversations/${conversationId}/messages/${messageId}`);
