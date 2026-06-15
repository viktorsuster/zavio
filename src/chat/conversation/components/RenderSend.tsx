import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../constants/colors';
import {
  COMPOSER_SEND_BUTTON_SIZE,
  isNativeComposerAvailable,
  NativeComposerButton
} from '../../../components/NativeComposerControls';

export function RenderSend({ text, onSend, user, sending, theme }: any) {
  const canSend = text && String(text).trim().length > 0 && !sending;

  const handlePress = () => {
    if (!canSend || !onSend || !user) return;
    const trimmed = String(text).trim();
    if (!trimmed) return;
    onSend([{ _id: Math.round(Math.random() * 1e12), text: trimmed, createdAt: new Date(), user }]);
  };

  if (isNativeComposerAvailable) {
    return (
      <View style={styles.sendContainer}>
        <NativeComposerButton
          systemImage="arrow.up"
          accessibilityLabel="Odoslať"
          onPress={handlePress}
          prominent
          tintColor={colors.primary}
          disabled={!canSend}
          size={COMPOSER_SEND_BUTTON_SIZE}
        />
      </View>
    );
  }

  const bgColor = canSend ? (theme?.sendButtonActive ?? '#10b981') : (theme?.sendButtonInactive ?? '#cbd5e1');

  return (
    <View style={styles.sendContainer}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.sendButton, { backgroundColor: bgColor }]}
        onPress={handlePress}
        disabled={!canSend}
      >
        <Ionicons name="send" size={22} color="#0f172a" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sendContainer: {
    height: COMPOSER_SEND_BUTTON_SIZE,
    width: COMPOSER_SEND_BUTTON_SIZE,
    minHeight: COMPOSER_SEND_BUTTON_SIZE,
    minWidth: COMPOSER_SEND_BUTTON_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginLeft: 4,
    alignSelf: 'flex-end'
  },
  sendButton: {
    width: COMPOSER_SEND_BUTTON_SIZE,
    height: COMPOSER_SEND_BUTTON_SIZE,
    borderRadius: COMPOSER_SEND_BUTTON_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
