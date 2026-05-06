import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Feed: undefined;
  Booking: undefined;
  Scan: undefined;
  MyGames: NavigatorScreenParams<MyGamesStackParamList> | undefined;
  Profile: undefined;
};

export type MyGamesStackParamList = {
  MyGamesHome: undefined;
  ChatConversation: { conversationId: number; bookingId: string };
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
  ChatConversation: { conversationId: number; bookingId: string };
};
