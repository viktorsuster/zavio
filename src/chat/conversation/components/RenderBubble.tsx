import React, { useCallback, useMemo } from 'react';
import { Text, View } from 'react-native';
import { Bubble } from 'react-native-gifted-chat';

const SENDER_NAME_COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f97316', '#eab308', '#ef4444', '#14b8a6', '#3b82f6'];

function aggregateReactionCounts(reactions: any) {
  if (!reactions || typeof reactions !== 'object') return [];
  const counts: Record<string, number> = {};
  Object.values(reactions).forEach((e: any) => {
    if (typeof e === 'string' && e) counts[e] = (counts[e] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function ReactionChips({ reactions, isDark, alignEnd }: any) {
  const entries = useMemo(() => aggregateReactionCounts(reactions), [reactions]);
  if (!entries.length) return null;
  const chipBg = isDark ? '#334155' : '#e2e8f0';
  const chipText = isDark ? '#e2e8f0' : '#334155';
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4, maxWidth: '78%', alignSelf: alignEnd ? 'flex-end' : 'flex-start', marginLeft: alignEnd ? 0 : 8, marginRight: alignEnd ? 10 : 0, gap: 6, justifyContent: alignEnd ? 'flex-end' : 'flex-start' }}>
      {entries.map(([emoji, n]) => (
        <View key={emoji} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: chipBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14 }}>
          <Text style={{ fontSize: 14 }}>{emoji}</Text>
          {n > 1 ? <Text style={{ fontSize: 12, marginLeft: 3, fontWeight: '700', color: chipText }}>{n}</Text> : null}
        </View>
      ))}
    </View>
  );
}

function formatTimeSk24h(value: any) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('sk-SK', { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

function getStableColorFromName(value: any) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return SENDER_NAME_COLORS[0];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return SENDER_NAME_COLORS[Math.abs(hash) % SENDER_NAME_COLORS.length];
}

function getDateMs(value: any) {
  if (!value) return Number.NaN;
  const d = value instanceof Date ? value : new Date(value);
  return d.getTime();
}

function isSameDay(a: any, b: any) {
  if (!a || !b) return false;
  const d1 = a instanceof Date ? a : new Date(a);
  const d2 = b instanceof Date ? b : new Date(b);
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime())) return false;
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function getOlderAdjacentMessage(currentMessage: any, previousMessage: any, nextMessage: any) {
  const currentMs = getDateMs(currentMessage?.createdAt);
  const previousMs = getDateMs(previousMessage?.createdAt);
  const nextMs = getDateMs(nextMessage?.createdAt);
  if (Number.isFinite(currentMs) && Number.isFinite(previousMs) && previousMs < currentMs) return previousMessage;
  if (Number.isFinite(currentMs) && Number.isFinite(nextMs) && nextMs < currentMs) return nextMessage;
  return previousMessage || nextMessage || null;
}

function getNewerAdjacentMessage(currentMessage: any, previousMessage: any, nextMessage: any) {
  const currentMs = getDateMs(currentMessage?.createdAt);
  const previousMs = getDateMs(previousMessage?.createdAt);
  const nextMs = getDateMs(nextMessage?.createdAt);
  if (Number.isFinite(currentMs) && Number.isFinite(previousMs) && previousMs > currentMs) return previousMessage;
  if (Number.isFinite(currentMs) && Number.isFinite(nextMs) && nextMs > currentMs) return nextMessage;
  return previousMessage || nextMessage || null;
}

