import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { storageService } from '../storage';
import { fetchConversation, fetchPatients } from './api';
import ChatGroupManageModal from './ChatGroupManageModal';
import { useChatConversation } from './conversation/useChatConversation';
import { ChatConversationContent } from './conversation/ChatConversationContent';
import { getConversationDisplayName } from './groupData';

type Route = RouteProp<RootStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { conversationId, conversation: conversationFromRoute } = (route.params || {}) as any;
  const currentUserId = Number(storageService.getUser()?.id ?? 0);
  const isDark = true;
  const [conversation, setConversation] = useState<any>(route.params?.conversation || null);
  const [conversationLoading, setConversationLoading] = useState(!conversationFromRoute);
  const [manageVisible, setManageVisible] = useState(false);
  const [patients, setPatients] = useState<any[]>([]);

  const refreshConversation = useCallback(async () => {
    if (!conversationId) return;
    setConversationLoading(true);
    try {
      const [conversationData, patientsData] = await Promise.all([fetchConversation(Number(conversationId)), fetchPatients()]);
      setConversation(conversationData);
      setPatients(patientsData);
    } catch (_error) {
      if (!conversationFromRoute) setConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }, [conversationFromRoute, conversationId]);

  useEffect(() => {
    void refreshConversation();
  }, [refreshConversation]);

  const { messages, loading, sending, onSend, onDeleteMessage, setReaction, giftedUser, inputText, onInputTextChanged, getReadReceiptText, giftedExtraData, typingTypers } =
    useChatConversation(Number(conversationId), conversation, currentUserId);

  useLayoutEffect(() => {
    const title = getConversationDisplayName(conversation);
    navigation.setOptions({
      title,
      headerRight: conversation?.isGroup
        ? () => (
            <Pressable onPress={() => setManageVisible(true)} style={{ padding: 6 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 18 }}>i</Text>
            </Pressable>
          )
        : undefined
    });
  }, [navigation, conversation]);

  if (!conversationId) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#020617' : '#f8fafc' }}><Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 16 }}>Chýba konverzácia.</Text></View>;
  }
  if (loading || conversationLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#020617' : '#f8fafc' }}><ActivityIndicator size="large" color={isDark ? '#94a3b8' : '#64748b'} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      <ChatConversationContent
        messages={messages}
        onSend={onSend}
        onDeleteMessage={onDeleteMessage}
        setReaction={setReaction}
        giftedUser={giftedUser}
        sending={sending}
        isDark={isDark}
        insets={insets}
        keyboardVerticalOffset={headerHeight}
        inputText={inputText}
        onInputTextChanged={onInputTextChanged}
        getReadReceiptText={getReadReceiptText}
        giftedExtraData={giftedExtraData}
        typingTypers={typingTypers}
      />
      <ChatGroupManageModal visible={manageVisible} onClose={() => setManageVisible(false)} />
    </View>
  );
}
