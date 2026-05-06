import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Feed: undefined;
  Booking: undefined;
  Scan: undefined;
  Chat: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  PublicProfile: { userId: string };
  PostDetail: { postId: string };
  Search: undefined;
  CreatePost: undefined;
  TopUp: undefined;
  Interests: undefined;
  MyGames: undefined;
  DiscoverPlayers: undefined;
  ReservationDetail: { bookingId: number; booking?: any };
  ChatConversation: { conversationId: number; bookingId?: number | string; conversation?: any };
  ChatNewConversation: undefined;
  ChatGroupSettings: { conversationId: number };
};
