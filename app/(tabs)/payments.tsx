import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Plus, Calendar, List, Clock, AlertCircle, DollarSign, Check } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/types/database';
import AddPaymentModal from '@/components/payments/AddPaymentModal';
import PaymentTrackerModal from '@/components/payments/PaymentTrackerModal';

export default function PaymentsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [isAddPaymentModalVisible, setIsAddPaymentModalVisible] = useState(false);
  const [isPaymentTrackerModalVisible, setIsPaymentTrackerModalVisible] = useState(false);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          project:projects(name),
          outsourcing:outsourcing(part_name)
        `)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate payment summary statistics
  const getTotalAmount = () => {
    if (payments.length === 0) return 0;
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  const getPaidAmount = () => {
    if (payments.length === 0) return 0;
    return payments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };
  
  const getOverdueCount = () => {
    return payments.filter(p => isOverdue(p.due_date, p.status)).length;
  };
  
  const getDueSoonCount = () => {
    // Due in the next 7 days
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    return payments.filter(p => {
      const dueDate = new Date(p.due_date);
      return p.status !== 'paid' && dueDate > today && dueDate <= nextWeek;
    }).length;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPayments();
    setRefreshing(false);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         payment.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || payment.status === filterStatus;
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

  const isOverdue = (dueDate: string, status: string) => {
    return status !== 'paid' && new Date(dueDate) < new Date();
  };

  const statusFilters = [
    { label: 'All', value: 'all' },
    { label: 'Needs Payment', value: 'needs_to_be_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const overduePayments = payments.filter(p => isOverdue(p.due_date, p.status));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Payments</Text>
          <Text style={styles.subtitle}>Manage your payment transactions</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.viewToggle, viewMode === 'list' && styles.viewToggleActive]}
            onPress={() => setViewMode('list')}
          >
            <List size={20} color={viewMode === 'list' ? '#FFFFFF' : '#9CA3AF'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggle, viewMode === 'calendar' && styles.viewToggleActive]}
            onPress={() => setIsPaymentTrackerModalVisible(true)}
          >
            <Calendar size={20} color={viewMode === 'calendar' ? '#FFFFFF' : '#9CA3AF'} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setIsAddPaymentModalVisible(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryCardsContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <DollarSign size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.summaryAmount}>{formatCurrency(getTotalAmount())}</Text>
            <Text style={styles.summaryLabel}>Total Amount</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, { backgroundColor: '#10B981' }]}>
            <Check size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.summaryAmount}>{formatCurrency(getPaidAmount())}</Text>
            <Text style={styles.summaryLabel}>Paid</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, { backgroundColor: '#EF4444' }]}>
            <AlertCircle size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.summaryAmount}>{getOverdueCount()}</Text>
            <Text style={styles.summaryLabel}>Overdue</Text>
          </View>
        </View>
        
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIconContainer, { backgroundColor: '#F59E0B' }]}>
            <Clock size={24} color="#FFFFFF" />
          </View>
          <View>
            <Text style={styles.summaryAmount}>{getDueSoonCount()}</Text>
            <Text style={styles.summaryLabel}>Due Soon</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Overdue Alert */}
      {overduePayments.length > 0 && (
        <View style={styles.alertContainer}>
          <View style={styles.alert}>
            <AlertCircle size={20} color="#EF4444" />
            <Text style={styles.alertText}>
              {overduePayments.length} payment{overduePayments.length > 1 ? 's' : ''} overdue
            </Text>
          </View>
        </View>
      )}

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search payments..."
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
        {filteredPayments.length > 0 ? (
          filteredPayments.map((payment) => (
            <TouchableOpacity key={payment.id}>
              <Card 
                style={{
                  ...styles.paymentCard,
                  ...(isOverdue(payment.due_date, payment.status) ? styles.paymentCardOverdue : {})
                }}
              >
                <View style={styles.paymentHeader}>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.recipientName}>{payment.recipient_name}</Text>
                    <Text style={styles.recipientEmail}>{payment.recipient_email}</Text>
                  </View>
                  <StatusBadge status={payment.status} variant="payment" />
                </View>

                {payment.description && (
                  <Text style={styles.paymentDescription} numberOfLines={2}>
                    {payment.description}
                  </Text>
                )}

                <View style={styles.paymentMeta}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Amount</Text>
                    <Text style={styles.amount}>
                      {formatCurrency(payment.amount)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Due Date</Text>
                    <View style={styles.dueDateContainer}>
                      {isOverdue(payment.due_date, payment.status) && (
                        <Clock size={14} color="#EF4444" />
                      )}
                      <Text style={[
                        styles.dueDate,
                        isOverdue(payment.due_date, payment.status) && styles.overdue
                      ]}>
                        {formatDate(payment.due_date)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.projectInfo}>
                  <Text style={styles.projectLabel}>Project: </Text>
                  <Text style={styles.projectName}>
                    {payment.project?.name || 'Unknown'}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Payments Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterStatus !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Create your first payment to get started'
              }
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => setIsAddPaymentModalVisible(true)}
            >
              <Text style={styles.createButtonText}>Add Payment</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
      
      {/* Modals */}
      <AddPaymentModal
        visible={isAddPaymentModalVisible}
        onClose={() => setIsAddPaymentModalVisible(false)}
        onPaymentAdded={loadPayments}
      />
      
      <PaymentTrackerModal
        visible={isPaymentTrackerModalVisible}
        onClose={() => setIsPaymentTrackerModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  viewToggle: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  viewToggleActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryCardsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: '#1F2937',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 150,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  alertContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  alert: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#DC2626',
  },
  searchContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 16,
    color: '#F9FAFB',
    fontFamily: 'Inter-Regular',
  },
  filterContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  paymentCard: {
    marginBottom: 16,
  },
  paymentCardOverdue: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  recipientName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
    marginBottom: 2,
  },
  recipientEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  paymentDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 16,
    lineHeight: 20,
  },
  paymentMeta: {
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
  amount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#10B981',
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDate: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  overdue: {
    color: '#EF4444',
  },
  projectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  projectName: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
  },
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
    borderRadius: 8,
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});