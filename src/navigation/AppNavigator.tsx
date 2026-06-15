import React from 'react';
import { Platform, View } from 'react-native';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';
import CustomTabBar from './CustomTabBar';
import LoginScreen from '../screens/LoginScreen';
import FeedScreen from '../screens/FeedScreen';
import BookingScreen from '../screens/BookingScreen';
import ScanScreen from '../screens/ScanScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MyGamesScreen from '../screens/MyGamesScreen';
import ChatTab from '../chat/ChatTab';
import ChatConversationScreen from '../chat/ChatConversationScreen';
import ChatNewConversationModal from '../chat/ChatNewConversationModal';
import ChatGroupSettingsScreen from '../chat/ChatGroupSettingsScreen';
import PublicProfileScreen from '../screens/PublicProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SearchScreen from '../screens/SearchScreen';
import CreatePostScreen from '../screens/CreatePostScreen';
import TopUpScreen from '../screens/TopUpScreen';
import CreditHistoryScreen from '../screens/CreditHistoryScreen';
import InterestsScreen from '../screens/InterestsScreen';
import EditAccountScreen from '../screens/EditAccountScreen';
import ReservationDetailScreen from '../screens/ReservationDetailScreen';
import CommunityProfileScreen from '../screens/CommunityProfileScreen';
import DiscoverPlayersScreen from '../screens/DiscoverPlayersScreen';
import ContactsInviteScreen from '../screens/ContactsInviteScreen';
import { storageService } from '../storage';
import { navigationRef } from './navigationRef';
import { rootStackLinking } from './linking';
import type { MainTabParamList, RootStackParamList } from './types';

export type { MainTabParamList, RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const NativeTab = createNativeBottomTabNavigator();

// NATÍVNY tab bar (UITabBarController cez react-native-screens ≥ 4.25) — IBA iOS.
// Na iOS 26 dostáva floating Liquid Glass vzhľad zadarmo. Android ostáva na JS
// taboch (natívny Android variant má Material vzhľad a otvorené bugy).
// Scan je v natívnom móde obyčajný TAB so SF Symbol ikonou — UITabBarController
// nepodporuje custom vyvýšené tlačidlo (Android používa CustomTabBar s inline Scan).
// Vypnutie: prepnúť na `false` → vráti JS taby aj na iOS.
const USE_NATIVE_TABS = Platform.OS === 'ios';

// Natívny UITabBarController číta dark/colors.background z NavigationContainer
// témy (nativeContainerStyle, colorScheme, tabBarBlurEffect). DefaultTheme je
// light → pri prepnutí tabu ikony na chvíľu prebliknú na systémový light tint.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.backgroundSecondary,
    primary: colors.primary,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textDisabled,
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

// iOS: skutočný UITabBarController (floating Liquid Glass na iOS 26).
// Ikony sú ROVNAKÁ zostava ako v scan-sbs-app-expo: template PNG skopírované
// z jeho assets/tab-icons (octicon-home, ion-calendar, mdi-message-text;
// systém ich tintuje active/inactive farbou) + SF Symbols pre Scan a Profil.
// Aktívny stav = plný glyph, neaktívny = outline variant.
// Route names sú IDENTICKÉ s JS verziou (Feed/Booking/Scan/Chat/Profile),
// takže navigate('Chat') a spol. fungujú bez ohľadu na variant.
function NativeMainTabs() {
  return (
    <NativeTab.Navigator
      screenOptions={{
        headerShown: false,
        // Rovnaké farby ako JS tab bar: aktívna biela, neaktívna tlmená.
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: colors.textDisabled,
        tabBarStyle: {
          backgroundColor: colors.background,
        },
        tabBarBlurEffect: 'systemMaterialDark',
      }}
    >
      <NativeTab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          // Prázdny label = iOS tab bar len s ikonami (Instagram štýl).
          tabBarLabel: '',
          // Presný Octicons "home" glyph ako v scan-sbs.
          tabBarIcon: ({ focused }) => ({
            type: 'image',
            source: focused
              ? require('../../assets/tab-icons/octicon-home-fill.png')
              : require('../../assets/tab-icons/octicon-home.png'),
          }),
        }}
      />
      <NativeTab.Screen
        name="Booking"
        component={BookingScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => ({
            type: 'image',
            source: focused
              ? require('../../assets/tab-icons/ion-calendar.png')
              : require('../../assets/tab-icons/ion-calendar-outline.png'),
          }),
        }}
      />
      <NativeTab.Screen
        name="Scan"
        component={ScanScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: { type: 'sfSymbol', name: 'qrcode.viewfinder' },
        }}
      />
      <NativeTab.Screen
        name="Chat"
        component={ChatTab}
        options={{
          tabBarLabel: '',
          // MCI "message-text" glyph ako v scan-sbs.
          tabBarIcon: ({ focused }) => ({
            type: 'image',
            source: focused
              ? require('../../assets/tab-icons/mdi-message-text.png')
              : require('../../assets/tab-icons/mdi-message-text-outline.png'),
          }),
        }}
      />
      <NativeTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: '',
          tabBarIcon: ({ focused }) => ({
            type: 'sfSymbol',
            name: focused ? 'person.crop.circle.fill' : 'person.crop.circle',
          }),
        }}
      />
    </NativeTab.Navigator>
  );
}