export function RenderBubble(props: any) {
  const { theme, onOpenReactionMenu, readReceiptText } = props;
  const radius = theme?.bubbleBorderRadius ?? 18;
  const alignEnd = props.position === 'right';
  const message = props.currentMessage;
  const reactions = message?.meta?.reactions;
  const isDark = theme?.isDark === true;
  const senderName = String(message?.user?.name || '').trim();
  const senderNameColor = useMemo(() => getStableColorFromName(senderName), [senderName]);
  const olderAdjacentMessage = getOlderAdjacentMessage(props.currentMessage, props.previousMessage, props.nextMessage);
  const newerAdjacentMessage = getNewerAdjacentMessage(props.currentMessage, props.previousMessage, props.nextMessage);
  const isTopBubbleInSenderBlock = String(olderAdjacentMessage?.user?._id || '') !== String(message?.user?._id || '');
  const isLastBubbleInSenderBlock = String(newerAdjacentMessage?.user?._id || '') !== String(message?.user?._id || '');
  const shouldShowSenderName = !alignEnd && senderName && isTopBubbleInSenderBlock;
  const avatarMessageToCompare = props.nextMessage;
  const hasAvatarOnThisMessage =
    !alignEnd &&
    !(
      avatarMessageToCompare &&
      String(avatarMessageToCompare?.user?._id || '') === String(message?.user?._id || '') &&
      isSameDay(avatarMessageToCompare?.createdAt, message?.createdAt)
    );

  const handleLongPress = useCallback((_context: any, msg: any) => {
    if (msg?.system || msg?.kind === 'system') return;
    onOpenReactionMenu?.(msg);
  }, [onOpenReactionMenu]);

  const footerColor = theme?.readReceiptColor ?? '#64748b';

  const bubble = (
    <Bubble
      {...props}
      onLongPress={handleLongPress}
      wrapperStyle={{
        right: { backgroundColor: theme?.bubbleRight ?? '#10b981', borderRadius: radius, marginLeft: 56, marginRight: 8, minHeight: 36, paddingHorizontal: 14, paddingVertical: 6 },
        left: { backgroundColor: theme?.bubbleLeft ?? '#e2e8f0', borderRadius: radius, marginLeft: 8, marginRight: 56, minHeight: 36, paddingHorizontal: 14, paddingVertical: 6 }
      }}
      containerStyle={{ right: { marginRight: 0, marginLeft: 0 }, left: { marginRight: 0, marginLeft: 0 } }}
      textStyle={{
        right: { color: '#ffffff', fontSize: 16, lineHeight: 22 },
        left: { color: theme?.leftBubbleTextColor ?? '#0f172a', fontSize: 16, lineHeight: 22 }
      }}
      renderMessageText={({ currentMessage }: any) => (
        <Text style={{ margin: 0, padding: 0, fontSize: 16, lineHeight: 22, color: alignEnd ? '#ffffff' : theme?.leftBubbleTextColor ?? '#0f172a' }}>
          {currentMessage?.text || ''}
        </Text>
      )}
      isCustomViewBottom={false}
      renderCustomView={() =>
        shouldShowSenderName ? (
          <Text style={{ marginBottom: 4, fontSize: 12, lineHeight: 16, fontWeight: '700', color: isDark ? senderNameColor : senderNameColor }} numberOfLines={1}>
            {senderName}
          </Text>
        ) : null
      }
      renderTime={({ currentMessage }: any) => {
        const formattedTime = formatTimeSk24h(currentMessage?.createdAt);
        if (!formattedTime) return null;
        return <Text style={{ marginTop: 4, fontSize: 11, lineHeight: 14, fontWeight: '600', alignSelf: 'flex-end', color: alignEnd ? 'rgba(255,255,255,0.8)' : isDark ? '#cbd5e1' : '#64748b' }}>{formattedTime}</Text>;
      }}
    />
  );

  return (
    <View style={{ alignSelf: 'stretch', alignItems: alignEnd ? 'flex-end' : 'flex-start', marginTop: 0, marginBottom: (hasAvatarOnThisMessage ? 4 : 0) + (alignEnd && isLastBubbleInSenderBlock ? 4 : 0) }}>
      {bubble}
      <ReactionChips reactions={reactions} isDark={isDark} alignEnd={alignEnd} />
      {readReceiptText ? (
        <Text style={{ fontSize: 12, lineHeight: 16, marginTop: 4, marginRight: 10, marginBottom: 4, maxWidth: '78%', textAlign: 'right', color: footerColor, fontWeight: '600' }} numberOfLines={2}>
          {readReceiptText}
        </Text>
      ) : null}
    </View>
  );
}
