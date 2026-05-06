import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../navigation/types';
import { apiService, ChatMessage } from '../services/api';
import { colors } from '../constants/colors';
import { useSocket } from '../contexts/SocketContext';
import { storageService } from '../storage';

type ChatRoute = RouteProp<RootStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  const route = useRoute<ChatRoute>();
  const { conversationId } = route.params;
  const { socket } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [typingText, setTypingText] = useState('');

  const currentUserId = Number(storageService.getUser()?.id ?? 0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const response = await apiService.getChatMessages(conversationId, 50);
        if (mounted) {
          setMessages(response.messages);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [conversationId]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_conversation', conversationId);

    const onNewMessage = (message: ChatMessage) => {
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== currentUserId) {
        void apiService.markChatRead(conversationId, message.id);
      }
    };

    const onTyping = (payload: { conversationId: number; typing: boolean; displayName?: string }) => {
      if (Number(payload.conversationId) !== Number(conversationId)) return;
      if (payload.typing) {
        setTypingText(`${payload.displayName || 'Pouzivatel'} pise...`);
      } else {
        setTypingText('');
      }
    };

    const onReactionUpdated = (payload: { conversationId: number; message: ChatMessage }) => {
      if (Number(payload.conversationId) !== Number(conversationId)) return;
      setMessages((prev) => prev.map((m) => (m.id === payload.message.id ? payload.message : m)));
    };

    socket.on('new_message', onNewMessage);
    socket.on('conversation_typing', onTyping);
    socket.on('message_reaction_updated', onReactionUpdated);

    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', onNewMessage);
      socket.off('conversation_typing', onTyping);
      socket.off('message_reaction_updated', onReactionUpdated);
    };
  }, [socket, conversationId, currentUserId]);

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await apiService.sendChatMessage(conversationId, text);
      setInput('');
      if (socket) {
        socket.emit('conversation_typing', { conversationId, typing: false });
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <FlatList
          data={sortedMessages}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = Number(item.senderId) === currentUserId;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.sender}>{item.senderDisplayName}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            );
          }}
        />

        {typingText ? <Text style={styles.typing}>{typingText}</Text> : null}

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            placeholder="Napis spravu..."
            placeholderTextColor={colors.textDisabled}
            onChangeText={(text) => {
              setInput(text);
              if (socket) {
                socket.emit('conversation_typing', {
                  conversationId,
                  typing: text.trim().length > 0,
                  displayName: storageService.getUser()?.name || 'Pouzivatel'
                });
              }
            }}
          />
          <Pressable onPress={send} style={styles.sendButton}>
            <Text style={styles.sendButtonText}>{sending ? '...' : 'Odoslat'}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  list: { padding: 16, gap: 10 },
  bubble: { padding: 12, borderRadius: 12, maxWidth: '84%' },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.gold },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  sender: { fontSize: 11, color: '#64748b', marginBottom: 4, fontWeight: '600' },
  body: { color: colors.textPrimary, fontSize: 15 },
  typing: { color: colors.textSecondary, paddingHorizontal: 16, paddingBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border
  },
  input: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.textPrimary
  },
  sendButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12
  },
  sendButtonText: { color: '#000000', fontWeight: '700' }
});
