import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { responsiveFontSize, responsivePadding, isTablet } from '@/lib/responsive';

interface AddProjectModalProps {
  visible: boolean;
  onClose: () => void;
  onProjectAdded: () => void;
}

export default function AddProjectModal({ visible, onClose, onProjectAdded }: AddProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    total_budget: '',
    status: 'active'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    // Validate form data
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Project name is required');
      return;
    }

    const budget = parseFloat(formData.total_budget);
    if (isNaN(budget) || budget <= 0) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Insert project
      const { data, error } = await supabase
        .from('projects')
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          total_budget: budget,
          status: formData.status,
          created_by: user.id
        })
        .select('*');
      
      if (error) throw error;
      
      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'created',
          resource_type: 'project',
          resource_id: data ? data[0].id : null,
          description: `Created new project "${formData.name}"`,
          user_id: user.id
        });
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        total_budget: '',
        status: 'active'
      });
      
      // Close modal and refresh projects
      onProjectAdded();
      onClose();
      
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create project');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { label: 'Active', value: 'active' },
    { label: 'On Hold', value: 'on_hold' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.centeredView}
      >
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Project</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Project Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter project name"
              placeholderTextColor="#6B7280"
              value={formData.name}
              onChangeText={(value) => handleChange('name', value)}
            />
            
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter project description"
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={formData.description}
              onChangeText={(value) => handleChange('description', value)}
            />
            
            <Text style={styles.label}>Total Budget *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter budget amount"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={formData.total_budget}
              onChangeText={(value) => handleChange('total_budget', value)}
            />
            
            <Text style={styles.label}>Status</Text>
            <View style={styles.statusContainer}>
              {statusOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.statusOption,
                    formData.status === option.value && styles.statusOptionActive
                  ]}
                  onPress={() => handleChange('status', option.value)}
                >
                  <Text style={[
                    styles.statusText,
                    formData.status === option.value && styles.statusTextActive
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Button
              title="Create Project"
              onPress={handleSubmit}
              variant="primary"
              size="large"
              loading={isSubmitting}
              disabled={isSubmitting}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  modalView: {
    width: isTablet() ? '70%' : '90%',
    maxHeight: '80%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsivePadding.horizontal,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  closeButton: {
    padding: 4,
  },
  formContainer: {
    padding: responsivePadding.horizontal,
  },
  label: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 120,
  },
  statusContainer: {
    flexDirection: 'row',
    marginVertical: 16,
  },
  statusOption: {
    paddingHorizontal: isTablet() ? 24 : 20,
    paddingVertical: isTablet() ? 14 : 10,
    borderRadius: 8,
    backgroundColor: '#374151',
    marginRight: 12,
  },
  statusOptionActive: {
    backgroundColor: '#3B82F6',
  },
  statusText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  statusTextActive: {
    color: '#FFFFFF',
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 16,
  }
});
