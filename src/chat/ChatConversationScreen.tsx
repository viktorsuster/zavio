import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from 'react-native';
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
import { createOrGetConversation } from './api';

type Route = RouteProp<RootStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation<any>();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { conversationId, conversation: conversationFromRoute } = (route.params || {}) as any;
  const [resolvedConversationId, setResolvedConversationId] = useState<number | null>(
    Number.isFinite(Number(conversationId)) ? Number(conversationId) : null
  );
  const lazyOtherUserId = Number((route.params as any)?.otherUserId);
  const lazyOtherUserDisplayName = String((route.params as any)?.otherUserDisplayName || 'Používateľ');
  const currentUserId = Number(storageService.getUser()?.id ?? 0);
  const isDark = true;
  const [conversation, setConversation] = useState<any>(route.params?.conversation || null);
  const [conversationLoading, setConversationLoading] = useState(!conversationFromRoute);
  const [splits, setSplits] = useState<any[]>([]);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const bookingHeaderTitle = useMemo(() => {
    const booking = conversation?.booking;
    if (!booking) return '';
    const rawDate = String(booking.date || '');
    const parts = rawDate.slice(0, 10).split('-');
    const dateLabel = parts.length === 3 ? `${parts[2]}.${parts[1]}` : rawDate;
    const timeLabel = String(booking.startTime || '').slice(0, 5);
    return `${booking.fieldName} • ${dateLabel} ${timeLabel}`.trim();
  }, [conversation?.booking]);

  useEffect(() => {
    if (Number.isFinite(Number(conversationId))) {
      setResolvedConversationId(Number(conversationId));
    }
  }, [conversationId]);

  const refreshConversation = useCallback(async () => {
    if (!resolvedConversationId) return;
    setConversationLoading(true);
    try {
      const conversationData = await fetchConversation(Number(resolvedConversationId));
      setConversation(conversationData);
    } catch (_error) {
      if (!conversationFromRoute) setConversation(null);
    } finally {
      setConversationLoading(false);
    }
  }, [conversationFromRoute, resolvedConversationId]);

  const { messages, loading, sending, onSend, onDeleteMessage, setReaction, giftedUser, inputText, onInputTextChanged, getReadReceiptText, giftedExtraData, typingTypers } =
    useChatConversation(
      resolvedConversationId ?? undefined,
      conversation,
      currentUserId,
      Number.isFinite(lazyOtherUserId)
        ? {
            onCreateConversationForFirstSend: async () => {
              const conv = await createOrGetConversation(lazyOtherUserId);
              setConversation(conv);
              setResolvedConversationId(Number(conv.id));
              return Number(conv.id);
            },
            onConversationReady: (nextId) => {
              navigation.setParams({ conversationId: nextId });
            }
          }
        : undefined
    );

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
            <Pressable
              onPress={() =>
                navigation.navigate('ReservationDetail', {
                  bookingId: Number(conversation.booking.id),
                  booking: conversation.booking
                })
              }
              hitSlop={8}
            >
              <Text style={{ color: colors.textPrimary, fontSize: 17, fontWeight: '700' }}>
                {bookingHeaderTitle || title}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>Detail rezervácie</Text>
            </Pressable>
          )
        : title,
      headerRight: conversation?.isGroup
        ? () => (
            <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
              <Pressable
                onPress={() => navigation.navigate('ChatGroupSettings', { conversationId: Number(resolvedConversationId) })}
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
  }, [navigation, conversation, bookingHeaderTitle]);

  if (!resolvedConversationId && !Number.isFinite(lazyOtherUserId)) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#f8fafc' }}><Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 16 }}>Chýba konverzácia.</Text></View>;
  }
  if (loading || conversationLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: isDark ? '#000000' : '#f8fafc' }}><ActivityIndicator size="large" color={isDark ? '#94a3b8' : '#64748b'} /></View>;
  }

  return (
    <View style={{ flex: 1 }}>
      {conversation?.booking ? (
        <Pressable
          onPress={() =>
            navigation.navigate('ReservationDetail', {
              bookingId: Number(conversation.booking.id),
              booking: conversation.booking
            })
          }
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
        </Pressable>
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
                  } catch (error: any) {
                    Alert.alert('Pozvanie sa nepodarilo potvrdiť', error?.message || 'Skús to prosím znova.');
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
    </View>
  );
}
