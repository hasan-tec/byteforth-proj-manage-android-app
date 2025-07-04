import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { TouchableOpacity } from 'react-native';
import { responsiveFontSize, isTablet } from '@/lib/responsive';
import { colors } from '@/lib/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
}

export function Input({ label, error, isPassword, style, ...props }: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputContainer}>
        <TextInput
          style={[styles.input, error && styles.inputError, style]}
          secureTextEntry={isPassword && !showPassword}
          placeholderTextColor="#9CA3AF"
          {...props}
        />
        {isPassword && (
          <TouchableOpacity 
            style={styles.eyeIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={20} color="#9CA3AF" />
            ) : (
              <Eye size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: responsiveFontSize(14),
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: isTablet() ? 16 : 12,
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Regular',
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.primary,
    shadowColor: colors.utils.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  inputError: {
    borderColor: colors.brand.danger,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    top: isTablet() ? 18 : 14,
  },
  error: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Regular',
    color: colors.brand.danger,
    marginTop: 4,
  },
});