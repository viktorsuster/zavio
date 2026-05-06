import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { avatarUri } from '../../ConversationAvatar';

const AVATAR = 28;
const OVERLAP = 10;

function BouncingDots({ color }: { color: string }) {
  const y0 = useRef(new Animated.Value(0)).current;
  const y1 = useRef(new Animated.Value(0)).current;
  const y2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const bounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 260, useNativeDriver: true })
        ])
      );
    const loops = [bounce(y0, 0), bounce(y1, 140), bounce(y2, 280)].map((l) => {
      l.start();
      return l;
    });
    return () => loops.forEach((l) => l.stop());
  }, [y0, y1, y2]);

  const dotStyle = (anim: Animated.Value) => ({
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }]
  });

  return (
    <View style={styles.dotsRow}>
      {[y0, y1, y2].map((anim, i) => (
        <Animated.View key={i} style={[styles.dot, { backgroundColor: color, marginRight: i < 2 ? 5 : 0 }, dotStyle(anim)]} />
      ))}
    </View>
  );
}

export function TypingIndicatorFooter({ typers, isDark }: any) {
  if (!typers?.length) return null;
  const dotColor = isDark ? '#94a3b8' : '#64748b';
  const labelColor = isDark ? '#94a3b8' : '#64748b';
  const border = isDark ? '#020617' : '#f8fafc';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.avatarStack}>
        {typers.map((t: any, index: number) => (
          <Image
            key={String(t.userId)}
            source={{ uri: avatarUri(t.displayName) }}
            style={[styles.avatar, { marginLeft: index === 0 ? 0 : -OVERLAP, borderColor: border }]}
          />
        ))}
      </View>
      <View style={styles.textCol}>
        <BouncingDots color={dotColor} />
        <Text style={[styles.caption, { color: labelColor }]} numberOfLines={1}>
          {typers.length === 1 ? `${typers[0].displayName} píše…` : 'Viacerí píšu…'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', paddingLeft: 12, paddingRight: 12, paddingTop: 6, paddingBottom: 4, minHeight: 40 },
  avatarStack: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
  avatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2, borderWidth: 2 },
  textCol: { flex: 1, justifyContent: 'center' },
  dotsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.95 },
  caption: { fontSize: 12, fontWeight: '600' }
});
