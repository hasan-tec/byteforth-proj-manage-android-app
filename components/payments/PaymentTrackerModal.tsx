import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { Payment } from '@/types/database';
import { responsiveFontSize } from '@/lib/responsive';

interface PaymentTrackerModalProps {
  visible: boolean;
  onClose: () => void;
}

const PaymentTrackerModal: React.FC<PaymentTrackerModalProps> = ({ visible, onClose }) => {
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  useEffect(() => {
    if (visible) {
      loadPayments();
    }
  }, [visible, month, year, filterStatus]);

  const loadPayments = async () => {
    try {
      // Get first and last day of month
      const startDate = new Date(year, month, 1).toISOString();
      const endDate = new Date(year, month + 1, 0).toISOString();
      
      let query = supabase
        .from('payments')
        .select(`
          *,
          project:projects(name),
          outsourcing:outsourcing(part_name)
        `)
        .gte('due_date', startDate)
        .lte('due_date', endDate);
        
      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }
        
      const { data, error } = await query;

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments for tracker:', error);
    }
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Create array of days with payment data
    const daysWithPayments = new Array(daysInMonth).fill(0).map((_, i) => {
      const day = i + 1;
      const date = new Date(year, month, day);
      const paymentsForDay = payments.filter(p => {
        const paymentDate = new Date(p.due_date);
        return (
          paymentDate.getDate() === day &&
          paymentDate.getMonth() === month &&
          paymentDate.getFullYear() === year
        );
      });
      
      return {
        day,
        payments: paymentsForDay,
      };
    });
    
    // Add header row
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.push(
      <View style={styles.calendarRow} key="header">
        {weekdays.map((day, i) => (
          <View style={styles.calendarHeaderCell} key={`header-${i}`}>
            <Text style={styles.calendarHeaderText}>{day}</Text>
          </View>
        ))}
      </View>
    );
    
    // Create calendar grid
    let day = 1;
    for (let i = 0; i < 6; i++) {
      const row = [];
      
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < firstDay) {
          // Empty cells before the first day
          row.push(<View style={styles.calendarCell} key={`empty-${j}`} />);
        } else if (day > daysInMonth) {
          // Empty cells after the last day
          row.push(<View style={styles.calendarCell} key={`empty-end-${j}`} />);
        } else {
          // Day cells with payment data
          const dayData = daysWithPayments[day - 1];
          const hasPayments = dayData.payments.length > 0;
          const isToday = new Date().getDate() === day && 
                          new Date().getMonth() === month && 
                          new Date().getFullYear() === year;
          
          row.push(
            <TouchableOpacity 
              style={[
                styles.calendarCell, 
                isToday && styles.today,
                hasPayments && styles.cellWithPayment
              ]} 
              key={`day-${day}`}
            >
              <Text style={styles.dayNumber}>{day}</Text>
              {hasPayments && (
                <View style={styles.paymentIndicator}>
                  <Text style={styles.paymentCount}>{dayData.payments.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
          day++;
        }
      }
      
      if (day <= daysInMonth) {
        days.push(<View style={styles.calendarRow} key={`row-${i}`}>{row}</View>);
      }
    }
    
    return days;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const calculateMonthlyTotal = () => {
    if (payments.length === 0) return 0;
    return payments.reduce((sum, payment) => sum + payment.amount, 0);
  };

  const calculatePaidTotal = () => {
    if (payments.length === 0) return 0;
    return payments
      .filter(p => p.status === 'paid')
      .reduce((sum, payment) => sum + payment.amount, 0);
  };

  const getMonthName = (month: number) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month];
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (month === 0) {
        setMonth(11);
        setYear(year - 1);
      } else {
        setMonth(month - 1);
      }
    } else {
      if (month === 11) {
        setMonth(0);
        setYear(year + 1);
      } else {
        setMonth(month + 1);
      }
    }
  };

  const statusFilters = [
    { label: 'All Status', value: 'all' },
    { label: 'Needs to be Paid', value: 'needs_to_be_paid' },
    { label: 'Paid', value: 'paid' },
    { label: 'Overdue', value: 'overdue' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Payment Tracker</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.subtitle}>Calendar view of payment schedules</Text>
          
          <View style={styles.dateControls}>
            <View style={styles.monthSelection}>
              <TouchableOpacity 
                style={styles.monthButton}
                onPress={() => navigateMonth('prev')}
              >
                <Text style={styles.monthButtonText}>{'<'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.monthYearPicker}>
                <Text style={styles.monthYear}>{getMonthName(month)}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.monthYearPicker}>
                <Text style={styles.monthYear}>{year}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.monthButton}
                onPress={() => navigateMonth('next')}
              >
                <Text style={styles.monthButtonText}>{'>'}</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.filterDropdown}>
              <TouchableOpacity 
                style={styles.statusPicker}
                onPress={() => {
                  const currentIndex = statusFilters.findIndex(f => f.value === filterStatus);
                  const nextIndex = (currentIndex + 1) % statusFilters.length;
                  setFilterStatus(statusFilters[nextIndex].value);
                }}
              >
                <Text style={styles.statusText}>
                  {statusFilters.find(f => f.value === filterStatus)?.label || 'All Status'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.summaryCards}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryAmount}>{formatCurrency(calculateMonthlyTotal())}</Text>
              <Text style={styles.summaryLabel}>Total for {getMonthName(month)}</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <View style={styles.paidIndicator}>
                <Check size={16} color="#FFFFFF" />
              </View>
              <Text style={styles.summaryAmount}>{formatCurrency(calculatePaidTotal())}</Text>
              <Text style={styles.summaryLabel}>Paid</Text>
            </View>
            
            <View style={styles.summaryCard}>
              <Text style={styles.summaryAmount}>{payments.length}</Text>
              <Text style={styles.summaryLabel}>Payments</Text>
            </View>
          </View>
          
          <ScrollView style={styles.calendarContainer}>
            {renderCalendar()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 600,
    backgroundColor: '#1F2937',
    borderRadius: 12,
    maxHeight: '90%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: responsiveFontSize(20),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  subtitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginBottom: 16,
  },
  dateControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthSelection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  monthButtonText: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-SemiBold',
    color: '#F9FAFB',
  },
  monthYearPicker: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  monthYear: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
  },
  filterDropdown: {
    flex: 1,
    marginLeft: 16,
  },
  statusPicker: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
  },
  summaryCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: responsiveFontSize(16),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  paidIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  calendarContainer: {
    flex: 1,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calendarHeaderCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  calendarHeaderText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#D1D5DB',
  },
  calendarCell: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: '#2D3748',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    position: 'relative',
  },
  today: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  cellWithPayment: {
    backgroundColor: '#374151',
  },
  dayNumber: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#F9FAFB',
  },
  paymentIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentCount: {
    fontSize: responsiveFontSize(10),
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
});

export default PaymentTrackerModal;
