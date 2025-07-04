import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.logo}>ByteForth</Text>
          <Text style={styles.tagline}>Manage your projects with ease</Text>
        </View>

        <View style={styles.illustration}>
          <Text style={styles.emoji}>🚀</Text>
        </View>

        <View style={styles.actions}>
          <Button
            title="Sign In"
            onPress={() => router.push('/auth/signin')}
            style={styles.button}
          />
          <Button
            title="Create Account"
            onPress={() => router.push('/auth/signup')}
            variant="secondary"
            style={styles.button}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 18,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  illustration: {
    alignItems: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 80,
  },
  actions: {
    gap: 16,
  },
  button: {
    width: '100%',
  },
});