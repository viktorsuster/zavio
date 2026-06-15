import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TextInput,
  TextInputContentSizeChangeEventData,
  View
} from 'react-native';
import type { ComposerProps } from 'react-native-gifted-chat';
import { hasNativePillGlass, NativeComposerPillBackground } from '../../../components/NativeComposerControls';

export const CHAT_COMPOSER_MIN_HEIGHT = 44;
export const CHAT_COMPOSER_MAX_HEIGHT = 120;
const COMPOSER_PILL_RADIUS = CHAT_COMPOSER_MIN_HEIGHT / 2;
const COMPOSER_MULTILINE_RADIUS = 18;

function clampComposerHeight(value: number) {
  return Math.max(CHAT_COMPOSER_MIN_HEIGHT, Math.min(CHAT_COMPOSER_MAX_HEIGHT, Math.ceil(value)));
}

function getComposerCornerRadius(height: number) {
  return height <= CHAT_COMPOSER_MIN_HEIGHT + 2 ? COMPOSER_PILL_RADIUS : COMPOSER_MULTILINE_RADIUS;
}

/**
 * Drop-in replacement for GiftedChat Composer.
 * Stock Composer sets `height: composerHeight` which blocks multiline autogrow on RN 0.76+.
 * This uses minHeight/maxHeight only — same pattern as scan-sbs ChatInput.tsx.
 */
export function ChatMultilineComposer({
  text = '',
  onTextChanged,
  onInputSizeChanged,
  placeholder = 'Napíš správu...',
  placeholderTextColor,
  textInputProps,
  textInputStyle,
  multiline = true,
  disableComposer = false,
  keyboardAppearance = 'default',
  textInputAutoFocus = false
}: ComposerProps) {
  const lastReportedHeight = useRef(CHAT_COMPOSER_MIN_HEIGHT);
  const [visualHeight, setVisualHeight] = useState(CHAT_COMPOSER_MIN_HEIGHT);

  const cornerRadius = useMemo(() => getComposerCornerRadius(visualHeight), [visualHeight]);

  const reportHeight = useCallback(
    (rawHeight: number) => {
      const next = clampComposerHeight(rawHeight);
      setVisualHeight(next);
      if (next === lastReportedHeight.current) return;
      lastReportedHeight.current = next;
      onInputSizeChanged?.({ width: 0, height: next });
    },
    [onInputSizeChanged]
  );

  const handleContentSizeChange = useCallback(
    (event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      reportHeight(event.nativeEvent.contentSize.height);
    },
    [reportHeight]
  );

  useEffect(() => {
    if (!text.length) {
      lastReportedHeight.current = CHAT_COMPOSER_MIN_HEIGHT;
      setVisualHeight(CHAT_COMPOSER_MIN_HEIGHT);
      onInputSizeChanged?.({ width: 0, height: CHAT_COMPOSER_MIN_HEIGHT });
    }
  }, [text, onInputSizeChanged]);

  const shellStyle = useMemo(
    () => [styles.shell, { borderRadius: cornerRadius, overflow: 'hidden' as const }],
    [cornerRadius]
  );

  const input = (
    <TextInput
      testID={placeholder}
      accessible
      accessibilityLabel={placeholder}
      value={text}
      onChangeText={onTextChanged}
      onContentSizeChange={handleContentSizeChange}
      placeholder={placeholder}
      placeholderTextColor={placeholderTextColor ?? textInputProps?.placeholderTextColor}
      multiline={multiline}
      editable={!disableComposer}
      textAlignVertical="top"
      scrollEnabled
      autoFocus={textInputAutoFocus}
      keyboardAppearance={keyboardAppearance}
      enablesReturnKeyAutomatically
      underlineColorAndroid="transparent"
      {...textInputProps}
      style={[
        styles.input,
        { borderRadius: cornerRadius },
        textInputStyle,
        textInputProps?.style,
        hasNativePillGlass && styles.inputGlass,
        Platform.OS === 'web' ? ({ outlineWidth: 0, outlineColor: 'transparent' } as object) : null
      ]}
    />
  );

  if (hasNativePillGlass) {
    return (
      <View style={[styles.glassWrap, shellStyle]}>
        <NativeComposerPillBackground height={visualHeight} />
        {input}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={shellStyle}>{input}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minWidth: 0
  },
  glassWrap: {
    flex: 1,
    minWidth: 0,
    position: 'relative'
  },
  shell: {
    width: '100%'
  },
  input: {
    width: '100%',
    minHeight: CHAT_COMPOSER_MIN_HEIGHT,
    maxHeight: CHAT_COMPOSER_MAX_HEIGHT,
    marginLeft: 0,
    marginTop: 0,
    marginBottom: 0,
    paddingHorizontal: 16,
    fontSize: 16,
    lineHeight: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#334155'
  },
  inputGlass: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    flexGrow: 0,
    alignSelf: 'stretch'
  }
});
