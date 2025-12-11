import { storageService } from '../storage';

const API_BASE_URL = 'https://app.zavio.cloud';

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

export interface LoginResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone: string;
    credits: number;
    joinedDate: string;
  };
}

export interface RegisterResponse {
  message: string;
  token: string;
  user: {
    id: number;
    email: string;
    name: string;
    phone: string;
    credits: string;
    joined_date: string;
  };
}

export interface ApiError {
  error?: string;
  message?: string;
}

export interface FieldOwner {
  id: number;
  facilityName: string;
  contactName: string;
  phone: string | null;
}

export interface Field {
  id: number;
  name: string;
  type: 'Tenis' | 'Padel' | 'Futbal' | 'Basketbal';
  location: string;
  pricePerSlot: number;
  imageUrl: string | null;
  status: 'active';
  qrCodeId: string;
  createdAt: string;
  owner: FieldOwner;
}

export interface FieldsResponse {
  fields: Field[];
  count: number;
}

export interface AvailabilitySlot {
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  price: number; // Cena v EUR
}

export interface AvailabilityResponse {
  fieldId: number;
  date: string; // Format: "YYYY-MM-DD"
  duration: number; // Dĺžka v minútach
  availableSlots: AvailabilitySlot[];
  count: number;
}

export interface CreateBookingRequest {
  fieldId: number;
  date: string; // Format: "YYYY-MM-DD"
  startTime: string; // Format: "HH:MM"
  duration: number; // Dĺžka v minútach
}

export interface Booking {
  id: number;
  fieldId: number;
  fieldName: string;
  fieldType?: string;
  fieldLocation?: string;
  fieldImageUrl?: string | null;
  userId: number;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  pricePaid: number;
  status: 'confirmed' | 'cancelled' | 'pending' | 'completed';
  createdAt: string;
}

export interface CreateBookingResponse {
  message: string;
  booking: Booking;
  user: {
    id: number;
    credits: number;
  };
}

export interface GetBookingsResponse {
  bookings: Booking[];
  count: number;
}

export interface CancelBookingResponse {
  message: string;
  booking: {
    id: number;
    status: 'cancelled';
    cancelledAt: string;
  };
  refund: {
    amount: number;
    credits: number; // Nový zostatok kreditov
  };
}

export interface TopUpRequest {
  amount: number; // 1.0 - 1000.0
}

export interface TopUpResponse {
  message: string;
  user: {
    id: number;
    credits: number;
  };
  transaction: {
    id: number;
    amount: number;
    type: 'top-up';
    createdAt: string;
  };
}

export interface QRValidationResponse {
  field: {
    id: number;
    name: string;
    type: string;
    location: string;
  };
  accessGranted: boolean;
  message: string;
  booking: {
    id: number;
    date: string;
    startTime: string;
    endTime: string;
  } | null;
}

class ApiService {
  private getToken(): string | null {
    return storageService.getToken();
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(text || 'Server error');
        }
      }

      if (!response.ok) {
        const error: ApiError = data;
        throw new Error(error.message || error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data as T;
    } catch (error: any) {
      // Network error handling
      if (error.message === 'Network request failed' || error.message.includes('fetch')) {
        throw new Error(
          `Nepodarilo sa pripojiť k serveru. Skontrolujte internetové pripojenie.\n\n` +
          `URL: ${API_BASE_URL}${endpoint}`
        );
      }
      
      // Re-throw if it's already our custom error
      if (error.message && !error.message.includes('Network request failed')) {
        throw error;
      }
      
      throw new Error(error.message || 'Nastala nečakaná chyba');
    }
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/api/users/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterRequest): Promise<RegisterResponse> {
    return this.request<RegisterResponse>('/api/users/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile() {
    return this.request('/api/users/auth/profile', {
      method: 'GET',
    });
  }

  async getFields(): Promise<FieldsResponse> {
    return this.request<FieldsResponse>('/api/mobile/fields', {
      method: 'GET',
    });
  }

  async getAvailability(
    fieldId: number,
    date: string,
    duration: number
  ): Promise<AvailabilityResponse> {
    return this.request<AvailabilityResponse>(
      `/api/mobile/fields/${fieldId}/availability?date=${date}&duration=${duration}`,
      {
        method: 'GET',
      }
    );
  }

  async createBooking(data: CreateBookingRequest): Promise<CreateBookingResponse> {
    return this.request<CreateBookingResponse>('/api/mobile/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getBookings(filters?: {
    status?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<GetBookingsResponse> {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.fromDate) params.append('fromDate', filters.fromDate);
    if (filters?.toDate) params.append('toDate', filters.toDate);
    
    const queryString = params.toString();
    const endpoint = queryString 
      ? `/api/mobile/bookings?${queryString}`
      : '/api/mobile/bookings';
    
    return this.request<GetBookingsResponse>(endpoint, {
      method: 'GET',
    });
  }

  async cancelBooking(bookingId: number): Promise<CancelBookingResponse> {
    return this.request<CancelBookingResponse>(
      `/api/mobile/bookings/${bookingId}/cancel`,
      {
        method: 'PATCH',
      }
    );
  }

  async topUpCredits(amount: number): Promise<TopUpResponse> {
    return this.request<TopUpResponse>('/api/users/credits/top-up', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async validateQRCode(qrCodeId: string): Promise<QRValidationResponse> {
    return this.request<QRValidationResponse>(`/api/mobile/qr/${qrCodeId}`, {
      method: 'GET',
    });
  }
}

export const apiService = new ApiService();

