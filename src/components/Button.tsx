import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors } from '../constants/colors';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  fullWidth?: boolean;
  isLoading?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  isLoading = false,
  onPress,
  style,
  disabled = false
}) => {
  const buttonStyle: ViewStyle[] = [
    styles.base,
    styles[variant],
    fullWidth && styles.fullWidth,
    (isLoading || disabled) && styles.disabled,
    style
  ];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`${variant}Text`]
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#000' : colors.primary} />
      ) : (
        <Text style={textStyle}>{children}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.6
  },
  primary: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  secondary: {
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary
  },
  danger: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  ghost: {
    backgroundColor: 'transparent'
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2
  },
  primaryText: {
    color: '#000'
  },
  secondaryText: {
    color: '#fff'
  },
  outlineText: {
    color: colors.primary
  },
  dangerText: {
    color: '#fff'
  },
  ghostText: {
    color: colors.textTertiary
  }
});

export default Button;

