import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { getConversationDisplayName, getConversationInitials, getGroupColorOption } from './groupData';

export function avatarUri(name: string) {
  const encoded = encodeURIComponent((name || '?').trim());
  return `https://ui-avatars.com/api/?name=${encoded}&background=0f172a&color=94a3b8&size=96`;
}

export function ConversationAvatar({ conversation, size = 48 }: { conversation: any; size?: number }) {
  const displayName = getConversationDisplayName(conversation);
  const isGroup = conversation?.isGroup || conversation?.type === 'group';

  if (!isGroup) {
    return <Image source={{ uri: avatarUri(displayName) }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  const option = getGroupColorOption(conversation?.color);
  const initials = getConversationInitials(displayName);
  return (
    <View style={[styles.groupAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: option.colors[0] }]}>
      <Text style={styles.groupAvatarText}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  groupAvatar: { alignItems: 'center', justifyContent: 'center' },
  groupAvatarText: { color: '#fff', fontWeight: '900', fontSize: 16 }
});
