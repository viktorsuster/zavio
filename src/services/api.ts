import { API_URL } from '../constants/config';
import { storageService } from '../storage';
import { Post, Comment, User, Field, Booking, PublicProfileRelationship, FollowCounts } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface QRValidationResponse {
  accessGranted: boolean;
  message: string;
  field: Field;
  booking?: Booking;
}

export interface ChatConversation {
  id: number;
  bookingId: number;
  title?: string;
  lastMessage?: string | null;
  lastMessageId?: number | null;
  updatedAt: string;
  booking?: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
    duration: number;
    paymentMode: 'full' | 'split';
    splitDeadlineAt?: string | null;
    fieldName: string;
  };
}

export interface ChatMessage {
  id: number;
  senderId: number;
  senderDisplayName: string;
  kind: 'user' | 'system';
  body: string;
  createdAt: string;
  meta?: {
    reactions?: Record<string, string>;
  } | null;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_URL;
  }

  private async getHeaders(isMultipart = false) {
    const token = storageService.getToken();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
    };

    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  private async handleResponse(response: Response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({} as any));
      if (response.status === 401) {
        // Token neplatný / expirovaný
        storageService.clearAll();
        throw new Error('Prihlásenie vypršalo. Prihlás sa prosím znova.');
      }
      if (response.status === 403) {
        throw new Error(errorData.message || `API Error: ${response.status}`);
      }
      throw new Error(errorData.message || `API Error: ${response.status}`);
    }
    return response.json();
  }

  // --- Auth & User ---

  async login(data: LoginRequest): Promise<{ token: string; user: User }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/login`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async register(data: RegisterRequest): Promise<{ token: string; user: User }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/register`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getProfile(): Promise<{ user: User; followCounts: FollowCounts }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/profile`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async topUpCredits(amount: number): Promise<{ message: string; user: { id: string; credits: number } }> {
    const response = await fetch(`${this.baseUrl}/api/users/credits/top-up`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ amount }),
    });
    return this.handleResponse(response);
  }

  async updateInterests(interests: string[]): Promise<{ success: true; user: User; followCounts: FollowCounts }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/profile`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ interests }),
    });
    return this.handleResponse(response);
  }

  async deleteAccount(): Promise<{ success: true; message: string }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/account`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getPublicProfile(userId: string): Promise<{
    user: User;
    relationship: PublicProfileRelationship;
    followCounts: FollowCounts;
  }> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}/profile`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async followUser(userId: string): Promise<{ success: true; relationship: PublicProfileRelationship }> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}/follow`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async unfollowUser(userId: string): Promise<{ success: true; relationship: PublicProfileRelationship }> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}/follow`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSports(): Promise<{ data: string[] }> {
    const response = await fetch(`${this.baseUrl}/api/sports`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getActivity(page = 1, limit = 20): Promise<{ data: any[]; meta: { page: number; limit: number; total: number; totalPages: number } }> {
    const response = await fetch(`${this.baseUrl}/api/users/me/activity?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async syncExpoPushToken(expoPushToken: string, platform: 'ios' | 'android' | 'unknown'): Promise<{ success: true }> {
    const response = await fetch(`${this.baseUrl}/api/users/push/token`, {
      method: 'PUT',
      headers: await this.getHeaders(),
      body: JSON.stringify({ expoPushToken, platform }),
    });
    return this.handleResponse(response);
  }

  // --- Posts ---

  async getPosts(page = 1, limit = 20): Promise<{ data: Post[]; meta: any }> {
    const response = await fetch(`${this.baseUrl}/api/posts?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async searchPosts(
    q: string,
    page = 1,
    limit = 20
  ): Promise<{
    data: Post[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const params = new URLSearchParams({
      q,
      page: String(page),
      limit: String(limit)
    });
    const response = await fetch(`${this.baseUrl}/api/posts/search?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async searchUsers(q: string): Promise<{ data: { id: number; name: string; avatar: string | null }[] }> {
    const params = new URLSearchParams({ q, limit: '15' });
    const response = await fetch(`${this.baseUrl}/api/users/search?${params.toString()}`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getUsersDirectory(): Promise<{ data: { id: number; name: string; avatar: string | null }[] }> {
    const response = await fetch(`${this.baseUrl}/api/users/directory`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async matchContacts(
    contacts: { name: string; phone: string }[]
  ): Promise<{
    matched: { contactName: string; phone: string; user: { id: number; name: string; avatar: string | null } }[];
    unmatched: { contactName: string; phone: string }[];
  }> {
    const response = await fetch(`${this.baseUrl}/api/users/contacts/match`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ contacts })
    });
    return this.handleResponse(response);
  }

  async createPost(content: string, image?: string): Promise<{ success: true; data: Post }> {
    const response = await fetch(`${this.baseUrl}/api/posts`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ content, image }),
    });
    return this.handleResponse(response);
  }

  async getPostDetail(postId: string): Promise<Post> {
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async likePost(
    postId: string
  ): Promise<{ success: true; liked: boolean; likedByMe?: boolean; likesCount: number }> {
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}/like`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async deletePost(postId: string): Promise<{ success: true }> {
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async deleteComment(postId: string, commentId: string): Promise<{ success: true }> {
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}/comments/${commentId}`, {
      method: 'DELETE',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async addComment(postId: string, content: string): Promise<{ success: true; data: Comment }> {
    const response = await fetch(`${this.baseUrl}/api/posts/${postId}/comments`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ content }),
    });
    return this.handleResponse(response);
  }

  async likeComment(
    commentId: string
  ): Promise<{ success: true; liked: boolean; likedByMe?: boolean; likesCount: number }> {
    const response = await fetch(`${this.baseUrl}/api/comments/${commentId}/like`, {
      method: 'POST',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- Fields ---

  async getFields(): Promise<{ fields: Field[]; count: number }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/fields`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getFieldDetail(fieldId: string): Promise<{ field: Field }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/fields/${fieldId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAvailability(fieldId: number, date: string, duration: number): Promise<{ availableSlots: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/fields/${fieldId}/availability?date=${date}&duration=${duration}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async createBooking(data: {
    fieldId: number;
    date: string;
    startTime: string;
    duration: number;
    paymentMode?: 'full' | 'split';
    participantIds?: number[];
  }): Promise<{ success: true; booking: any; user: User }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getBookings(): Promise<{ bookings: Booking[] }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getBookingSplits(bookingId: string | number): Promise<{ bookingId: number; paymentMode: 'full' | 'split'; splitDeadlineAt?: string | null; splits: any[] }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings/${bookingId}/splits`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async cancelBooking(bookingId: string | number): Promise<{ message: string; booking?: any; refund?: any }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings/${bookingId}/cancel`, {
      method: 'PATCH',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async acceptBookingSplit(bookingId: string | number, splitId: string | number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings/${bookingId}/splits/${splitId}/accept`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async declineBookingSplit(bookingId: string | number, splitId: string | number): Promise<{ message: string }> {
    const response = await fetch(`${this.baseUrl}/api/mobile/bookings/${bookingId}/splits/${splitId}/decline`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  // --- Chat ---

  async getChatConversations(): Promise<{ conversations: ChatConversation[] }> {
    const response = await fetch(`${this.baseUrl}/api/users/chat/conversations`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getChatPatients(): Promise<{ patients: { id: number; displayName: string }[] }> {
    const response = await fetch(`${this.baseUrl}/api/users/chat/patients`, {
      method: 'GET',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async createOrGetBookingConversation(bookingId: string | number): Promise<{ conversation: ChatConversation }> {
    const response = await fetch(`${this.baseUrl}/api/users/chat/bookings/${bookingId}/conversation`, {
      method: 'POST',
      headers: await this.getHeaders()
    });
    return this.handleResponse(response);
  }

  async getChatMessages(
    conversationId: string | number,
    limit = 50,
    before?: number
  ): Promise<{ messages: ChatMessage[]; hasMore: boolean }> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (before != null) params.set('before', String(before));
    const response = await fetch(
      `${this.baseUrl}/api/users/chat/conversations/${conversationId}/messages?${params.toString()}`,
      {
        method: 'GET',
        headers: await this.getHeaders()
      }
    );
    return this.handleResponse(response);
  }

  async sendChatMessage(conversationId: string | number, body: string): Promise<ChatMessage> {
    const response = await fetch(`${this.baseUrl}/api/users/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ body })
    });
    return this.handleResponse(response);
  }

  async setChatReaction(
    conversationId: string | number,
    messageId: string | number,
    emoji: string | null
  ): Promise<ChatMessage> {
    const response = await fetch(
      `${this.baseUrl}/api/users/chat/conversations/${conversationId}/messages/${messageId}/reaction`,
      {
        method: 'PUT',
        headers: await this.getHeaders(),
        body: JSON.stringify({ emoji })
      }
    );
    return this.handleResponse(response);
  }

  async markChatRead(conversationId: string | number, lastReadMessageId: string | number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/users/chat/conversations/${conversationId}/read`, {
      method: 'POST',
      headers: await this.getHeaders(),
      body: JSON.stringify({ lastReadMessageId })
    });
    if (response.status === 204) return;
    await this.handleResponse(response);
  }

  // --- QR & Access ---

  async validateQrCode(qrCodeId: string): Promise<QRValidationResponse> {
    const response = await fetch(`${this.baseUrl}/api/mobile/qr/${qrCodeId}`, {
      method: 'GET',
      headers: await this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiService = new ApiService();
