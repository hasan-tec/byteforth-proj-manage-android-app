import { Platform } from 'react-native';
import { supabase, dbHelpers } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific imports
let LocalAuthentication: any = null;
if (Platform.OS !== 'web') {
  try {
    LocalAuthentication = require('expo-local-authentication');
  } catch (error) {
    console.warn('Local authentication not available');
  }
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Note: We don't log sign-in activities to keep the activity feed clean
  // and focused on actual work activities
  
  return data;
};

export const signUp = async (email: string, password: string, fullName: string, role: 'founder' | 'co_founder' = 'co_founder') => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });
  
  if (error) throw error;
  
  // Create profile
  if (data.user) {
    try {
      await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        role: role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Log activity - only for account creation, not sign-in
      await dbHelpers.createActivityLog({
        user_id: data.user.id,
        action: 'account_created',
        resource_type: 'user',
        resource_id: data.user.id,
        description: `New ${role} account created`,
      });
    } catch (profileError) {
      console.warn('Failed to create profile or log activity:', profileError);
    }
  }
  
  return data;
};

export const signOut = async () => {
  // Clear biometric settings
  if (Platform.OS !== 'web') {
    try {
      await AsyncStorage.removeItem('biometric_enabled');
    } catch (error) {
      console.warn('Failed to clear biometric settings:', error);
    }
  }
  
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: Platform.OS === 'web' ? `${window.location.origin}/auth/reset-password` : undefined,
  });
  if (error) throw error;
};

export const updatePassword = async (newPassword: string) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (error) throw error;
};

// Biometric authentication (mobile only)
export const isBiometricAvailable = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return false;
  }
  
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (error) {
    console.warn('Error checking biometric availability:', error);
    return false;
  }
};

export const authenticateWithBiometrics = async (): Promise<boolean> => {
  if (Platform.OS === 'web' || !LocalAuthentication) {
    return false;
  }
  
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to ByteForth',
      fallbackLabel: 'Use passcode',
      disableDeviceFallback: false,
    });
    
    if (result.success) {
      // Check if we have a stored session
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    }
    
    return false;
  } catch (error) {
    console.warn('Biometric authentication error:', error);
    return false;
  }
};

export const setBiometricEnabled = async (enabled: boolean) => {
  if (Platform.OS === 'web') return;
  
  try {
    await AsyncStorage.setItem('biometric_enabled', enabled.toString());
  } catch (error) {
    console.warn('Failed to set biometric preference:', error);
  }
};

export const isBiometricEnabled = async (): Promise<boolean> => {
  if (Platform.OS === 'web') return false;
  
  try {
    const enabled = await AsyncStorage.getItem('biometric_enabled');
    return enabled === 'true';
  } catch (error) {
    console.warn('Failed to get biometric preference:', error);
    return false;
  }
};

// Get current user profile
export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  try {
    return await dbHelpers.getProfile(user.id);
  } catch (error) {
    console.warn('Failed to get user profile:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (updates: {
  full_name?: string;
  avatar_url?: string;
  push_token?: string;
}) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('No authenticated user');
  
  const updatedProfile = await dbHelpers.updateProfile(user.id, updates);
  
  // Log activity
  try {
    await dbHelpers.createActivityLog({
      user_id: user.id,
      action: 'update_profile',
      resource_type: 'user',
      resource_id: user.id,
      description: 'Profile updated',
    });
  } catch (logError) {
    console.warn('Failed to log profile update:', logError);
  }
  
  return updatedProfile;
};