import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/colors';
import LoginScreen from '../screens/LoginScreen';
import FeedScreen from '../screens/FeedScreen';
import BookingScreen from '../screens/BookingScreen';
import ScanScreen from '../screens/ScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import TopUpScreen from '../screens/TopUpScreen';
import InterestsScreen from '../screens/InterestsScreen';
import { storageService } from '../storage';

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

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
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
          tabBarButton: ScanTabButton
        }}
      />
      <Tab.Screen
        name="MyGames"
        component={MyGamesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TabIcon name="trophy" color={color} size={size} />
          ),
          tabBarLabel: 'Moje hry'
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
    trophy: 'trophy',
    user: 'person'
  };
  return <Ionicons name={iconMap[name] || 'home'} size={size} color={color} />;
}

function ScanTabButton(props: any) {
  const { onPress, accessibilityState } = props;
  const isSelected = accessibilityState?.selected;

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
  const [isLoggedIn, setIsLoggedIn] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    console.log('[AppNavigator] ===== APP STARTUP - Checking auth state =====');
    const checkAuth = () => {
      console.log('[AppNavigator] Step 1: Getting user from storage...');
      const user = storageService.getUser();
      console.log('[AppNavigator] Step 2: Getting token from storage...');
      const token = storageService.getToken();
      console.log('[AppNavigator] Step 3: User result:', user ? `EXISTS (${user.email || user.name})` : 'NULL');
      console.log('[AppNavigator] Step 4: Token result:', token ? `EXISTS (${token.substring(0, 20)}...)` : 'NULL');
      const loggedIn = !!(user && token);
      console.log('[AppNavigator] Step 5: Final auth check result - isLoggedIn:', loggedIn);
      console.log('[AppNavigator] ===== Setting isLoggedIn to:', loggedIn, '=====');
      setIsLoggedIn(loggedIn);
    };

    // Small delay to ensure MMKV is fully initialized
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  if (isLoggedIn === null) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isLoggedIn ? (
          <Stack.Screen name="Login">
            {(props) => <LoginScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
          </Stack.Screen>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

