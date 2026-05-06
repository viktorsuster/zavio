import type { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from './types';

/**
 * Deep links: sportvia://feed, sportvia://post/:postId, sportvia://user/:userId, …
 */
export const rootStackLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ['sportvia://'],
  config: {
    screens: {
      Login: 'login',
      Main: {
        screens: {
          Feed: 'feed',
          Booking: 'booking',
          Scan: 'scan',
          Chat: 'chat',
          Profile: 'profile'
        }
      },
      PostDetail: 'post/:postId',
      PublicProfile: 'user/:userId',
      Search: 'search',
      CreatePost: 'create-post',
      TopUp: 'top-up',
      Interests: 'interests',
      MyGames: 'my-games',
      ChatConversation: 'chat/:conversationId',
      ChatNewConversation: 'chat/new',
      ChatGroupSettings: 'chat/:conversationId/settings'
    }
  }
};
