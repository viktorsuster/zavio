import React from 'react';
import { Image, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { colors } from '../constants/colors';

type AvatarProps = {
  uri?: string | null;
  name?: string | null;
  size?: number;
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

function getInitials(fullName?: string | null) {
  const name = (fullName || '').trim();
  if (!name) return '?';
  const parts = name.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return (first + last).toUpperCase() || '?';
}

export default function Avatar({ uri, name, size = 40, containerStyle, textStyle }: AvatarProps) {
  const d = Math.max(1, size);
  const radius = d / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: d, height: d, borderRadius: radius }, containerStyle]}
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: d, height: d, borderRadius: radius }, containerStyle]}>
      <Text style={[styles.fallbackText, { fontSize: Math.max(10, Math.round(d * 0.35)) }, textStyle]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#334155'
  },
  fallback: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center'
  },
  fallbackText: {
    color: '#FFFFFF',
    fontWeight: '800'
  }
});





