import React, { useCallback } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CHAT_REACTION_EMOJIS } from '../constants/reactions';

export function ReactionPickerModal({
  visible,
  message,
  currentUserId,
  isDark,
  onClose,
  onSetReaction,
  onDeleteMessage
}: any) {
  const insets = useSafeAreaInsets();
  const myId = currentUserId != null ? String(currentUserId) : '';
  const isOwn = message && myId && String(message.user?._id) === myId;

  const handleEmoji = useCallback(
    async (emoji: string) => {
      if (!message?._id || !onSetReaction) return;
      const cur = message.meta?.reactions?.[myId];
      const next = cur === emoji ? null : emoji;
      await onSetReaction(message._id, next);
      onClose?.();
    },
    [message, myId, onSetReaction, onClose]
  );

  const panelBg = isDark ? '#1e293b' : '#ffffff';
  const borderCol = isDark ? '#334155' : '#e2e8f0';
  const textMuted = isDark ? '#94a3b8' : '#64748b';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }} onPress={(e) => e.stopPropagation()}>
          <View style={{ marginHorizontal: 12, borderRadius: 20, backgroundColor: panelBg, borderWidth: 1, borderColor: borderCol, paddingVertical: 14, paddingHorizontal: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
              {CHAT_REACTION_EMOJIS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => handleEmoji(emoji)}
                  style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderRadius: 14, backgroundColor: pressed ? (isDark ? '#334155' : '#f1f5f9') : 'transparent' })}
                >
                  <Text style={{ fontSize: 30 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
            {isOwn && onDeleteMessage ? (
              <Pressable onPress={() => { onDeleteMessage(); onClose?.(); }} style={{ marginTop: 12, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: '#dc2626', fontSize: 16, fontWeight: '600' }}>Vymazať správu</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={onClose} style={{ marginTop: 4, paddingVertical: 12, alignItems: 'center' }}>
              <Text style={{ color: textMuted, fontSize: 16 }}>Zrušiť</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
