import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/database';
import { responsiveFontSize, responsivePadding, isTablet } from '@/lib/responsive';

interface AddTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskAdded: () => void;
  selectedProjectId?: string | null;
}

export default function AddTaskModal({ 
  visible, 
  onClose, 
  onTaskAdded,
  selectedProjectId = null
}: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    partName: '',
    price: '',
    personName: '',
    description: '',
    project_id: selectedProjectId || '',
    status: 'pending',
    payment_status: 'unpaid'
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectSelectVisible, setProjectSelectVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProjects();
      // Reset form when modal opens
      setFormData({
        partName: '',
        price: '',
        personName: '',
        description: '',
        project_id: selectedProjectId || '',
        status: 'pending',
        payment_status: 'unpaid'
      });
    }
  }, [visible, selectedProjectId]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name');
        
      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
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

    if (!formData.project_id) {
      Alert.alert('Error', 'Please select a project');
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
          project_id: formData.project_id,
          part_name: formData.partName.trim(),
          price: parseFloat(formData.price),
          person_name: formData.personName.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          payment_status: formData.payment_status
        })
        .select('*');

      if (error) throw error;

      // Get project name for activity log
      const project = projects.find(p => p.id === formData.project_id);

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'created',
          resource_type: 'outsourcing',
          resource_id: data ? data[0].id : null,
          description: `Added outsourcing task "${formData.partName}" assigned to ${formData.personName} in project "${project?.name || 'Unknown'}"`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      Alert.alert('Success', 'Task added successfully');
      onTaskAdded();
      onClose();
    } catch (error) {
      console.error('Error adding task:', error);
      Alert.alert('Error', 'Failed to add task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProject = projects.find(project => project.id === formData.project_id);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.formLabel}>Task Name *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter task name"
              placeholderTextColor="#6B7280"
              value={formData.partName}
              onChangeText={(value) => handleChange('partName', value)}
            />

            <Text style={styles.formLabel}>Project *</Text>
            <TouchableOpacity 
              style={styles.projectSelector}
              onPress={() => setProjectSelectVisible(true)}
            >
              <Text style={selectedProject ? styles.projectSelected : styles.projectPlaceholder}>
                {selectedProject ? selectedProject.name : 'Select a project'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.formLabel}>Price *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Enter price"
              placeholderTextColor="#6B7280"
              keyboardType="numeric"
              value={formData.price}
              onChangeText={(value) => handleChange('price', value)}
            />

            <Text style={styles.formLabel}>Assigned To *</Text>
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
              title="Create Task"
              onPress={handleSubmit}
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              style={styles.submitButton}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      {/* Project Selection Modal */}
      <Modal
        visible={projectSelectVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProjectSelectVisible(false)}
      >
        <View style={styles.selectModalContainer}>
          <View style={styles.selectModalContent}>
            <View style={styles.selectModalHeader}>
              <Text style={styles.selectModalTitle}>Select Project</Text>
              <TouchableOpacity onPress={() => setProjectSelectVisible(false)} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.selectModalBody}>
              {projects.map((project) => (
                <TouchableOpacity 
                  key={project.id}
                  style={styles.projectOption}
                  onPress={() => {
                    handleChange('project_id', project.id);
                    setProjectSelectVisible(false);
                  }}
                >
                  <Text style={styles.projectOptionText}>{project.name}</Text>
                  {project.id === formData.project_id && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
    maxHeight: isTablet() ? 800 : 650,
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
  modalBody: {
    padding: responsivePadding.horizontal,
  },
  formLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
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
    minHeight: 100,
  },
  submitButton: {
    marginTop: 24,
    marginBottom: 40,
  },
  projectSelector: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  projectSelected: {
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
  },
  projectPlaceholder: {
    fontSize: responsiveFontSize(16),
    color: '#6B7280',
  },
  selectModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  selectModalContent: {
    backgroundColor: '#1F2937',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  selectModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: responsivePadding.horizontal,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  selectModalTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  selectModalBody: {
    padding: responsivePadding.horizontal,
  },
  projectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  projectOptionText: {
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
  },
  selectedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },
});
