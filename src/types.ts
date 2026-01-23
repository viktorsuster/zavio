export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  interests?: string[]; // športy, o ktoré sa používateľ zaujíma
  phone?: string;
  joinedDate?: string;
}

export interface Court {
  id: string;
  name: string;
  type: "football" | "tennis" | "basketball" | "padel";
  pricePerHour: number;
  image: string;
  location: string;
}

export interface Field {
  id: number;
  name: string;
  type: string;
  location: string;
  pricePerSlot: number;
  imageUrl: string;
  status: 'active' | 'maintenance';
  qrCodeId: string;
  createdAt: string;
  owner?: {
    id: number;
    facilityName: string;
    contactName: string;
    phone: string;
  };
}

export interface Booking {
  id: string;
  courtId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM Start Time
  duration: number; // in minutes
  status: "confirmed" | "completed" | "cancelled";
  pricePaid: number;
  fieldName?: string; // From API
  startTime?: string; // From API
  endTime?: string; // From API
  price?: number; // From API
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
  likedByMe?: boolean; // Server-side: whether current user liked this comment
  likedBy?: string[]; // Legacy fallback: Array of user IDs who liked
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
  likedByMe?: boolean; // Server-side: whether current user liked this post
  likedBy?: string[]; // Legacy fallback: Array of user IDs who liked
  image?: string;
  comments: Comment[];
}
