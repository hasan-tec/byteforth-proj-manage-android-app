import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Plus, Trash2, Move, ChevronUp, ChevronDown } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Project, Milestone } from '@/types/database';
import { responsivePadding, responsiveFontSize, isTablet } from '@/lib/responsive';

export default function ManageMilestonesScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestonePrice, setNewMilestonePrice] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadProjectAndMilestones();
  }, [id]);

  const loadProjectAndMilestones = async () => {
    try {
      setLoading(true);
      // Load project details
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Load milestones
      const { data: milestonesData, error: milestonesError } = await supabase
        .from('milestones')
        .select('*')
        .eq('project_id', id)
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
      if (!newMilestoneName.trim()) {
        Alert.alert('Error', 'Please enter a milestone name');
        return;
      }

      const price = parseFloat(newMilestonePrice);
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
          project_id: id as string,
          name: newMilestoneName.trim(),
          price,
          description: newMilestoneDescription.trim() || null,
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
      setNewMilestoneName('');
      setNewMilestonePrice('');
      setNewMilestoneDescription('');
      setIsAddingMilestone(false);

      // Create activity log
      await supabase
        .from('activity_logs')
        .insert({
          action: 'created',
          resource_type: 'milestone',
          resource_id: data ? data[0].id : null,
          description: `Added milestone "${newMilestoneName}" to project "${project?.name}"`,
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
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
        <Text style={styles.title}>Manage Milestones</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
        {project && (
          <Card style={styles.projectCard}>
            <Text style={styles.projectName}>{project.name}</Text>
            <Text style={styles.projectBudget}>
              Budget: {formatCurrency(project.total_budget)}
            </Text>
          </Card>
        )}
        
        {/* Milestone List */}
        <View style={styles.milestonesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Milestones</Text>
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
              <Text style={styles.formLabel}>Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter milestone name"
                placeholderTextColor="#6B7280"
                value={newMilestoneName}
                onChangeText={setNewMilestoneName}
              />
              
              <Text style={styles.formLabel}>Price</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter price"
                placeholderTextColor="#6B7280"
                keyboardType="numeric"
                value={newMilestonePrice}
                onChangeText={setNewMilestonePrice}
              />
              
              <Text style={styles.formLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                placeholder="Enter description"
                placeholderTextColor="#6B7280"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={newMilestoneDescription}
                onChangeText={setNewMilestoneDescription}
              />
              
              <Button
                title="Add Milestone"
                onPress={handleAddMilestone}
                variant="primary"
                disabled={isSubmitting}
                loading={isSubmitting}
                style={styles.submitButton}
              />
            </Card>
          )}
          
          {/* Milestones List */}
          {milestones.length > 0 ? (
            milestones.map((milestone, index) => (
              <Card key={milestone.id} style={styles.milestoneCard}>
                <View style={styles.milestoneHeader}>
                  <Text style={styles.milestoneName}>{milestone.name}</Text>
                  <StatusBadge status={milestone.status} variant="milestone" />
                </View>
                
                {milestone.description && (
                  <Text style={styles.milestoneDescription}>
                    {milestone.description}
                  </Text>
                )}
                
                <View style={styles.milestoneActions}>
                  <Text style={styles.milestonePrice}>
                    {formatCurrency(milestone.price)}
                  </Text>
                  
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleMoveMilestone(milestone, 'up')}
                      disabled={index === 0}
                    >
                      <ChevronUp 
                        size={20} 
                        color={index === 0 ? '#6B7280' : '#FFFFFF'} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleMoveMilestone(milestone, 'down')}
                      disabled={index === milestones.length - 1}
                    >
                      <ChevronDown 
                        size={20} 
                        color={index === milestones.length - 1 ? '#6B7280' : '#FFFFFF'} 
                      />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.iconButton}
                      onPress={() => handleDeleteMilestone(milestone)}
                    >
                      <Trash2 size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))
          ) : (
            <Text style={styles.emptyText}>
              No milestones added yet. Add your first milestone.
            </Text>
          )}
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
  },
  projectName: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  projectBudget: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Medium',
    color: '#10B981',
  },
  milestonesContainer: {
    marginBottom: responsivePadding.vertical,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
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
    gap: 8,
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
  },
  milestoneCard: {
    marginBottom: 12,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneName: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    flex: 1,
  },
  milestoneDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: responsiveFontSize(20),
  },
  milestoneActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestonePrice: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#374151',
  },
  emptyText: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 20,
  }
});
