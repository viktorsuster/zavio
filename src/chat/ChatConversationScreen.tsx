import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../constants/colors';
import { useSocket } from '../contexts/SocketContext';
import { storageService } from '../storage';
import { fetchConversation, fetchMessages, markConversationRead, sendMessage } from './api';
import ChatGroupManageModal from './ChatGroupManageModal';

type Route = RouteProp<RootStackParamList, 'ChatConversation'>;

export default function ChatConversationScreen() {
  const route = useRoute<Route>();
  const navigation = useNavigation();
  const conversationId = Number(route.params.conversationId);
  const [conversation, setConversation] = useState<any>(route.params?.conversation || null);
  const { socket } = useSocket();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState('');
  const me = Number(storageService.getUser()?.id ?? 0);

  useEffect(() => {
    const load = async () => {
      const data = await fetchMessages(conversationId);
      setMessages(data.messages || []);
      try {
        const detail = await fetchConversation(conversationId);
        setConversation(detail);
      } catch (_error) {}
    };
    void load();
  }, [conversationId]);

  const [manageVisible, setManageVisible] = useState(false);

  useLayoutEffect(() => {
    const title = conversation?.displayName || conversation?.title || 'Chat';
    navigation.setOptions({
      title,
      headerRight: conversation?.isGroup
        ? () => (
            <Pressable onPress={() => setManageVisible(true)} style={{ padding: 6 }}>
              <Ionicons name="information-circle-outline" size={20} color={colors.textPrimary} />
            </Pressable>
          )
        : undefined
    });
  }, [navigation, conversation]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('join_conversation', conversationId);
    const onNew = (payload: any) => {
      setMessages((prev) => [...prev, payload]);
      if (Number(payload.senderId) !== me) {
        void markConversationRead(conversationId, Number(payload.id));
      }
    };
    const onDeleted = (payload: any) => {
      setMessages((prev) => prev.filter((m) => Number(m.id) !== Number(payload.messageId)));
    };
    const onTyping = (payload: any) => {
      if (Number(payload.conversationId) !== conversationId || Number(payload.userId) === me) return;
      setTyping(payload.typing ? `${payload.displayName || 'Pouzivatel'} pise...` : '');
    };
    socket.on('new_message', onNew);
    socket.on('message_deleted', onDeleted);
    socket.on('conversation_typing', onTyping);
    return () => {
      socket.emit('leave_conversation', conversationId);
      socket.off('new_message', onNew);
      socket.off('message_deleted', onDeleted);
      socket.off('conversation_typing', onTyping);
    };
  }, [socket, conversationId, me]);

  const ordered = useMemo(
    () => [...messages].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [messages]
  );

  const submit = async () => {
    const body = input.trim();
    if (!body) return;
    await sendMessage(conversationId, body);
    setInput('');
    socket?.emit('conversation_typing', { conversationId, typing: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <FlatList
          data={ordered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const mine = Number(item.senderId) === me;
            return (
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                <Text style={styles.name}>{item.senderDisplayName}</Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            );
          }}
        />
        {typing ? <Text style={styles.typing}>{typing}</Text> : null}
        <View style={styles.footer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={(value) => {
              setInput(value);
              socket?.emit('conversation_typing', {
                conversationId,
                typing: value.trim().length > 0,
                displayName: storageService.getUser()?.name || 'Pouzivatel'
              });
            }}
            placeholder="Napis spravu..."
            placeholderTextColor={colors.textDisabled}
          />
          <Pressable style={styles.send} onPress={() => void submit()}>
            <Text style={styles.sendText}>Odoslat</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      <ChatGroupManageModal visible={manageVisible} onClose={() => setManageVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16, gap: 10, paddingBottom: 90 },
  bubble: { maxWidth: '82%', borderRadius: 12, padding: 10 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.backgroundSecondary, borderWidth: 1, borderColor: colors.border },
  name: { color: '#64748b', fontSize: 11, fontWeight: '700' },
  body: { color: colors.textPrimary, marginTop: 2 },
  typing: { paddingHorizontal: 14, paddingBottom: 8, color: colors.textSecondary },
  footer: { flexDirection: 'row', gap: 8, borderTopWidth: 1, borderTopColor: colors.border, padding: 12 },
  input: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.backgroundSecondary, color: colors.textPrimary, paddingHorizontal: 10 },
  send: { justifyContent: 'center', backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12 },
  sendText: { color: '#000', fontWeight: '700' }
});
