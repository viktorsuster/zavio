import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { storageService } from '../storage';
import { fetchConversation } from './api';
import { useChatConversation } from './conversation/useChatConversation';
import { ChatConversationContent } from './conversation/ChatConversationContent';
import { getConversationDisplayName } from './groupData';
import { apiService } from '../services/api';

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
  const [splits, setSplits] = useState<any[]>([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const refreshConversation = useCallback(async () => {
    if (!conversationId) return;
    setConversationLoading(true);
    try {
      const conversationData = await fetchConversation(Number(conversationId));
      setConversation(conversationData);
    } catch (_error) {
      if (!conversationFromRoute) setConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }, [conversationFromRoute, conversationId]);

  const { messages, loading, sending, onSend, onDeleteMessage, setReaction, giftedUser, inputText, onInputTextChanged, getReadReceiptText, giftedExtraData, typingTypers } =
    useChatConversation(Number(conversationId), conversation, currentUserId);

  const mySplit = useMemo(
    () => splits.find((split) => Number(split.invitee_user_id) === Number(currentUserId)),
    [splits, currentUserId]
  );

  const loadSplits = useCallback(async () => {
    const bookingId = conversation?.booking?.id || route.params?.bookingId;
    if (!bookingId) return;
    try {
      const response = await apiService.getBookingSplits(bookingId);
      setSplits(response.splits || []);
    } catch (_error) {
      setSplits([]);
    }
  }, [conversation?.booking?.id, route.params?.bookingId]);

  useEffect(() => {
    void refreshConversation();
  }, [refreshConversation]);
  useEffect(() => {
    void loadSplits();
  }, [loadSplits]);
  useFocusEffect(
    useCallback(() => {
      void refreshConversation();
      void loadSplits();
    }, [refreshConversation, loadSplits])
  );

  useLayoutEffect(() => {
    const title = getConversationDisplayName(conversation);
    navigation.setOptions({
      headerTitle: conversation?.booking
        ? () => (
            <Pressable onPress={() => setShowBookingModal(true)} hitSlop={8}>
              <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700' }}>{title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>Detail rezervácie</Text>
            </Pressable>
          )
        : title,
      headerRight: conversation?.isGroup
        ? () => (
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => navigation.navigate('ChatGroupSettings', { conversationId: Number(conversationId) })}
                style={{
                  width: 32,
                  height: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 16
                }}
                hitSlop={12}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={colors.textPrimary}
                  style={{ transform: [{ translateX: 1 }] }}
                />
              </Pressable>
            </View>
          )
        : undefined
    });
  }, [navigation, conversation]);

  const acceptedCount = splits.filter((split) => split.status === 'accepted').length;

  if (!conversationId) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#f8fafc' }}><Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 16 }}>Chýba konverzácia.</Text></View>;
  }
  if (loading || conversationLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#f8fafc' }}><ActivityIndicator size="large" color={isDark ? '#94a3b8' : '#64748b'} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {conversation?.booking ? (
        <View
          style={{
            backgroundColor: '#111827',
            borderBottomColor: colors.border,
            borderBottomWidth: 1,
            paddingHorizontal: 12,
            paddingVertical: 10
          }}
        >
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
            Rezervácia: {conversation.booking.fieldName}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 2 }}>
            {new Date(conversation.booking.date).toLocaleDateString('sk-SK')} • {String(conversation.booking.startTime).slice(0, 5)}
          </Text>
          {mySplit?.status === 'invited' ? (
            <Pressable
              onPress={() => setShowAcceptModal(true)}
              style={{
                marginTop: 8,
                alignSelf: 'flex-start',
                backgroundColor: colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8
              }}
            >
              <Text style={{ color: '#000000', fontWeight: '700' }}>Prijať pozvanie</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
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
      <Modal visible={showAcceptModal} transparent animationType="fade" onRequestClose={() => setShowAcceptModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.backgroundSecondary, borderRadius: 14, padding: 16 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Potvrdiť pozvanie</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              Po potvrdení sa stiahne {Number(mySplit?.amount || 0).toFixed(2)} € z tvojho kreditu.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <Pressable onPress={() => setShowAcceptModal(false)}>
                <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Zrušiť</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!conversation?.booking?.id || !mySplit?.id || accepting) return;
                  setAccepting(true);
                  try {
                    await apiService.acceptBookingSplit(conversation.booking.id, mySplit.id);
                    setShowAcceptModal(false);
                    await loadSplits();
                  } finally {
                    setAccepting(false);
                  }
                }}
              >
                <Text style={{ color: colors.gold, fontWeight: '700' }}>{accepting ? 'Potvrdzujem...' : 'Potvrdiť'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={showBookingModal} transparent animationType="fade" onRequestClose={() => setShowBookingModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: colors.backgroundSecondary, borderRadius: 14, padding: 16, maxHeight: '80%' }}>
            <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: '700' }}>Detail rezervácie</Text>
            {conversation?.booking ? (
              <Text style={{ color: colors.textSecondary, marginTop: 6 }}>
                {conversation.booking.fieldName} • {new Date(conversation.booking.date).toLocaleDateString('sk-SK')} • {String(conversation.booking.startTime).slice(0, 5)}
              </Text>
            ) : null}
            <Text style={{ color: colors.textPrimary, marginTop: 14, fontWeight: '700' }}>
              Potvrdení hráči: {acceptedCount}/{splits.length}
            </Text>
            <View style={{ marginTop: 10 }}>
              {splits.map((split) => (
                <View
                  key={split.id}
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 10,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    marginBottom: 8
                  }}
                >
                  <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{split.invitee_name || `Hráč #${split.invitee_user_id}`}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.textSecondary }}>{Number(split.amount || 0).toFixed(2)} €</Text>
                    <Text style={{ color: split.status === 'accepted' ? '#10b981' : '#fbbf24', fontSize: 12, marginTop: 1 }}>
                      {split.status === 'accepted'
                        ? 'Potvrdené'
                        : split.status === 'declined'
                        ? 'Odmietnuté'
                        : split.status === 'expired'
                        ? 'Expirované'
                        : 'Čaká sa'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {mySplit?.status === 'invited' ? (
              <Pressable
                onPress={() => {
                  setShowBookingModal(false);
                  setShowAcceptModal(true);
                }}
                style={{
                  marginTop: 8,
                  backgroundColor: colors.primary,
                  borderRadius: 10,
                  paddingVertical: 10,
                  alignItems: 'center'
                }}
              >
                <Text style={{ color: '#000000', fontWeight: '700' }}>
                  Zaplatiť a potvrdiť účasť ({Number(mySplit.amount || 0).toFixed(2)} €)
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => setShowBookingModal(false)} style={{ marginTop: 12, alignSelf: 'flex-end' }}>
              <Text style={{ color: colors.textSecondary, fontWeight: '700' }}>Zavrieť</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
