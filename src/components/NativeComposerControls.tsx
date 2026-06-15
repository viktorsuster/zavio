import React from 'react';
import { Platform, StyleSheet } from 'react-native';

let ExpoUI: typeof import('@expo/ui/swift-ui') | null = null;
let ExpoUIModifiers: typeof import('@expo/ui/swift-ui/modifiers') | null = null;

if (Platform.OS === 'ios') {
  try {
    const { requireOptionalNativeModule } = require('expo-modules-core');
    if (requireOptionalNativeModule('ExpoUI') != null) {
      ExpoUI = require('@expo/ui/swift-ui');
      ExpoUIModifiers = require('@expo/ui/swift-ui/modifiers');
    }
  } catch {
    ExpoUI = null;
    ExpoUIModifiers = null;
  }
}

export const isNativeComposerAvailable = ExpoUI != null && ExpoUIModifiers != null;

const IS_IOS_26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

type NativeComposerButtonProps = {
  systemImage: string;
  accessibilityLabel: string;
  onPress: () => void;
  prominent?: boolean;
  tintColor?: string;
  disabled?: boolean;
  size: number;
};

export const NativeComposerButton: React.FC<NativeComposerButtonProps> = ({
  systemImage,
  accessibilityLabel,
  onPress,
  prominent = false,
  tintColor,
  disabled = false,
  size
}) => {
  if (!ExpoUI || !ExpoUIModifiers) {
    return null;
  }
  const { Host, Button } = ExpoUI;
  const { buttonStyle, buttonBorderShape, labelStyle, tint, disabled: disabledModifier, frame, controlSize } =
    ExpoUIModifiers;

  const style = prominent
    ? IS_IOS_26
      ? 'glassProminent'
      : 'borderedProminent'
    : IS_IOS_26
      ? 'glass'
      : 'bordered';

  const modifiers = [
    frame({ width: size, height: size }),
    buttonStyle(style),
    buttonBorderShape('circle'),
    labelStyle('iconOnly'),
    controlSize(prominent ? 'extraLarge' : 'large'),
    disabledModifier(disabled)
  ];
  if (tintColor) {
    modifiers.push(tint(tintColor));
  }

  return (
    <Host style={{ width: size, height: size }}>
      <Button label={accessibilityLabel} systemImage={systemImage as any} onPress={onPress} modifiers={modifiers} />
    </Host>
  );
};

type NativeComposerGlassBackgroundProps = {
  /** Visual height of the composer — drives pill vs rounded-rect shape. */
  height?: number;
  /** Single-line pill radius (default half of 44). */
  pillRadius?: number;
  /** Multiline corner radius (iMessage-style). */
  multilineRadius?: number;
};

export const NativeComposerPillBackground: React.FC<NativeComposerGlassBackgroundProps> = ({
  height = COMPOSER_ACTION_BUTTON_SIZE,
  pillRadius = COMPOSER_ACTION_BUTTON_SIZE / 2,
  multilineRadius = 18
}) => {
  if (!ExpoUI || !ExpoUIModifiers || !IS_IOS_26) {
    return null;
  }
  const { Host, Capsule, RoundedRectangle } = ExpoUI;
  const { glassEffect } = ExpoUIModifiers;

  const isPill = height <= COMPOSER_ACTION_BUTTON_SIZE + 2;
  const cornerRadius = isPill ? pillRadius : multilineRadius;

  return (
    <Host style={StyleSheet.absoluteFill} pointerEvents="none">
      {isPill ? (
        <Capsule modifiers={[glassEffect({ glass: { variant: 'regular' }, shape: 'capsule' })]} />
      ) : (
        <RoundedRectangle
          cornerRadius={cornerRadius}
          modifiers={[
            glassEffect({
              glass: { variant: 'regular' },
              shape: 'roundedRectangle',
              cornerRadius
            })
          ]}
        />
      )}
    </Host>
  );
};

export const hasNativePillGlass = isNativeComposerAvailable && IS_IOS_26;

/** Unified touch target for composer send / action buttons (matches minComposerHeight). */
export const COMPOSER_ACTION_BUTTON_SIZE = 44;
/** Send button — filled via SwiftUI frame; slightly larger than composer pill. */
export const COMPOSER_SEND_BUTTON_SIZE = 44;
