import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { Project, Outsourcing } from '@/types/database';
import { responsiveFontSize } from '@/lib/responsive';

interface AddPaymentModalProps {
  visible: boolean;
  onClose: () => void;
  onPaymentAdded: () => void;
}

const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ visible, onClose, onPaymentAdded }) => {
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [status, setStatus] = useState('needs_to_be_paid');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');
  
  // Project selection
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  // Outsourcing task selection (optional)
  const [outsourcingTasks, setOutsourcingTasks] = useState<Outsourcing[]>([]);
  const [selectedOutsourcingId, setSelectedOutsourcingId] = useState<string | null>(null);
  const [showOutsourcingDropdown, setShowOutsourcingDropdown] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset form when modal opens
      resetForm();
      loadProjects();
      loadOutsourcing();
    }
  }, [visible]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadOutsourcing = async () => {
    try {
      // Get outsourcing tasks that don't have payments assigned yet
      // First get all outsourcing tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('outsourcing')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Then get all payments with outsourcing_id
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('outsourcing_id')
        .not('outsourcing_id', 'is', null);

      if (paymentsError) throw paymentsError;

      // Filter out tasks that already have payments
      const assignedOutsourcingIds = paymentsData.map(p => p.outsourcing_id);
      const availableTasks = allTasks.filter(task => !assignedOutsourcingIds.includes(task.id));
      
      setOutsourcingTasks(availableTasks || []);
    } catch (error) {
      console.error('Error loading outsourcing tasks:', error);
    }
  };

  const handleDateSelect = (date: Date) => {
    setDueDate(date);
    setShowDatePicker(false);
  };

  const formatDate = (date: Date) => {
    // Format as MM/DD/YYYY to match the screenshot
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${month}/${day}/${year}`;
  };

  const handleOutsourcingSelect = (task: Outsourcing) => {
    setSelectedOutsourcingId(task.id);
    setSelectedProjectId(task.project_id);
    setRecipientName(task.person_name || '');
    setRecipientEmail(''); // No email in the outsourcing type
    setAmount(task.price.toString());
    setDescription(`Payment for: ${task.part_name}`);
    setShowOutsourcingDropdown(false);
    
    // If there's a project object from the join query
    if (task.project && typeof task.project === 'object') {
      // Just to show that it's linked to the project in the UI
      const projectName = task.project.name;
      setDescription(`Payment for: ${task.part_name} (${projectName})`);
    }
  };

  const resetForm = () => {
    setRecipientName('');
    setRecipientEmail('');
    setAmount('');
    setDescription('');
    // Set due date to current date + 1 month as default
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setDueDate(nextMonth);
    setStatus('needs_to_be_paid');
    setPaymentMethod('');
    setNotes('');
    setSelectedProjectId(null);
    setSelectedOutsourcingId(null);
    setShowProjectDropdown(false);
    setShowOutsourcingDropdown(false);
  };

  const handleSubmit = async () => {
    if (!recipientName || !amount || !dueDate) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    try {
      const { data, error } = await supabase.from('payments').insert({
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        amount: parseFloat(amount),
        description,
        due_date: dueDate.toISOString(),
        status,
        payment_method: paymentMethod,
        notes,
        project_id: selectedProjectId,
        outsourcing_id: selectedOutsourcingId
      }).select();

      if (error) throw error;
      
      Alert.alert('Success', 'Payment created successfully');
      resetForm();
      onPaymentAdded();
      onClose();
    } catch (error) {
      console.error('Error creating payment:', error);
      Alert.alert('Error', 'Failed to create payment');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Payment</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            {/* Quick Fill from Outsourcing */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Quick Fill from Outsourcing (Optional)</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowOutsourcingDropdown(!showOutsourcingDropdown)}
              >
                <Text style={styles.dropdownText}>
                  {selectedOutsourcingId 
                    ? outsourcingTasks.find(t => t.id === selectedOutsourcingId)?.part_name 
                    : 'Select an outsourcing task...'
                  }
                </Text>
              </TouchableOpacity>
              
              {showOutsourcingDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                    {outsourcingTasks.length > 0 ? (
                      outsourcingTasks.map(task => (
                        <TouchableOpacity 
                          key={task.id}
                          style={styles.dropdownItem}
                          onPress={() => handleOutsourcingSelect(task)}
                        >
                          <Text style={styles.dropdownItemText}>{task.part_name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <Text style={[styles.dropdownItemText, {color: '#6B7280'}]}>
                          No available outsourcing tasks
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Project Selection */}
            <View style={styles.formSection}>
              <Text style={styles.sectionLabel}>Project (Optional)</Text>
              <TouchableOpacity 
                style={styles.dropdown}
                onPress={() => setShowProjectDropdown(!showProjectDropdown)}
              >
                <Text style={styles.dropdownText}>
                  {selectedProjectId 
                    ? projects.find(p => p.id === selectedProjectId)?.name 
                    : 'Select a project'
                  }
                </Text>
              </TouchableOpacity>
              
              {showProjectDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView nestedScrollEnabled={true} style={{ maxHeight: 200 }}>
                    {projects.length > 0 ? (
                      projects.map(project => (
                        <TouchableOpacity 
                          key={project.id}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setSelectedProjectId(project.id);
                            setShowProjectDropdown(false);
                          }}
                        >
                          <Text style={styles.dropdownItemText}>{project.name}</Text>
                        </TouchableOpacity>
                      ))
                    ) : (
                      <View style={styles.dropdownItem}>
                        <Text style={[styles.dropdownItemText, {color: '#6B7280'}]}>
                          No projects available
                        </Text>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* Recipient Information */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Recipient Name *</Text>
                <Input
                  value={recipientName}
                  onChangeText={setRecipientName}
                  placeholder="Enter recipient name"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Recipient Email</Text>
                <Input
                  value={recipientEmail}
                  onChangeText={setRecipientEmail}
                  placeholder="Enter recipient email"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Payment Details */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Amount *</Text>
                <Input
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Description *</Text>
                <TextInput
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Payment description"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textArea}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </View>

            {/* Due Date */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Due Date *</Text>
                <TouchableOpacity 
                  style={styles.datePickerButton}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      // For web - simpler implementation to avoid TypeScript errors
                      // In a real app you would use a proper date picker component
                      const dateStr = prompt('Enter date (YYYY-MM-DD):', 
                        `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`);
                      
                      if (dateStr) {
                        const selectedDate = new Date(dateStr);
                        if (!isNaN(selectedDate.getTime())) {
                          handleDateSelect(selectedDate);
                        }
                      }
                    } else {
                      // For mobile
                      const today = new Date();
                      setShowDatePicker(true);
                      
                      // Since we don't have DateTimePicker, using Alert as a fallback
                      Alert.alert(
                        "Date Selection",
                        "Please select a date",
                        [
                          {
                            text: "Today",
                            onPress: () => handleDateSelect(today)
                          },
                          {
                            text: "Tomorrow",
                            onPress: () => {
                              const tomorrow = new Date();
                              tomorrow.setDate(today.getDate() + 1);
                              handleDateSelect(tomorrow);
                            }
                          },
                          {
                            text: "Next Week",
                            onPress: () => {
                              const nextWeek = new Date();
                              nextWeek.setDate(today.getDate() + 7);
                              handleDateSelect(nextWeek);
                            }
                          },
                          {
                            text: "Next Month",
                            onPress: () => {
                              const nextMonth = new Date();
                              nextMonth.setMonth(today.getMonth() + 1);
                              handleDateSelect(nextMonth);
                            }
                          }
                        ]
                      );
                    }
                  }}
                >
                  <Text style={styles.dateText}>{formatDate(dueDate)}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Status */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Status</Text>
                <TouchableOpacity 
                  style={styles.dropdown}
                  onPress={() => {
                    Alert.alert(
                      "Select Status",
                      "Choose a payment status",
                      [
                        {
                          text: "Needs to be Paid",
                          onPress: () => setStatus('needs_to_be_paid')
                        },
                        {
                          text: "Paid",
                          onPress: () => setStatus('paid')
                        },
                        {
                          text: "Overdue",
                          onPress: () => setStatus('overdue')
                        },
                        {
                          text: "Cancelled",
                          onPress: () => setStatus('cancelled')
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.dropdownText}>
                    {status === 'needs_to_be_paid' ? 'Needs to be Paid' :
                     status === 'paid' ? 'Paid' :
                     status === 'overdue' ? 'Overdue' :
                     status === 'cancelled' ? 'Cancelled' : 'Unknown'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Payment Method */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Payment Method</Text>
                <Input
                  value={paymentMethod}
                  onChangeText={setPaymentMethod}
                  placeholder="e.g. Bank Transfer, PayPal, Cash"
                />
              </View>
            </View>

            {/* Notes */}
            <View style={styles.formRow}>
              <View style={styles.formField}>
                <Text style={styles.fieldLabel}>Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Additional notes"
                  placeholderTextColor="#9CA3AF"
                  style={styles.textArea}
                  multiline={true}
                  numberOfLines={4}
                />
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <Button variant="secondary" onPress={onClose} title="Cancel" />
            <Button onPress={handleSubmit} title="Create Payment" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: '#111827',
    borderRadius: 16,
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalContent: {
    padding: 20,
    paddingBottom: 80,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    padding: 20,
    gap: 12,
    backgroundColor: '#0F172A',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 12,
  },
  formField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
    marginBottom: 8,
  },
  dropdown: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
  },
  dropdownList: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#374151',
    maxHeight: 200,
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
  },
  dropdownItemText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
  },
  textArea: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    padding: 16,
    height: 100,
    textAlignVertical: 'top',
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  datePickerButton: {
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  dateText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
  },
});

export default AddPaymentModal;
