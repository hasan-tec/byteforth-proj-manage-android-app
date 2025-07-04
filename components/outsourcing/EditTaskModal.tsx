import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, Modal, TouchableOpacity, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabase';
import { Project, Outsourcing } from '@/types/database';
import { responsiveFontSize, responsivePadding, isTablet } from '@/lib/responsive';

interface EditTaskModalProps {
  visible: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  task: Outsourcing | null;
}

export default function EditTaskModal({ 
  visible, 
  onClose, 
  onTaskUpdated,
  task
}: EditTaskModalProps) {
  const [formData, setFormData] = useState({
    partName: '',
    price: '',
    personName: '',
    description: '',
    project_id: '',
    status: 'pending',
    payment_status: 'unpaid'
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [projectSelectVisible, setProjectSelectVisible] = useState(false);
  const [statusSelectVisible, setStatusSelectVisible] = useState(false);
  const [paymentSelectVisible, setPaymentSelectVisible] = useState(false);
  
  useEffect(() => {
    if (visible && task) {
      loadProjects();
      
      // Set form data from task
      setFormData({
        partName: task.part_name || '',
        price: task.price?.toString() || '',
        personName: task.person_name || '',
        description: task.description || '',
        project_id: task.project_id || '',
        status: task.status || 'pending',
        payment_status: task.payment_status || 'unpaid'
      });
    }
  }, [visible, task]);

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
    if (!validateForm() || !task) return;

    try {
      setIsSubmitting(true);

      const { error } = await supabase
        .from('outsourcing')
        .update({
          project_id: formData.project_id,
          part_name: formData.partName.trim(),
          price: parseFloat(formData.price),
          person_name: formData.personName.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
          payment_status: formData.payment_status,
          updated_at: new Date().toISOString()
        })
        .eq('id', task.id);

      if (error) throw error;

      // Get project name for activity log
      const project = projects.find(p => p.id === formData.project_id);

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'updated',
          resource_type: 'outsourcing',
          resource_id: task.id,
          description: `Updated outsourcing task "${formData.partName}" assigned to ${formData.personName} in project "${project?.name || 'Unknown'}"`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      Alert.alert('Success', 'Task updated successfully');
      onTaskUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Error', 'Failed to update task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!task) return;
    
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this task? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              
              const { error } = await supabase
                .from('outsourcing')
                .delete()
                .eq('id', task.id);
                
              if (error) throw error;
              
              // Create activity log
              await supabase
                .from('activity_logs')
                .insert({
                  action: 'deleted',
                  resource_type: 'outsourcing',
                  resource_id: task.id,
                  description: `Deleted outsourcing task "${task.part_name}"`,
                  user_id: (await supabase.auth.getUser()).data.user?.id
                });
                
              Alert.alert('Success', 'Task deleted successfully');
              onTaskUpdated();
              onClose();
            } catch (error) {
              console.error('Error deleting task:', error);
              Alert.alert('Error', 'Failed to delete task');
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const selectedProject = projects.find(project => project.id === formData.project_id);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const paymentOptions = [
    { value: 'unpaid', label: 'Unpaid' },
    { value: 'partially_paid', label: 'Partially Paid' },
    { value: 'paid', label: 'Paid' }
  ];

  const getStatusLabel = (value: string) => {
    return statusOptions.find(option => option.value === value)?.label || 'Select status';
  };

  const getPaymentLabel = (value: string) => {
    return paymentOptions.find(option => option.value === value)?.label || 'Select payment status';
  };

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
            <Text style={styles.modalTitle}>Edit Task</Text>
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

            <Text style={styles.formLabel}>Status</Text>
            <TouchableOpacity 
              style={styles.projectSelector}
              onPress={() => setStatusSelectVisible(true)}
            >
              <Text style={styles.projectSelected}>
                {getStatusLabel(formData.status)}
              </Text>
            </TouchableOpacity>

            <Text style={styles.formLabel}>Payment Status</Text>
            <TouchableOpacity 
              style={styles.projectSelector}
              onPress={() => setPaymentSelectVisible(true)}
            >
              <Text style={styles.projectSelected}>
                {getPaymentLabel(formData.payment_status)}
              </Text>
            </TouchableOpacity>

            <View style={styles.buttonRow}>
              <Button
                title="Update Task"
                onPress={handleSubmit}
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                style={styles.updateButton}
              />
              <Button
                title="Delete Task"
                onPress={handleDelete}
                variant="danger"
                disabled={isSubmitting}
                style={styles.deleteButton}
              />
            </View>
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

      {/* Status Selection Modal */}
      <Modal
        visible={statusSelectVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setStatusSelectVisible(false)}
      >
        <View style={styles.selectModalContainer}>
          <View style={styles.selectModalContent}>
            <View style={styles.selectModalHeader}>
              <Text style={styles.selectModalTitle}>Select Status</Text>
              <TouchableOpacity onPress={() => setStatusSelectVisible(false)} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.selectModalBody}>
              {statusOptions.map((option) => (
                <TouchableOpacity 
                  key={option.value}
                  style={styles.projectOption}
                  onPress={() => {
                    handleChange('status', option.value);
                    setStatusSelectVisible(false);
                  }}
                >
                  <Text style={styles.projectOptionText}>{option.label}</Text>
                  {option.value === formData.status && (
                    <View style={styles.selectedIndicator} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Payment Status Selection Modal */}
      <Modal
        visible={paymentSelectVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setPaymentSelectVisible(false)}
      >
        <View style={styles.selectModalContainer}>
          <View style={styles.selectModalContent}>
            <View style={styles.selectModalHeader}>
              <Text style={styles.selectModalTitle}>Select Payment Status</Text>
              <TouchableOpacity onPress={() => setPaymentSelectVisible(false)} style={styles.closeButton}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.selectModalBody}>
              {paymentOptions.map((option) => (
                <TouchableOpacity 
                  key={option.value}
                  style={styles.projectOption}
                  onPress={() => {
                    handleChange('payment_status', option.value);
                    setPaymentSelectVisible(false);
                  }}
                >
                  <Text style={styles.projectOptionText}>{option.label}</Text>
                  {option.value === formData.payment_status && (
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
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 40,
  },
  updateButton: {
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    flex: 1,
    marginLeft: 8,
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
