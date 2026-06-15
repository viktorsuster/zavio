import React from 'react';
import { Platform, Pressable } from 'react-native';
import { CompositeNavigationProp } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import ChatTab from '../chat/ChatTab';
import { colors } from '../constants/colors';
import type { RootStackParamList } from './types';

export type ChatStackParamList = {
  ChatList: undefined;
};

const ChatStack = createNativeStackNavigator<ChatStackParamList>();

type ChatListNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<ChatStackParamList, 'ChatList'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export default function ChatStackNavigator() {
  return (
    <ChatStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.textPrimary,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
        headerLargeTitle: Platform.OS === 'ios',
        headerLargeTitleShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <ChatStack.Screen
        name="ChatList"
        component={ChatTab}
        options={({ navigation }) => {
          const rootNavigation = navigation as ChatListNavigationProp;
          return {
            headerShown: true,
            title: 'Chat',
            headerRight: () => (
              <Pressable
                onPress={() => rootNavigation.navigate('ChatNewConversation')}
                hitSlop={12}
                style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
                accessibilityLabel="Nová konverzácia"
                accessibilityRole="button"
              >
                <Ionicons name="add" size={26} color={colors.textPrimary} />
              </Pressable>
            ),
          };
        }}
      />
    </ChatStack.Navigator>
  );
}
