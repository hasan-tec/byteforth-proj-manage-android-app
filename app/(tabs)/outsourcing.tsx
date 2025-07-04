import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, User, Calendar, Filter } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Outsourcing } from '@/types/database';
import { formatDistanceToNow } from 'date-fns';
import AddTaskModal from '@/components/outsourcing/AddTaskModal';
import EditTaskModal from '@/components/outsourcing/EditTaskModal';
import ProjectSelector from '@/components/outsourcing/ProjectSelector';
import { responsivePadding } from '@/lib/responsive';

export default function OutsourcingScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Outsourcing[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Outsourcing | null>(null);
  const [summaryData, setSummaryData] = useState({
    totalValue: 0,
    unpaidValue: 0,
    completedTasks: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [selectedProjectId]);

  useEffect(() => {
    calculateSummary();
  }, [tasks]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('outsourcing')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });
        
      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data || []);
      calculateSummary();
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const calculateSummary = () => {
    const totalValue = tasks.reduce((sum, task) => sum + task.price, 0);
    const unpaidValue = tasks.filter(task => task.payment_status === 'unpaid' || task.payment_status === 'partially_paid')
      .reduce((sum, task) => sum + task.price, 0);
    const completedTasks = tasks.filter(task => task.status === 'completed').length;

    setSummaryData({
      totalValue,
      unpaidValue,
      completedTasks
    });
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.part_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.person_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#10B981';
      case 'unpaid': return '#F59E0B';
      case 'partially_paid': return '#3B82F6';
      default: return '#6B7280';
    }
  };
  
  const handleEditTask = (task: Outsourcing) => {
    setSelectedTask(task);
    setEditModalVisible(true);
  };
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tasks</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setAddModalVisible(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.summaryContainer}
      >
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Value</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summaryData.totalValue)}</Text>
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unpaid</Text>
          <Text style={styles.summaryValue}>{formatCurrency(summaryData.unpaidValue)}</Text>
        </Card>

        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Completed Tasks</Text>
          <Text style={styles.summaryValue}>{summaryData.completedTasks}</Text>
        </Card>
      </ScrollView>

      {/* Search and Filter toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search tasks..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity 
          style={[styles.filterButton, showFilters && styles.filterButtonActive]} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={20} color={showFilters ? "#FFFFFF" : "#9CA3AF"} />
        </TouchableOpacity>
      </View>

      {/* Advanced Filters */}
      {showFilters && (
        <View style={styles.advancedFilterContainer}>
          <Text style={styles.filterSectionTitle}>Project</Text>
          <ProjectSelector 
            selectedProjectId={selectedProjectId}
            onProjectChange={setSelectedProjectId}
          />

          <Text style={styles.filterSectionTitle}>Status</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.filterScrollView}
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
        </View>
      )}

      {/* Filter Pills - only show when advanced filters are hidden */}
      {!showFilters && (
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
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView 
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TouchableOpacity 
                key={task.id}
                onPress={() => handleEditTask(task)}
              >
                <Card style={styles.taskCard}>
                  <View style={styles.taskHeader}>
                    <Text style={styles.taskName}>{task.part_name}</Text>
                    <StatusBadge status={task.status} variant="outsourcing" />
                  </View>

                  <View style={styles.assigneeContainer}>
                    <User size={16} color="#9CA3AF" />
                    <Text style={styles.assigneeName}>{task.person_name}</Text>
                  </View>

                  {task.description && (
                    <Text style={styles.taskDescription} numberOfLines={2}>
                      {task.description}
                    </Text>
                  )}

                  <View style={styles.taskMeta}>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Project</Text>
                      <Text style={styles.metaValue}>
                        {task.project?.name || 'Unknown'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Text style={styles.metaLabel}>Price</Text>
                      <Text style={styles.metaValue}>
                        {formatCurrency(task.price)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.taskFooter}>
                    <View style={styles.paymentStatus}>
                      <View style={[
                        styles.paymentDot,
                        { backgroundColor: getPaymentStatusColor(task.payment_status) }
                      ]} />
                      <Text style={styles.paymentText}>
                        {task.payment_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Text>
                    </View>
                    
                    <View style={styles.dateContainer}>
                      <Calendar size={12} color="#9CA3AF" />
                      <Text style={styles.dateText}>{formatDate(task.created_at)}</Text>
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>No Tasks Found</Text>
              <Text style={styles.emptyDescription}>
                {(searchQuery || filterStatus !== 'all' || selectedProjectId) 
                  ? 'Try adjusting your search or filters'
                  : 'Create your first task to get started'
                }
              </Text>
              <Button
                title="Create Task"
                onPress={() => setAddModalVisible(true)}
                variant="primary"
                size="medium"
              />
            </View>
          )}
        </ScrollView>
      )}

      {/* Add Task Modal */}
      <AddTaskModal
        visible={addModalVisible}
        onClose={() => setAddModalVisible(false)}
        onTaskAdded={() => {
          loadTasks();
        }}
        selectedProjectId={selectedProjectId}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        visible={editModalVisible}
        onClose={() => {
          setEditModalVisible(false);
          setSelectedTask(null);
        }}
        onTaskUpdated={() => {
          loadTasks();
        }}
        task={selectedTask}
      />
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Summary cards
  summaryContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    minWidth: 160,
    marginRight: 12,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  // Search and filters
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#F9FAFB',
    fontFamily: 'Inter-Regular',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
  },
  // Advanced filters
  advancedFilterContainer: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    backgroundColor: '#1F2937',
    marginBottom: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#374151',
  },
  filterSectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
    marginBottom: 8,
    marginTop: 8,
  },
  filterScrollView: {
    marginBottom: 12,
  },
  // Filter Pills
  filterContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
  },
  filterPillText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  // Task Cards
  taskCard: {
    marginBottom: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginRight: 12,
  },
  assigneeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  assigneeName: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  taskDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  taskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  paymentText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});