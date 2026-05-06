import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';
import { useSocket } from '../../contexts/SocketContext';
import { deleteMessage as apiDeleteMessage, fetchMessages, markConversationRead, sendMessage, setMessageReaction as apiSetMessageReaction } from '../api';
import { apiMessageToGifted } from './utils';
import { getConversationDisplayName } from '../groupData';
import { formatReadReceiptLabel, getLatestOwnUserMessageId } from './readReceiptUtils';

function deduplicateMessagesById(messages: any[]) {
  const seen = new Set();
  return messages.filter((m) => {
    const id = m._id != null ? String(m._id) : '';
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function useChatConversation(
  conversationId: number | undefined,
  conversation: any,
  currentUserId: number | null,
  options?: {
    onCreateConversationForFirstSend?: () => Promise<number | null>;
    onConversationReady?: (conversationId: number) => void;
  }
) {
  const conversationName = getConversationDisplayName(conversation);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(
    Number.isFinite(Number(conversationId)) ? Number(conversationId) : null
  );
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [memberReadsByUser, setMemberReadsByUser] = useState<Record<string, any>>({});
  const [typingByUserId, setTypingByUserId] = useState<Record<string, any>>({});
  const pendingReadMaxRef = useRef(0);
  const readDebounceRef = useRef<any>(null);
  const typingIdleTimerRef = useRef<any>(null);
  const typingBeaconAtRef = useRef(0);
  const typingClearTimersRef = useRef<Record<string, any>>({});
  const socketHadDisconnectRef = useRef(false);
  const conversationRef = useRef(conversation);
  conversationRef.current = conversation;
  const { socket } = useSocket();

  useEffect(() => {
    const nextId = Number(conversationId);
    if (Number.isFinite(nextId)) setActiveConversationId(nextId);
  }, [conversationId]);

  const giftedUser = useRef(currentUserId != null ? { _id: String(currentUserId), name: 'Ty' } : { _id: '0', name: 'Ty' }).current;
  if (currentUserId != null) giftedUser._id = String(currentUserId);

  const myTypingLabel = useMemo(() => {
    const m = conversation?.members?.find((x: any) => Number(x.id) === Number(currentUserId));
    if (m?.displayName) return String(m.displayName);
    return 'Ty';
  }, [conversation, currentUserId]);

  const loadMessages = useCallback(async () => {
    if (!activeConversationId) {
      setLoading(false);
      setMessages([]);
      return;
    }
    setLoading(true);
    try {
      const { messages: list } = await fetchMessages(activeConversationId);
      const gifted = list.map((m: any) => apiMessageToGifted(m, currentUserId, conversationName));
      setMessages([...gifted].reverse());
    } catch (_e) {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [activeConversationId, currentUserId, conversationName]);

  useEffect(() => {
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    const next: Record<string, any> = {};
    (conversation?.memberReads || []).forEach((r: any) => {
      if (r.userId != null) next[String(r.userId)] = r.lastReadMessageId;
    });
    setMemberReadsByUser(next);
  }, [activeConversationId, conversation]);

  const flushMarkConversationRead = useCallback(async () => {
    const maxId = pendingReadMaxRef.current;
    if (!maxId || !activeConversationId) return;
    try {
      await markConversationRead(activeConversationId, maxId);
    } catch (_e) {}
  }, [activeConversationId]);

  const scheduleMarkConversationRead = useCallback((messageId: any) => {
    const n = Number(messageId);
    if (!Number.isFinite(n)) return;
    pendingReadMaxRef.current = Math.max(pendingReadMaxRef.current, n);
    if (readDebounceRef.current) clearTimeout(readDebounceRef.current);
    readDebounceRef.current = setTimeout(() => {
      readDebounceRef.current = null;
      void flushMarkConversationRead();
    }, 450);
  }, [flushMarkConversationRead]);

  useEffect(() => () => { if (readDebounceRef.current) clearTimeout(readDebounceRef.current); }, []);

  useEffect(() => {
    if (loading || !messages.length) return;
    let max = 0;
    for (let i = 0; i < messages.length; i += 1) {
      const id = Number(messages[i]._id);
      if (Number.isFinite(id) && id > max) max = id;
    }
    if (max > 0) scheduleMarkConversationRead(max);
  }, [loading, messages, scheduleMarkConversationRead]);

  useEffect(() => {
    if (!socket || !activeConversationId) return;

    const onNewMessage = (msg: any) => {
      const sid = msg.senderId != null ? String(msg.senderId) : null;
      if (sid) {
        if (typingClearTimersRef.current[sid]) {
          clearTimeout(typingClearTimersRef.current[sid]);
          delete typingClearTimersRef.current[sid];
        }
        setTypingByUserId((prev) => {
          if (!prev[sid]) return prev;
          const next = { ...prev };
          delete next[sid];
          return next;
        });
      }
      setMessages((prev) => {
        const id = msg.id != null ? String(msg.id) : null;
        if (id && prev.some((m) => String(m._id) === id)) return prev;
        const g = apiMessageToGifted(msg, currentUserId, conversationName);
        return GiftedChat.append(prev, [g]);
      });
    };

    const joinConversation = () => socket.emit('join_conversation', activeConversationId);
    const onSocketDisconnect = () => { socketHadDisconnectRef.current = true; };
    const onSocketConnect = () => {
      joinConversation();
      if (socketHadDisconnectRef.current) {
        socketHadDisconnectRef.current = false;
        void loadMessages();
      }
    };

    socket.on('connect', onSocketConnect);
    socket.on('disconnect', onSocketDisconnect);
    if (socket.connected) joinConversation();

    const onMessageDeleted = ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    };
    const onReadReceipt = (payload: any) => {
      if (String(payload?.conversationId) !== String(activeConversationId)) return;
      if (payload.userId == null) return;
      setMemberReadsByUser((prev) => ({ ...prev, [String(payload.userId)]: payload.lastReadMessageId }));
    };
    const onMessageReactionUpdated = (payload: any) => {
      if (String(payload?.conversationId) !== String(activeConversationId) || payload?.message?.id == null) return;
      const mid = String(payload.message.id);
      setMessages((prev) => prev.map((m) => (String(m._id) === mid ? { ...m, meta: payload.message.meta != null ? payload.message.meta : null } : m)));
    };
    const onConversationTyping = (payload: any) => {
      if (String(payload?.conversationId) !== String(activeConversationId)) return;
      const uid = payload.userId != null ? String(payload.userId) : '';
      if (!uid || uid === String(currentUserId)) return;
      const conv = conversationRef.current;
      const displayName = (payload.displayName && String(payload.displayName).trim()) || conv?.members?.find((m: any) => String(m.id) === uid)?.displayName || 'Používateľ';
      if (payload.typing) {
        if (typingClearTimersRef.current[uid]) clearTimeout(typingClearTimersRef.current[uid]);
        setTypingByUserId((prev) => ({ ...prev, [uid]: { displayName } }));
        typingClearTimersRef.current[uid] = setTimeout(() => {
          setTypingByUserId((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          delete typingClearTimersRef.current[uid];
        }, 3500);
      } else {
        if (typingClearTimersRef.current[uid]) {
          clearTimeout(typingClearTimersRef.current[uid]);
          delete typingClearTimersRef.current[uid];
        }
        setTypingByUserId((prev) => {
          const next = { ...prev };
          delete next[uid];
          return next;
        });
      }
    };

    socket.on('new_message', onNewMessage);
    socket.on('message_deleted', onMessageDeleted);
    socket.on('read_receipt', onReadReceipt);
    socket.on('conversation_typing', onConversationTyping);
    socket.on('message_reaction_updated', onMessageReactionUpdated);

    return () => {
      socketHadDisconnectRef.current = false;
      Object.keys(typingClearTimersRef.current).forEach((k) => clearTimeout(typingClearTimersRef.current[k]));
      typingClearTimersRef.current = {};
      socket.off('new_message', onNewMessage);
      socket.off('message_deleted', onMessageDeleted);
      socket.off('read_receipt', onReadReceipt);
      socket.off('conversation_typing', onConversationTyping);
      socket.off('message_reaction_updated', onMessageReactionUpdated);
      socket.off('connect', onSocketConnect);
      socket.off('disconnect', onSocketDisconnect);
      if (socket.connected) {
        socket.emit('conversation_typing', { conversationId: activeConversationId, typing: false, displayName: myTypingLabel });
      }
      socket.emit('leave_conversation', activeConversationId);
    };
  }, [socket, activeConversationId, currentUserId, conversationName, myTypingLabel, loadMessages]);

  useEffect(() => {
    if (!socket?.connected || !activeConversationId) return undefined;
    const emit = (typing: boolean) => socket.emit('conversation_typing', { conversationId: activeConversationId, typing, displayName: myTypingLabel });
    if (!inputText.trim()) {
      if (typingIdleTimerRef.current) {
        clearTimeout(typingIdleTimerRef.current);
        typingIdleTimerRef.current = null;
      }
      typingBeaconAtRef.current = 0;
      emit(false);
      return undefined;
    }
    const now = Date.now();
    if (now - typingBeaconAtRef.current >= 1000) {
      typingBeaconAtRef.current = now;
      emit(true);
    }
    if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
    typingIdleTimerRef.current = setTimeout(() => {
      typingIdleTimerRef.current = null;
      typingBeaconAtRef.current = 0;
      emit(false);
    }, 2200);
    return () => {
      if (typingIdleTimerRef.current) clearTimeout(typingIdleTimerRef.current);
    };
  }, [inputText, socket, activeConversationId, myTypingLabel]);

  const onSend = useCallback(async (newMessages: any[] = []) => {
    const text = newMessages[0]?.text?.trim();
    if (!text || sending) return;

    let nextConversationId = activeConversationId;
    if (!nextConversationId && options?.onCreateConversationForFirstSend) {
      try {
        const createdId = await options.onCreateConversationForFirstSend();
        if (createdId && Number.isFinite(Number(createdId))) {
          nextConversationId = Number(createdId);
          setActiveConversationId(nextConversationId);
          options?.onConversationReady?.(nextConversationId);
        }
      } catch (_e) {}
    }
    if (!nextConversationId) return;

    if (socket?.connected) socket.emit('conversation_typing', { conversationId: nextConversationId, typing: false, displayName: myTypingLabel });
    typingBeaconAtRef.current = 0;
    setInputText('');
    setSending(true);
    try {
      const msg = await sendMessage(nextConversationId, text);
      const g = apiMessageToGifted(msg, currentUserId, conversationName);
      setMessages((prev) => GiftedChat.append(prev, [g]));
    } catch (_e) {
      setMessages((prev) => GiftedChat.append(prev, newMessages));
    } finally {
      setSending(false);
    }
  }, [activeConversationId, sending, currentUserId, conversationName, socket, myTypingLabel, options]);

  const onInputTextChanged = useCallback((text: string) => setInputText(text ?? ''), []);

  const onDeleteMessage = useCallback(async (messageId: any) => {
    if (!activeConversationId) return;
    setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    try {
      await apiDeleteMessage(activeConversationId, Number(messageId));
    } catch (_e) {
      void loadMessages();
    }
  }, [activeConversationId, loadMessages]);

  const setReaction = useCallback(async (messageId: any, emoji: string | null) => {
    if (!activeConversationId) return;
    try {
      const updated = await apiSetMessageReaction(activeConversationId, Number(messageId), emoji);
      setMessages((prev) => prev.map((m) => (String(m._id) === String(updated.id) ? { ...m, meta: updated.meta ?? null } : m)));
    } catch (_e) {}
  }, [activeConversationId]);

  const messagesForList = useMemo(() => deduplicateMessagesById(messages), [messages]);
  const latestOwnUserMessageId = useMemo(() => getLatestOwnUserMessageId(messagesForList, currentUserId), [messagesForList, currentUserId]);
  const getReadReceiptText = useCallback((message: any) => {
    if (!message || message.system || message.kind === 'system') return null;
    if (String(message.user?._id) !== String(currentUserId)) return null;
    if (String(message._id) !== String(latestOwnUserMessageId)) return null;
    return formatReadReceiptLabel({ messageId: message._id, currentUserId, conversation, memberReadsByUser });
  }, [latestOwnUserMessageId, currentUserId, conversation, memberReadsByUser]);

  const readSignature = useMemo(
    () => Object.keys(memberReadsByUser).sort((a, b) => Number(a) - Number(b)).map((k) => `${k}:${memberReadsByUser[k] ?? ''}`).join('|'),
    [memberReadsByUser]
  );
  const typingSignature = useMemo(
    () => Object.keys(typingByUserId).sort((a, b) => Number(a) - Number(b)).map((id) => `${id}:${typingByUserId[id]?.displayName || ''}`).join(';'),
    [typingByUserId]
  );
  const reactionsSignature = useMemo(
    () =>
      messagesForList
        .map((m) => {
          const r = m.meta && typeof m.meta === 'object' && m.meta.reactions && typeof m.meta.reactions === 'object' ? m.meta.reactions : {};
          return `${m._id}:${JSON.stringify(r)}`;
        })
        .join('|'),
    [messagesForList]
  );
  const giftedExtraData = useMemo(() => ({ s: readSignature, t: typingSignature, r: reactionsSignature }), [readSignature, typingSignature, reactionsSignature]);
  const typingTypers = useMemo(
    () =>
      Object.keys(typingByUserId)
        .sort((a, b) => Number(a) - Number(b))
        .map((id) => ({ userId: id, displayName: typingByUserId[id]?.displayName || 'Používateľ' })),
    [typingByUserId]
  );

  return { messages: messagesForList, loading, sending, onSend, onDeleteMessage, setReaction, giftedUser, inputText, onInputTextChanged, getReadReceiptText, giftedExtraData, typingTypers };
}
