import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { responsivePadding, responsiveFontSize, isTablet } from '@/lib/responsive';
import { colors } from '@/lib/colors';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return (
    <View style={[styles.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.secondary,
    borderRadius: 10,
    padding: responsivePadding.horizontal * 0.75,
    marginBottom: responsivePadding.vertical * 0.5,
    borderWidth: 1,
    borderColor: colors.border.secondary,
    shadowColor: colors.utils.shadow,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
});