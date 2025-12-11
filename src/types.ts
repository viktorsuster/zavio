export type SkillLevel =
  | "Začiatočník"
  | "Mierne pokročilý"
  | "Pokročilý"
  | "Pro";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  credits: number;
  skills: Record<string, SkillLevel>;
}

export interface Court {
  id: string;
  name: string;
  type: "football" | "tennis" | "basketball" | "padel";
  pricePerHour: number;
  image: string;
  location: string;
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
}

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
  likedBy: string[]; // Array of user IDs who liked
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  timestamp: number;
  likes: number;
  likedBy: string[]; // Array of user IDs who liked
  image?: string;
  comments: Comment[];
}
