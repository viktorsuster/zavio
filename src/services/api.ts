import { API_URL } from '../constants/config';
import { storageService } from '../storage';
import { Post, Comment, User, Field, Booking } from '../types';

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
      const errorData = await response.json().catch(() => ({}));
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

  async getProfile(): Promise<{ user: User }> {
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

  async updateInterests(interests: string[]): Promise<{ success: true; user: User }> {
    const response = await fetch(`${this.baseUrl}/api/users/auth/profile`, {
      method: 'PATCH',
      headers: await this.getHeaders(),
      body: JSON.stringify({ interests }),
    });
    return this.handleResponse(response);
  }

  async getPublicProfile(userId: string): Promise<{ user: User }> {
    const response = await fetch(`${this.baseUrl}/api/users/${userId}/profile`, {
      method: 'GET',
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

  // --- Posts ---

  async getPosts(page = 1, limit = 20): Promise<{ data: Post[]; meta: any }> {
    const response = await fetch(`${this.baseUrl}/api/posts?page=${page}&limit=${limit}`, {
      method: 'GET',
      headers: await this.getHeaders(),
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

  async createBooking(data: { fieldId: number; date: string; startTime: string; duration: number }): Promise<{ success: true; booking: any; user: User }> {
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
