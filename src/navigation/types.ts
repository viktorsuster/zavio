export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  PublicProfile: { userId: string };
  PostDetail: { postId: string };
  Search: undefined;
  CreatePost: undefined;
  TopUp: undefined;
  Interests: undefined;
};

export type MainTabParamList = {
  Feed: undefined;
  Booking: undefined;
  Scan: undefined;
  MyGames: undefined;
  Profile: undefined;
};
