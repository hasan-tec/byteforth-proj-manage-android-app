import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { X, Trash2, ChevronUp, ChevronDown, Plus } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Project, Milestone } from '@/types/database';
import { responsivePadding, responsiveFontSize, isTablet } from '@/lib/responsive';

interface MilestoneManagerModalProps {
  visible: boolean;
  onClose: () => void;
  projectId: string;
  onMilestonesUpdated: () => void;
}

export default function MilestoneManagerModal({ 
  visible, 
  onClose, 
  projectId,
  onMilestonesUpdated
}: MilestoneManagerModalProps) {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestone, setNewMilestone] = useState({
    name: '',
    price: '',
    description: ''
  });
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalValue, setTotalValue] = useState(0);
  const [completedValue, setCompletedValue] = useState(0);

  useEffect(() => {
    if (visible) {
      loadProjectAndMilestones();
    }
  }, [visible, projectId]);

  useEffect(() => {
    // Calculate milestone values
    if (milestones.length > 0) {
      const total = milestones.reduce((sum, m) => sum + m.price, 0);
      const completed = milestones
        .filter(m => m.status === 'completed' || m.status === 'approved')
        .reduce((sum, m) => sum + m.price, 0);
      
      setTotalValue(total);
      setCompletedValue(completed);
    } else {
      setTotalValue(0);
      setCompletedValue(0);
    }
  }, [milestones]);

  const loadProjectAndMilestones = async () => {
    try {
      setLoading(true);
      
      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', projectId)
        .order('order_index', { ascending: true });

      if (milestonesError) throw milestonesError;
      setMilestones(milestonesData || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddMilestone = async () => {
    try {
      if (!newMilestone.name.trim()) {
        Alert.alert('Error', 'Please enter a milestone name');
        return;
      }

      const price = parseFloat(newMilestone.price);
      if (isNaN(price) || price <= 0) {
        Alert.alert('Error', 'Please enter a valid price');
        return;
      }

      setIsSubmitting(true);

      // Get the highest order_index
      const maxOrderIndex = milestones.length > 0
        ? Math.max(...milestones.map(m => m.order_index))
        : -1;

      // Insert the new milestone
      const { data, error } = await supabase
        .from('milestones')
        .insert({
          project_id: projectId,
          name: newMilestone.name.trim(),
          price,
          description: newMilestone.description.trim() || null,
          status: 'pending',
          order_index: maxOrderIndex + 1
        })
        .select('*');

      if (error) throw error;

      // Update local state
      if (data) {
        setMilestones([...milestones, data[0]]);
      }

      // Reset form
      setNewMilestone({
        name: '',
        price: '',
        description: ''
      });
      setIsAddingMilestone(false);

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'created',
          resource_type: 'milestone',
          resource_id: data ? data[0].id : null,
          description: `Added milestone "${newMilestone.name}" to project "${project?.name}"`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

    } catch (error) {
      console.error('Error adding milestone:', error);
      Alert.alert('Error', 'Failed to add milestone');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMilestone = (milestone: Milestone) => {
    Alert.alert(
      'Delete Milestone',
      `Are you sure you want to delete "${milestone.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the milestone
              const { error } = await supabase
                .from('milestones')
                .delete()
                .eq('id', milestone.id);

              if (error) throw error;

              // Update local state
              setMilestones(milestones.filter(m => m.id !== milestone.id));

              // Reorder milestones
              const updatedMilestones = milestones
                .filter(m => m.id !== milestone.id)
                .map((m, index) => ({ ...m, order_index: index }));

              // Update order_index in database
              for (const m of updatedMilestones) {
                await supabase
                  .from('milestones')
                  .update({ order_index: m.order_index })
                  .eq('id', m.id);
              }

              // Create activity log
              await supabase
                .from('activity_logs')
                .insert({
                  action: 'deleted',
                  resource_type: 'milestone',
                  resource_id: milestone.id,
                  description: `Deleted milestone "${milestone.name}" from project "${project?.name}"`,
                  user_id: (await supabase.auth.getUser()).data.user?.id
                });

            } catch (error) {
              console.error('Error deleting milestone:', error);
              Alert.alert('Error', 'Failed to delete milestone');
            }
          }
        }
      ]
    );
  };

  const handleMoveMilestone = async (milestone: Milestone, direction: 'up' | 'down') => {
    try {
      const currentIndex = milestones.findIndex(m => m.id === milestone.id);
      if (direction === 'up' && currentIndex <= 0) return;
      if (direction === 'down' && currentIndex >= milestones.length - 1) return;

      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      const newMilestones = [...milestones];
      
      // Swap milestones
      [newMilestones[currentIndex], newMilestones[newIndex]] = [newMilestones[newIndex], newMilestones[currentIndex]];
      
      // Update order_index
      newMilestones[currentIndex].order_index = currentIndex;
      newMilestones[newIndex].order_index = newIndex;
      
      // Update local state
      setMilestones(newMilestones);
      
      // Update in database
      await supabase
        .from('milestones')
        .update({ order_index: newIndex })
        .eq('id', milestone.id);
      
      await supabase
        .from('milestones')
        .update({ order_index: currentIndex })
        .eq('id', newMilestones[currentIndex].id);
      
    } catch (error) {
      console.error('Error moving milestone:', error);
      Alert.alert('Error', 'Failed to reorder milestones');
      // Reload milestones on error
      loadProjectAndMilestones();
    }
  };

  const handleUpdateMilestoneStatus = async (milestone: Milestone, status: string) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({ status })
        .eq('id', milestone.id);

      if (error) throw error;

      // Update local state
      setMilestones(milestones.map(m => 
        m.id === milestone.id ? { ...m, status: status as any } : m
      ));

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'updated',
          resource_type: 'milestone',
          resource_id: milestone.id,
          description: `Updated milestone "${milestone.name}" status to ${status}`,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

    } catch (error) {
      console.error('Error updating milestone status:', error);
      Alert.alert('Error', 'Failed to update milestone status');
    }
  };

  const handleClose = () => {
    onMilestonesUpdated();
    onClose();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (loading) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={handleClose}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Milestone Manager</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Project Name */}
            {project && (
              <Text style={styles.projectName}>{project.name}</Text>
            )}

            {/* Stats */}
            <View style={styles.statsContainer}>
              <Card style={styles.statsCard}>
                <Text style={styles.statsLabel}>Total Budget</Text>
                <Text style={styles.statsValue}>
                  {project ? formatCurrency(project.total_budget) : '$0'}
                </Text>
              </Card>

              <Card style={styles.statsCard}>
                <Text style={styles.statsLabel}>Milestone Value</Text>
                <Text style={styles.statsValue}>
                  {formatCurrency(totalValue)}
                </Text>
              </Card>

              <Card style={styles.statsCard}>
                <Text style={styles.statsLabel}>Completed Value</Text>
                <Text style={[styles.statsValue, styles.completedValue]}>
                  {formatCurrency(completedValue)}
                </Text>
              </Card>
            </View>

            <View style={styles.milestonesHeader}>
              <Text style={styles.milestonesTitle}>
                Milestones ({milestones.length})
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setIsAddingMilestone(!isAddingMilestone)}
              >
                <Plus size={20} color="#FFFFFF" />
                <Text style={styles.addButtonText}>
                  {isAddingMilestone ? 'Cancel' : 'Add Milestone'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Add Milestone Form */}
            {isAddingMilestone && (
              <Card style={styles.formCard}>
                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Name</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter milestone name"
                    placeholderTextColor="#6B7280"
                    value={newMilestone.name}
                    onChangeText={(text) => setNewMilestone({...newMilestone, name: text})}
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Price</Text>
                  <TextInput
                    style={styles.formInput}
                    placeholder="Enter price"
                    placeholderTextColor="#6B7280"
                    keyboardType="numeric"
                    value={newMilestone.price}
                    onChangeText={(text) => setNewMilestone({...newMilestone, price: text})}
                  />
                </View>

                <View style={styles.formRow}>
                  <Text style={styles.formLabel}>Description (optional)</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    placeholder="Enter description"
                    placeholderTextColor="#6B7280"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={newMilestone.description}
                    onChangeText={(text) => setNewMilestone({...newMilestone, description: text})}
                  />
                </View>

                <Button
                  title="Add Milestone"
                  onPress={handleAddMilestone}
                  variant="primary"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  style={styles.formButton}
                />
              </Card>
            )}

            {/* Milestones List */}
            {milestones.map((milestone, index) => (
              <Card key={milestone.id} style={styles.milestoneCard}>
                <View style={styles.cardDragHandle}>
                  <Text style={styles.dragIndicator}>⠿</Text>
                </View>
                
                <View style={styles.milestoneHeader}>
                  <View style={styles.milestoneTitleRow}>
                    <Text style={styles.milestoneName}>{milestone.name}</Text>
                    <Text style={styles.milestonePrice}>
                      {formatCurrency(milestone.price)}
                    </Text>
                  </View>

                  {milestone.description && (
                    <Text style={styles.milestoneDescription}>
                      {milestone.description}
                    </Text>
                  )}
                </View>

                <View style={styles.milestoneActions}>
                  <View style={styles.statusPicker}>
                    <StatusBadge status={milestone.status} variant="milestone" />
                    <TouchableOpacity
                      style={styles.statusButton}
                      onPress={() => {
                        if (milestone.status === 'pending') {
                          handleUpdateMilestoneStatus(milestone, 'approved');
                        } else if (milestone.status === 'approved') {
                          handleUpdateMilestoneStatus(milestone, 'pending');
                        }
                      }}
                    >
                      <Text style={styles.statusButtonText}>
                        {milestone.status === 'pending' ? 'Approve' : 'Revert to Pending'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={[styles.iconButton, index === 0 && styles.disabledButton]}
                      onPress={() => handleMoveMilestone(milestone, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp size={18} color={index === 0 ? "#6B7280" : "#FFFFFF"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.iconButton, index === milestones.length - 1 && styles.disabledButton]}
                      onPress={() => handleMoveMilestone(milestone, 'down')}
                      disabled={index === milestones.length - 1}
                    >
                      <ChevronDown size={18} color={index === milestones.length - 1 ? "#6B7280" : "#FFFFFF"} />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.iconButton, styles.deleteButton]}
                      onPress={() => handleDeleteMilestone(milestone)}
                    >
                      <Trash2 size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}

            {milestones.length === 0 && !isAddingMilestone && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No milestones added yet</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setIsAddingMilestone(true)}
                >
                  <Text style={styles.emptyButtonText}>Add Your First Milestone</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: isTablet() ? '80%' : '95%',
    maxHeight: '90%',
    backgroundColor: '#1F2937',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  modalContent: {
    padding: 16,
    maxHeight: '90%',
  },
  projectName: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 8,
  },
  statsCard: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  statsLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  completedValue: {
    color: '#10B981',
  },
  milestonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  milestonesTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  formRow: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#374151',
  },
  textArea: {
    minHeight: 80,
  },
  formButton: {
    marginTop: 8,
  },
  milestoneCard: {
    marginBottom: 12,
    padding: 0,
    overflow: 'hidden',
  },
  cardDragHandle: {
    backgroundColor: '#2D3748',
    paddingVertical: 4,
    alignItems: 'center',
  },
  dragIndicator: {
    color: '#9CA3AF',
    fontSize: responsiveFontSize(18),
    lineHeight: responsiveFontSize(18),
  },
  milestoneHeader: {
    padding: 12,
  },
  milestoneTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  milestoneName: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginRight: 8,
  },
  milestonePrice: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  milestoneDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  milestoneActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    padding: 12,
  },
  statusPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusButtonText: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    backgroundColor: '#374151',
    padding: 6,
    borderRadius: 4,
  },
  disabledButton: {
    backgroundColor: '#1F2937',
    opacity: 0.5,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  emptyButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  }
});
