import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/lib/colors';

interface StatusBadgeProps {
  status: string;
  variant?: 'project' | 'milestone' | 'payment' | 'outsourcing';
}

export function StatusBadge({ status, variant = 'project' }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'active':
      case 'in_progress':
      case 'approved':
        return colors.status.active;
      case 'completed':
      case 'paid':
        return colors.status.completed;
      case 'pending':
      case 'needs_to_be_paid':
        return colors.status.pending;
      case 'cancelled':
      case 'rejected':
        return colors.status.cancelled;
      case 'on_hold':
      case 'withdrew':
        return colors.status.onHold;
      case 'overdue':
        return colors.status.overdue;
      default:
        return colors.status.onHold;
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const backgroundColor = getStatusColor();

  return (
    <View style={[styles.badge, { backgroundColor: backgroundColor + '15', borderColor: backgroundColor + '30' }]}>
      <View style={[styles.dot, { backgroundColor }]} />
      <Text style={[styles.text, { color: backgroundColor }]}>
        {formatStatus(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 4,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
});