const TabNavigator = USE_NATIVE_TABS ? NativeMainTabs : MainTabs;

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

  const screenLayout = ({
    route,
    options,
    children,
  }: {
    route: { name: string };
    options?: { presentation?: string; headerShown?: boolean };
    children: React.ReactNode;
  }) => {
    const presentation = options?.presentation;
    const isModalPresentation =
      presentation === 'modal' ||
      presentation === 'formSheet' ||
      presentation === 'pageSheet' ||
      presentation === 'fullScreenModal' ||
      presentation === 'containedModal' ||
      presentation === 'transparentModal' ||
      presentation === 'containedTransparentModal';
    const hasNativeHeader = options?.headerShown === true;
    const noTopInset = hasNativeHeader || isModalPresentation;

    return (
      <View style={{ flex: 1, paddingTop: noTopInset ? 0 : insets.top }}>
        {children}
      </View>
    );
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background
      }}
    >
      <NavigationContainer ref={navigationRef} linking={rootStackLinking} theme={navigationTheme}>
        <Stack.Navigator
          key={stackKey}
          screenOptions={{ headerShown: false }}
          screenLayout={screenLayout as any}
        >
          {!hasAppAccess ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen
                name="Main"
                component={TabNavigator}
                options={{
                  contentStyle: {
                    backgroundColor: colors.background,
                  },
                }}
              />
              <Stack.Screen
                name="PublicProfile"
                component={PublicProfileScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Profil hráča',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
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
                name="CreditHistory"
                component={CreditHistoryScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="Interests"
                component={InterestsScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="EditAccount"
                component={EditAccountScreen}
                options={{ presentation: 'modal' }}
              />
              <Stack.Screen
                name="DiscoverPlayers"
                component={DiscoverPlayersScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Objaviť',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="ContactsInvite"
                component={ContactsInviteScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Moje kontakty',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="ReservationDetail"
                component={ReservationDetailScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Detail rezervácie',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="MyGames"
                component={MyGamesScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Moje hry',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="CommunityProfile"
                component={CommunityProfileScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Komunita',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="ChatConversation"
                component={ChatConversationScreen}
                options={{
                  headerShown: true,
                  headerTitle: 'Chat',
                  headerStyle: { backgroundColor: colors.background },
                  headerTintColor: colors.textPrimary,
                  headerShadowVisible: false,
                  headerBackButtonDisplayMode: 'minimal'
                }}
              />
              <Stack.Screen
                name="ChatNewConversation"
                component={ChatNewConversationModal}
                options={{
                  headerShown: false
                }}
              />
              <Stack.Screen
                name="ChatGroupSettings"
                component={ChatGroupSettingsScreen}
                options={{
                  headerShown: false
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}

