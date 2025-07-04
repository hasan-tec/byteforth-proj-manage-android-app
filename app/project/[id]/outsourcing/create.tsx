import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/database';
import { responsivePadding, responsiveFontSize } from '@/lib/responsive';

export default function AddOutsourcingScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState({
    partName: '',
    price: '',
    personName: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error loading project:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.partName.trim()) {
      Alert.alert('Error', 'Task name is required');
      return false;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return false;
    }

    if (!formData.personName.trim()) {
      Alert.alert('Error', 'Person name is required');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setIsSubmitting(true);

      const { data, error } = await supabase
        .from('outsourcing')
        .insert({
          project_id: id as string,
          part_name: formData.partName.trim(),
          price: parseFloat(formData.price),
          person_name: formData.personName.trim(),
          description: formData.description.trim() || null,
          status: 'pending',
          payment_status: 'unpaid'
        })
        .select('*');

      if (error) throw error;

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'created',
          resource_type: 'outsourcing',
          resource_id: data ? data[0].id : null,
          description: `Added outsourcing task "${formData.partName}" assigned to ${formData.personName} in project "${project?.name}"`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      // Navigate back to project details
      Alert.alert(
        'Success',
        'Outsourcing task added successfully',
        [
          { text: 'OK', onPress: () => router.back() }
        ]
      );
    } catch (error) {
      console.error('Error adding outsourcing:', error);
      Alert.alert('Error', 'Failed to add outsourcing task');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Add Outsourcing</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {project && (
          <Card style={styles.projectCard}>
            <Text style={styles.projectName}>{project.name}</Text>
          </Card>
        )}

        <Card style={styles.formCard}>
          <Text style={styles.formLabel}>Task Name</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Enter task name"
            placeholderTextColor="#6B7280"
            value={formData.partName}
            onChangeText={(value) => handleChange('partName', value)}
          />

          <Text style={styles.formLabel}>Price</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Enter price"
            placeholderTextColor="#6B7280"
            keyboardType="numeric"
            value={formData.price}
            onChangeText={(value) => handleChange('price', value)}
          />

          <Text style={styles.formLabel}>Assigned To</Text>
          <TextInput
            style={styles.formInput}
            placeholder="Enter person name"
            placeholderTextColor="#6B7280"
            value={formData.personName}
            onChangeText={(value) => handleChange('personName', value)}
          />

          <Text style={styles.formLabel}>Description (optional)</Text>
          <TextInput
            style={[styles.formInput, styles.textArea]}
            placeholder="Enter description"
            placeholderTextColor="#6B7280"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={formData.description}
            onChangeText={(value) => handleChange('description', value)}
          />

          <Button
            title="Add Outsourcing Task"
            onPress={handleSubmit}
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            style={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsivePadding.horizontal,
    paddingVertical: responsivePadding.vertical * 0.75,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  title: {
    fontSize: responsiveFontSize(20),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    flex: 1,
    textAlign: 'center',
  },
  backButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding.horizontal,
    paddingVertical: responsivePadding.vertical * 0.5,
  },
  projectCard: {
    marginBottom: responsivePadding.vertical * 0.75,
    padding: 16,
  },
  projectName: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  formCard: {
    padding: 16,
  },
  formLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 100,
  },
  submitButton: {
    marginTop: 8,
  }
});
