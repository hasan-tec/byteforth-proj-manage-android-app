import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ChevronDown } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { signUp } from '@/lib/auth';

export default function SignUpScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'founder' | 'co_founder'>('founder');
  const [loading, setLoading] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await signUp(email, password, fullName, role);
      router.replace('/auth/profile-setup');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { label: 'Founder', value: 'founder' },
    { label: 'Co-Founder', value: 'co_founder' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#F9FAFB" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join ByteForth today</Text>

        <View style={styles.form}>
          <Input
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Enter your email"
          />

          <Input
            label="Password"
            value={password}
            onChangeText={setPassword}
            isPassword
            placeholder="Create a password (min 6 characters)"
          />

          <View style={styles.roleContainer}>
            <Text style={styles.roleLabel}>Role</Text>
            <TouchableOpacity 
              style={styles.rolePicker}
              onPress={() => setShowRolePicker(!showRolePicker)}
            >
              <Text style={styles.roleText}>
                {roleOptions.find(option => option.value === role)?.label}
              </Text>
              <ChevronDown size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            {showRolePicker && (
              <View style={styles.roleOptions}>
                {roleOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.roleOption}
                    onPress={() => {
                      setRole(option.value as 'founder' | 'co_founder');
                      setShowRolePicker(false);
                    }}
                  >
                    <Text style={[
                      styles.roleOptionText,
                      role === option.value && styles.roleOptionSelected
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <Button
            title="Create Account"
            onPress={handleSignUp}
            loading={loading}
            style={styles.signUpButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/signin')}>
            <Text style={styles.footerLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    padding: 24,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 32,
  },
  form: {
    marginBottom: 32,
  },
  roleContainer: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  rolePicker: {
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#4B5563',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  roleOptions: {
    backgroundColor: '#374151',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  roleOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4B5563',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#F9FAFB',
  },
  roleOptionSelected: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  signUpButton: {
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 24,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  footerLink: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
});