import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Edit2, Trash2, Plus, CreditCard, Users } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import MilestoneManagerModal from '@/components/projects/MilestoneManagerModal';
import EditProjectModal from '@/components/projects/EditProjectModal';
import { supabase } from '@/lib/supabase';
import { Project, Milestone, Outsourcing } from '@/types/database';
import { responsivePadding, responsiveFontSize, isTablet } from '@/lib/responsive';

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [outsourcing, setOutsourcing] = useState<Outsourcing[]>([]);
  const [activeTab, setActiveTab] = useState<'milestones' | 'outsourcing'>('milestones');
  const [isMilestoneModalVisible, setIsMilestoneModalVisible] = useState(false);
  const [isEditProjectModalVisible, setIsEditProjectModalVisible] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [id]);

  const loadProjectData = async () => {
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

      // Load outsourcing
      const { data: outsourcingData, error: outsourcingError } = await supabase
        .from('outsourcing')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      if (outsourcingError) throw outsourcingError;
      setOutsourcing(outsourcingData || []);
    } catch (error) {
      console.error('Error loading project data:', error);
      Alert.alert('Error', 'Failed to load project data');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjectData();
    setRefreshing(false);
  };

  const handleEditProject = () => {
    setIsEditProjectModalVisible(true);
  };

  const handleDeleteProject = () => {
    Alert.alert(
      'Delete Project',
      'Are you sure you want to delete this project? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the project
              const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);

              if (error) throw error;
              
              // Navigate back to projects list
              router.replace('/(tabs)/projects');
            } catch (error) {
              console.error('Error deleting project:', error);
              Alert.alert('Error', 'Failed to delete project');
            }
          }
        },
      ]
    );
  };

  const handleManageMilestones = () => {
    setIsMilestoneModalVisible(true);
  };

  const handleAddOutsourcing = () => {
    router.push({
      pathname: "/project/[id]/outsourcing/create",
      params: { id }
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Calculate milestones progress
  const calculateMilestoneProgress = () => {
    if (!milestones || milestones.length === 0) return '0/0';
    const completedCount = milestones.filter(m => m.status === 'completed' || m.status === 'approved').length;
    return `${completedCount}/${milestones.length}`;
  };

  // Calculate total outsourced amount
  const calculateOutsourcedAmount = () => {
    if (!outsourcing || outsourcing.length === 0) return 0;
    return outsourcing.reduce((sum, item) => sum + item.price, 0);
  };

  if (loading && !project) {
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
        <Text style={styles.title}>Project Details</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleEditProject}
          >
            <Edit2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={handleDeleteProject}
          >
            <Trash2 size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Modals */}
      {project && (
        <>
          <MilestoneManagerModal
            visible={isMilestoneModalVisible}
            onClose={() => setIsMilestoneModalVisible(false)}
            projectId={id as string}
            onMilestonesUpdated={loadProjectData}
          />
          <EditProjectModal
            visible={isEditProjectModalVisible}
            onClose={() => setIsEditProjectModalVisible(false)}
            project={project}
            onProjectUpdated={loadProjectData}
          />
        </>
      )}

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {project && (
          <>
            {/* Project Summary Card */}
            <Card style={styles.projectCard}>
              <View style={styles.projectHeader}>
                <Text style={styles.projectName}>{project.name}</Text>
                <StatusBadge status={project.status} variant="project" />
              </View>

              {project.description && (
                <Text style={styles.projectDescription}>
                  {project.description}
                </Text>
              )}

              <View style={styles.projectMeta}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Total Budget</Text>
                  <Text style={styles.metaValue}>
                    {formatCurrency(project.total_budget)}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>Created</Text>
                  <Text style={styles.metaValue}>
                    {formatDate(project.created_at)}
                  </Text>
                </View>
              </View>
            </Card>

            {/* Project Stats */}
            <Card style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(project.total_budget)}</Text>
                  <Text style={styles.statLabel}>Total Budget</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{calculateMilestoneProgress()}</Text>
                  <Text style={styles.statLabel}>Milestones</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatCurrency(calculateOutsourcedAmount())}</Text>
                  <Text style={styles.statLabel}>Outsourced</Text>
                </View>
              </View>
            </Card>

            {/* Tab Navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'milestones' && styles.activeTab]}
                onPress={() => setActiveTab('milestones')}
              >
                <Text style={[styles.tabText, activeTab === 'milestones' && styles.activeTabText]}>
                  Milestones
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'outsourcing' && styles.activeTab]}
                onPress={() => setActiveTab('outsourcing')}
              >
                <Text style={[styles.tabText, activeTab === 'outsourcing' && styles.activeTabText]}>
                  Outsourcing
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab Content */}
            {activeTab === 'milestones' ? (
              <View style={styles.tabContent}>
                <View style={styles.tabHeader}>
                  <Text style={styles.tabTitle}>Milestones</Text>
                  <Button 
                    onPress={handleManageMilestones}
                    variant="primary"
                    size="small"
                    title="Manage Milestones"
                  />
                </View>

                {milestones.length > 0 ? (
                  milestones.map((milestone) => (
                    <Card key={milestone.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{milestone.name}</Text>
                        <StatusBadge status={milestone.status} variant="milestone" />
                      </View>
                      {milestone.description && (
                        <Text style={styles.itemDescription}>{milestone.description}</Text>
                      )}
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemPrice}>{formatCurrency(milestone.price)}</Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No milestones added yet</Text>
                    <Button 
                      onPress={handleManageMilestones}
                      variant="primary"
                      style={styles.emptyStateButton}
                      title="Add Milestones"
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.tabContent}>
                <View style={styles.tabHeader}>
                  <Text style={styles.tabTitle}>Outsourcing</Text>
                  <Button 
                    onPress={handleAddOutsourcing}
                    variant="primary"
                    size="small"
                    title="Add Outsourcing"
                  />
                </View>

                {outsourcing.length > 0 ? (
                  outsourcing.map((item) => (
                    <Card key={item.id} style={styles.itemCard}>
                      <View style={styles.itemHeader}>
                        <Text style={styles.itemName}>{item.part_name}</Text>
                        <View style={styles.itemStatusContainer}>
                          <StatusBadge status={item.payment_status} variant="payment" />
                          <StatusBadge status={item.status} variant="outsourcing" />
                        </View>
                      </View>
                      <Text style={styles.itemAssignee}>Assigned to {item.person_name}</Text>
                      {item.description && (
                        <Text style={styles.itemDescription}>{item.description}</Text>
                      )}
                      <View style={styles.itemFooter}>
                        <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
                      </View>
                    </Card>
                  ))
                ) : (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>No outsourced tasks added yet</Text>
                    <Button 
                      onPress={handleAddOutsourcing}
                      variant="primary"
                      style={styles.emptyStateButton}
                      title="Add Outsourcing"
                    />
                  </View>
                )}
              </View>
            )}
          </>
        )}
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
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  iconButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding.horizontal,
    paddingTop: responsivePadding.vertical * 0.5,
  },
  projectCard: {
    marginBottom: responsivePadding.vertical * 0.5,
  },
  projectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  projectName: {
    flex: 1,
    fontSize: responsiveFontSize(22),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginRight: 12,
  },
  projectDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: responsiveFontSize(20),
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  statsCard: {
    marginBottom: responsivePadding.vertical * 0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  statValue: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  statDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#374151',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#2D3748',
  },
  tabText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  activeTabText: {
    color: '#F9FAFB',
  },
  tabContent: {
    marginBottom: responsivePadding.vertical,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tabTitle: {
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  itemCard: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginRight: 12,
  },
  itemStatusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  itemAssignee: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  itemDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 12,
    lineHeight: responsiveFontSize(20),
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  itemPrice: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#10B981',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsivePadding.vertical,
  },
  emptyStateText: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  emptyStateButton: {
    minWidth: 200,
  },
});
