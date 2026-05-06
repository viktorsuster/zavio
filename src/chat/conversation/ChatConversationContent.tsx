import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GiftedChat, InputToolbar, SystemMessage } from 'react-native-gifted-chat';
import { getChatTheme } from './theme';
import { RenderBubble } from './components/RenderBubble';
import { RenderSend } from './components/RenderSend';
import { TypingIndicatorFooter } from './components/TypingIndicatorFooter';
import { ReactionPickerModal } from './components/ReactionPickerModal';

const INPUT_TOOLBAR_STYLES = StyleSheet.create({
  container: { borderTopWidth: 1, paddingHorizontal: 8, paddingTop: 8 },
  primary: { flexDirection: 'row', alignItems: 'center' },
  textInput: {
    flex: 1,
    marginRight: 8,
    borderRadius: 20,
    paddingHorizontal: 12,
    minHeight: 40,
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: 'transparent'
  }
});

const AVATAR_COLORS = ['#0ea5e9', '#22c55e', '#a855f7', '#f97316', '#eab308', '#ef4444', '#14b8a6', '#3b82f6'];
const LEFT_MESSAGE_AVATAR_SIZE = 36;

function isSameCalendarDay(a: any, b: any) {
  if (!(a instanceof Date) || !(b instanceof Date)) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatChatDaySk(value: any) {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameCalendarDay(d, now)) return 'Dnes';
  if (isSameCalendarDay(d, yesterday)) return 'Včera';
  return new Intl.DateTimeFormat('sk-SK', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

function getStableColorFromName(value: any) {
  const text = String(value || '').trim().toLowerCase();
  if (!text) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: any) {
  const text = String(name || '').trim();
  if (!text) return '?';
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[parts.length - 1].slice(0, 1)}`.toUpperCase();
}

function CustomComposer({ text, onTextChanged, composerHeight, onInputSizeChanged, placeholder, placeholderTextColor, textInputStyle }: any) {
  const handleContentSizeChange = useCallback((e: any) => onInputSizeChanged?.(e.nativeEvent.contentSize), [onInputSizeChanged]);
  return (
    <TextInput
      value={text}
      onChangeText={onTextChanged}
      onContentSizeChange={handleContentSizeChange}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor}
      multiline
      editable
      style={[
        INPUT_TOOLBAR_STYLES.textInput,
        textInputStyle,
        { height: Math.max(44, composerHeight ?? 44), ...(Platform.OS === 'web' ? { outlineWidth: 0 as any, outlineColor: 'transparent' as any } : {}) }
      ]}
      underlineColorAndroid="transparent"
    />
  );
}

export function ChatConversationContent({
  messages, onSend, onDeleteMessage, setReaction, giftedUser, sending, isDark, insets: insetsProp, keyboardVerticalOffset = 0, inputText = '', onInputTextChanged, getReadReceiptText, giftedExtraData, typingTypers = []
}: any) {
  const insets = useSafeAreaInsets();
  const bottomInset = insetsProp?.bottom ?? insets?.bottom ?? 0;
  const theme = getChatTheme(isDark, { ...insets, bottom: bottomInset });
  const [reactionMenuMessage, setReactionMenuMessage] = useState<any>(null);
  const [androidKeyboardVisible, setAndroidKeyboardVisible] = useState(false);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const showSub = Keyboard.addListener('keyboardDidShow', () => setAndroidKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setAndroidKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onOpenReactionMenu = useCallback((message: any) => {
    if (message?.system || message?.kind === 'system') return;
    setReactionMenuMessage(message);
  }, []);

  const shouldUpdateMessage = useMemo(
    () => (props: any, nextProps: any) => props.extraData?.s !== nextProps.extraData?.s || props.extraData?.t !== nextProps.extraData?.t || props.extraData?.r !== nextProps.extraData?.r,
    []
  );

  const renderTypingFooter = useCallback(() => <TypingIndicatorFooter typers={typingTypers} isDark={isDark} />, [typingTypers, isDark]);
  const renderInputToolbar = useCallback(
    (props: any) => (
      <InputToolbar
        {...props}
        containerStyle={[
          INPUT_TOOLBAR_STYLES.container,
          theme.inputToolbarContainerStyle,
          Platform.OS === 'android'
            ? { paddingBottom: androidKeyboardVisible ? 6 : Math.max(bottomInset, 8) }
            : null
        ]}
        primaryStyle={INPUT_TOOLBAR_STYLES.primary}
      />
    ),
    [theme.inputToolbarContainerStyle, bottomInset, androidKeyboardVisible]
  );
  const renderComposer = useCallback((props: any) => (
    <CustomComposer
      text={inputText}
      onTextChanged={onInputTextChanged ?? (() => {})}
      composerHeight={props.composerHeight}
      onInputSizeChanged={props.onInputSizeChanged}
      placeholder={props.placeholder ?? 'Napíš správu...'}
      placeholderTextColor={theme.placeholderTextColor}
      textInputStyle={[INPUT_TOOLBAR_STYLES.textInput, { color: theme.inputText, backgroundColor: theme.inputBackground }]}
    />
  ), [inputText, onInputTextChanged, theme.inputText, theme.inputBackground, theme.placeholderTextColor]);

  const renderSystemMessage = useCallback((props: any) => (
    <SystemMessage {...props} containerStyle={{ marginBottom: 10, marginTop: 2 }} textStyle={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 13, lineHeight: 18, textAlign: 'center', fontWeight: '600' }} />
  ), [isDark]);

  const renderDay = useCallback(({ currentMessage, createdAt }: any) => {
    const label = formatChatDaySk(currentMessage?.createdAt ?? createdAt);
    if (!label) return null;
    return <View style={{ alignItems: 'center', marginTop: 8, marginBottom: 8 }}><Text style={{ fontSize: 12, lineHeight: 16, fontWeight: '700', color: isDark ? '#94a3b8' : '#64748b' }}>{label}</Text></View>;
  }, [isDark]);

  const renderAvatar = useCallback((props: any) => {
    const alignEnd = props.position === 'right';
    if (alignEnd) return null;
    const msg = props.currentMessage;
    if (!msg || msg.system || msg.kind === 'system') return null;
    const name = String(msg.user?.name || '').trim();
    const bg = getStableColorFromName(name);
    const r = LEFT_MESSAGE_AVATAR_SIZE / 2;
    return <View style={{ width: LEFT_MESSAGE_AVATAR_SIZE, height: LEFT_MESSAGE_AVATAR_SIZE, borderRadius: r, alignItems: 'center', justifyContent: 'center', backgroundColor: bg, marginBottom: 2 }}><Text style={{ color: '#ffffff', fontSize: 13, fontWeight: '700' }}>{getInitials(name)}</Text></View>;
  }, []);

  const giftedChatEl = (
    <GiftedChat
      messages={messages}
      text={inputText}
      onInputTextChanged={onInputTextChanged ?? (() => {})}
      onSend={onSend}
      user={giftedUser}
      extraData={giftedExtraData}
      shouldUpdateMessage={shouldUpdateMessage}
      renderFooter={renderTypingFooter}
      placeholder="Napíš správu..."
      renderDay={renderDay}
      alwaysShowSend
      scrollToBottom
      infiniteScroll
      isLoadingEarlier={false}
      renderLoadEarlier={() => null}
      renderInputToolbar={renderInputToolbar}
      renderComposer={renderComposer}
      renderSend={(props: any) => <RenderSend {...props} user={giftedUser} sending={sending} theme={theme} />}
      renderBubble={(props: any) => <RenderBubble {...props} theme={theme} onDeleteMessage={onDeleteMessage} onOpenReactionMenu={onOpenReactionMenu} currentUserId={giftedUser?._id} readReceiptText={getReadReceiptText ? getReadReceiptText(props.currentMessage) : null} />}
      renderAvatar={renderAvatar}
      showAvatarForEveryMessage={false}
      renderSystemMessage={renderSystemMessage}
      isKeyboardInternallyHandled={Platform.OS !== 'ios'}
      bottomOffset={0}
      listViewProps={{
        keyboardShouldPersistTaps: 'handled',
        contentContainerStyle: { paddingBottom: 8 },
        keyboardDismissMode: Platform.OS === 'ios' ? 'on-drag' : 'interactive',
        ...(Platform.OS === 'ios' ? { keyboardBlurBackground: 'transparent', removeClippedSubviews: false } : {}),
        extraData: `${giftedExtraData?.s ?? ''}|${giftedExtraData?.t ?? ''}|${giftedExtraData?.r ?? ''}`
      }}
      minComposerHeight={44}
      maxComposerHeight={120}
      theme={{
        backgroundColor: theme.backgroundColor,
        primary: theme.primary,
        bubbleLeft: theme.bubbleLeft,
        bubbleRight: theme.bubbleRight,
        bubbleBorderRadius: theme.bubbleBorderRadius,
        leftBubbleContainerStyle: theme.leftBubbleContainerStyle,
        rightBubbleContainerStyle: theme.rightBubbleContainerStyle,
        inputBackground: theme.inputBackground,
        inputText: theme.inputText,
        placeholderTextColor: theme.placeholderTextColor,
        sendContainerAlign: 'flex-end',
        composerHeight: 44
      }}
    />
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={keyboardVerticalOffset}>
          {giftedChatEl}
        </KeyboardAvoidingView>
      ) : giftedChatEl}
      <ReactionPickerModal
        visible={!!reactionMenuMessage}
        message={reactionMenuMessage}
        currentUserId={giftedUser?._id}
        isDark={isDark}
        onClose={() => setReactionMenuMessage(null)}
        onSetReaction={setReaction}
        onDeleteMessage={reactionMenuMessage && String(reactionMenuMessage.user?._id) === String(giftedUser?._id) && onDeleteMessage ? () => onDeleteMessage(reactionMenuMessage._id) : undefined}
      />
    </View>
  );
}
