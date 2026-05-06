import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableOpacity, View } from 'react-native';

export function RenderSend({ text, onSend, user, sending, theme }: any) {
  const canSend = text && String(text).trim().length > 0 && !sending;
  const bgColor = canSend ? (theme?.sendButtonActive ?? '#10b981') : (theme?.sendButtonInactive ?? '#cbd5e1');

  const handlePress = () => {
    if (!canSend || !onSend || !user) return;
    const trimmed = String(text).trim();
    if (!trimmed) return;
    onSend([{ _id: Math.round(Math.random() * 1e12), text: trimmed, createdAt: new Date(), user }]);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8, marginBottom: 6, justifyContent: 'flex-end' }}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 14,
          height: 40,
          borderRadius: 20,
          backgroundColor: bgColor,
          justifyContent: 'center'
        }}
        onPress={handlePress}
        disabled={!canSend}
      >
        <Text style={{ color: '#0f172a', fontSize: 16, fontWeight: '700' }}>Odoslať</Text>
        <Ionicons name="send" size={16} color="#0f172a" />
      </TouchableOpacity>
    </View>
  );
}
