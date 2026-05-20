import React, { ReactNode } from 'react';
import { Platform, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewProps,
  KeyboardGestureArea,
  KeyboardStickyView
} from 'react-native-keyboard-controller';

type KeyboardScreenLayoutProps = {
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  footerClosedOffset?: number;
  scrollRef?: React.RefObject<ScrollView | null>;
  keyboardAwareScrollViewProps?: Partial<
    Omit<KeyboardAwareScrollViewProps, 'children' | 'contentContainerStyle'>
  >;
};

export default function KeyboardScreenLayout({
  header,
  children,
  footer,
  contentContainerStyle,
  footerClosedOffset = 0,
  scrollRef,
  keyboardAwareScrollViewProps
}: KeyboardScreenLayoutProps) {
  return (
    <View style={styles.container}>
      {header}

      <KeyboardGestureArea
        {...(Platform.OS === 'android' ? { enableSwipeToDismiss: true, interpolator: 'ios' as const } : {})}
        style={styles.contentWrapper}
      >
        <KeyboardAwareScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={contentContainerStyle}
          keyboardShouldPersistTaps="handled"
          {...(Platform.OS === 'ios' ? { keyboardDismissMode: 'interactive' as const } : {})}
          {...keyboardAwareScrollViewProps}
        >
          {children}
        </KeyboardAwareScrollView>
      </KeyboardGestureArea>

      {footer ? (
        <KeyboardStickyView offset={{ closed: footerClosedOffset, opened: 0 }}>
          {footer}
        </KeyboardStickyView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  contentWrapper: {
    flex: 1
  },
  scrollView: {
    flex: 1
  }
});
