import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import LoginScreen from '../screens/LoginScreen';
import FeedScreen from '../screens/FeedScreen';
import BookingScreen from '../screens/BookingScreen';
import ScanScreen from '../screens/ScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import ChatTab from '../chat/ChatTab';
import ChatConversationScreen from '../chat/ChatConversationScreen';
import ChatNewConversationModal from '../chat/ChatNewConversationModal';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import TopUpScreen from '../screens/TopUpScreen';
import InterestsScreen from '../screens/InterestsScreen';
import { storageService } from '../storage';
import { navigationRef } from './navigationRef';
import { rootStackLinking } from './linking';
import type { MainTabParamList, RootStackParamList } from './types';

export type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 10),
          paddingTop: 10
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600'
        }
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="home" color={color} size={size} />
          ),
          tabBarLabel: 'Domov'
        }}
      />
      <Tab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="calendar" color={color} size={size} />
          ),
          tabBarLabel: 'Rezervovať'
        }}
      />
      <Tab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="scan" color={color} size={size} />
          ),
          tabBarLabel: 'Scan',
          tabBarButton: ScanTabButton,
          unmountOnBlur: true
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatTab}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="chat" color={color} size={size} />
          ),
          tabBarLabel: 'Chat'
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="user" color={color} size={size} />
          ),
          tabBarLabel: 'Profil'
        }}
      />
    </Tab.Navigator>
  );
}

function TabIcon({ name, color, size }: { name: string; color: string; size: number }) {
  const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    home: 'home',
    calendar: 'calendar',
    scan: 'scan',
    chat: 'chatbubble-ellipses',
    user: 'person'
  };
  return <Ionicons name={iconMap[name] || 'home'} size={size} color={color} />;
}

function ScanTabButton(props: any) {
  const { onPress } = props;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <TouchableOpacity
        onPress={onPress}
        style={{
          top: -24,
          backgroundColor: colors.primary, // n8n Coral
          borderRadius: 22,
          width: 64,
          height: 64,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 10,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)'
        }}
      >
        <Ionicons name="scan" size={30} color="#000000" />
      </TouchableOpacity>
    </View>
  );
}

export default function AppNavigator() {
  const [routeGate, setRouteGate] = React.useState<{
    isLoggedIn: boolean;
    isGuest: boolean;
  } | null>(null);
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    const syncAuthState = () => {
      const snapshot = storageService.getAuthSnapshot();
      setRouteGate({ isLoggedIn: snapshot.isLoggedIn, isGuest: snapshot.isGuest });
    };

    syncAuthState();
    const unsubscribe = storageService.subscribeAuthChanges(syncAuthState);

    return unsubscribe;
  }, []);

  if (routeGate === null) {
    return null;
  }

  const hasAppAccess = routeGate.isLoggedIn || routeGate.isGuest;
  const stackKey = routeGate.isLoggedIn ? 'member' : routeGate.isGuest ? 'guestBrowse' : 'auth';

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: Platform.OS === 'android' ? insets.top : 0
      }}
    >
      <NavigationContainer ref={navigationRef} linking={rootStackLinking}>
        <Stack.Navigator
          key={stackKey}
          screenOptions={{ headerShown: false }}
        >
          {!hasAppAccess ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="PublicProfile"
                component={PublicProfileScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="PostDetail"
                component={PostDetailScreen}
              />
              <Stack.Screen
                name="Search"
                component={SearchScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="CreatePost"
                component={CreatePostScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="TopUp"
                component={TopUpScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="Interests"
                component={InterestsScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen name="MyGames" component={MyGamesScreen} />
              <Stack.Screen
                name="ChatConversation"
                component={ChatConversationScreen}
              />
              <Stack.Screen
                name="ChatNewConversation"
                component={ChatNewConversationModal}
                options={{ presentation: 'modal' }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

