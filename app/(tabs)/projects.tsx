import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Search, Plus, Filter } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import AddProjectModal from '@/components/projects/AddProjectModal';
import { supabase } from '@/lib/supabase';
import { Project } from '@/types/database';
import { responsivePadding, responsiveFontSize, isTablet } from '@/lib/responsive';
import { colors } from '@/lib/colors';

export default function ProjectsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProjects();
    setRefreshing(false);
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || project.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

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

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Completed', value: 'completed' },
    { label: 'On Hold', value: 'on_hold' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Team Projects</Text>
          <Text style={styles.subtitle}>Shared project portfolio for all team members</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setIsAddModalVisible(true)}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>New Project</Text>
        </TouchableOpacity>
      </View>
      
      <AddProjectModal 
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        onProjectAdded={loadProjects}
      />

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filter Pills */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {statusFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterPill,
              filterStatus === filter.value && styles.filterPillActive
            ]}
            onPress={() => setFilterStatus(filter.value)}
          >
            <Text style={[
              styles.filterPillText,
              filterStatus === filter.value && styles.filterPillTextActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project) => (
            <TouchableOpacity 
              key={project.id}
              onPress={() => router.push({
                pathname: "/project/[id]",
                params: { id: project.id }
              })}
            >
              <Card style={styles.projectCard}>
                <View style={styles.projectHeader}>
                  <View style={styles.statusBadgeWrapper}>
                    <StatusBadge status={project.status} variant="project" />
                  </View>
                  <Text style={styles.projectName}>{project.name}</Text>
                </View>

                {project.description && (
                  <Text style={styles.projectDescription} numberOfLines={2}>
                    {project.description || project.name}
                  </Text>
                )}
                
                <View style={styles.milestonesSection}>
                  <Text style={styles.milestonesLabel}>Milestones</Text>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View 
                        style={[styles.progressFill, { width: `${project.milestone_progress || 50}%` }]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {project.milestone_completed || '1'}/{project.milestone_total || '2'}
                    </Text>
                  </View>
                </View>

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
                
                <View style={styles.projectFooter}>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Outsourced</Text>
                    <Text style={styles.footerValue}>${project.outsourced_amount || '200'}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Text style={styles.footerLabel}>Remaining</Text>
                    <Text style={styles.footerValue}>${project.remaining_budget || '682'}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Projects Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first project to get started'
              }
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setIsAddModalVisible(true)}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.createButtonText}>Create Project</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: responsivePadding.horizontal,
    paddingVertical: responsivePadding.vertical * 0.75,
    paddingBottom: responsivePadding.vertical * 0.75,
  },
  title: {
    fontSize: responsiveFontSize(28),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: colors.brand.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    gap: 8,
  },
  addButtonText: {
    color: colors.text.primary,
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
  },
  searchContainer: {
    paddingHorizontal: responsivePadding.horizontal,
    marginBottom: responsivePadding.vertical * 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: isTablet() ? 14 : 10,
    gap: 12,
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
  searchInput: {
    flex: 1,
    fontSize: responsiveFontSize(16),
    color: '#F9FAFB',
    fontFamily: 'Inter-Regular',
  },
  filterContainer: {
    paddingHorizontal: responsivePadding.horizontal,
    marginBottom: responsivePadding.vertical * 0.5,
  },
  filterPill: {
    paddingHorizontal: isTablet() ? 20 : 16,
    paddingVertical: isTablet() ? 10 : 8,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterPillText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding.horizontal,
  },
  projectCard: {
    marginBottom: responsivePadding.vertical * 0.75,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadgeWrapper: {
    marginRight: 12,
  },
  projectName: {
    flex: 1,
    fontSize: responsiveFontSize(18),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  projectDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: responsiveFontSize(20),
    borderLeftWidth: 0,
    paddingLeft: 0,
  },
  milestonesSection: {
    marginBottom: 16,
  },
  milestonesLabel: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#374151',
    borderRadius: 3,
    overflow: 'hidden',
    marginRight: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  projectMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  projectFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#374151',
    paddingTop: 12,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  footerValue: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: responsivePadding.horizontal * 2,
  },
  emptyTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: responsiveFontSize(20),
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#3B82F6',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  createButtonText: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});