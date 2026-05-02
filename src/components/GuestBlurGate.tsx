import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle
} from 'react-native';
import { BlurView } from 'expo-blur';
import { colors } from '../constants/colors';
import { storageService } from '../storage';

type GuestBlurGateProps = {
  isGuest: boolean;
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

/** Len vrstva blur + CTA (napr. Booking pri výbere času ako hosť). */
export function GuestBlurOverlay({
  visible,
  title = 'Len pre prihlásených',
  subtitle = 'Rezervácie sú dostupné po prihlásení.'
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
}) {
  if (!visible) {
    return null;
  }
  return (
    <View style={styles.overlay} pointerEvents="auto">
      {Platform.OS === 'web' ? (
        <View style={[styles.webFallbackBlur, StyleSheet.absoluteFill]} />
      ) : (
        <BlurView intensity={72} tint="dark" style={StyleSheet.absoluteFill} />
      )}
      <View style={[styles.dimTint, StyleSheet.absoluteFill]} />
      <View style={styles.centerBox}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <TouchableOpacity
          style={styles.cta}
          onPress={() => storageService.setGuestMode(false)}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>Prihlásiť sa</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function GuestBlurGate({
  isGuest,
  children,
  title = 'Len pre prihlásených',
  subtitle = 'Prihlás sa a používaj rezervácie, scan a osobný účet.',
  containerStyle
}: GuestBlurGateProps) {
  return (
    <View style={[styles.wrap, containerStyle]}>
      {children}
      <GuestBlurOverlay visible={isGuest} title={title} subtitle={subtitle} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden'
  },
  webFallbackBlur: {
    backgroundColor: 'rgba(10, 12, 18, 0.92)'
  },
  dimTint: {
    backgroundColor: 'rgba(0, 0, 0, 0.25)'
  },
  centerBox: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28
  },
  title: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8
  },
  subtitle: {
    color: colors.textTertiary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22
  },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999
  },
  ctaText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700'
  }
});
