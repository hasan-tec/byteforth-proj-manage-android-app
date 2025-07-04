import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { responsiveFontSize, isTablet } from '@/lib/responsive';
import { colors } from '@/lib/colors';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

export function Button({ 
  title, 
  onPress, 
  variant = 'primary', 
  size = 'medium',
  loading = false,
  disabled = false,
  style 
}: ButtonProps) {
  const buttonStyle = [
    styles.button,
    styles[variant],
    styles[size],
    (disabled || loading) && styles.disabled,
    style
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    styles[`${size}Text`]
  ];

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#FFFFFF' : '#3B82F6'} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: colors.utils.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  primary: {
    backgroundColor: colors.button.primary,
    borderWidth: 1,
    borderColor: colors.button.primaryBorder,
  },
  secondary: {
    backgroundColor: colors.button.secondary,
    borderWidth: 1,
    borderColor: colors.button.secondaryBorder,
  },
  danger: {
    backgroundColor: colors.button.danger,
    borderWidth: 1,
    borderColor: colors.button.dangerBorder,
  },
  small: {
    paddingHorizontal: isTablet() ? 20 : 16,
    paddingVertical: isTablet() ? 10 : 8,
  },
  medium: {
    paddingHorizontal: isTablet() ? 28 : 24,
    paddingVertical: isTablet() ? 14 : 12,
  },
  large: {
    paddingHorizontal: isTablet() ? 36 : 32,
    paddingVertical: isTablet() ? 18 : 16,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  primaryText: {
    color: colors.text.primary,
  },
  secondaryText: {
    color: colors.text.secondary,
  },
  dangerText: {
    color: colors.text.primary,
  },
  smallText: {
    fontSize: responsiveFontSize(14),
  },
  mediumText: {
    fontSize: responsiveFontSize(16),
  },
  largeText: {
    fontSize: responsiveFontSize(18),
  },
});