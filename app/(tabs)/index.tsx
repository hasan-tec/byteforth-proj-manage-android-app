import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, DollarSign, FolderOpen, Users, Clock } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { Project, Payment, Outsourcing, ActivityLog } from '@/types/database';
import { responsivePadding, responsiveFontSize, getStatCardWidth, isTablet, getGridColumns } from '@/lib/responsive';
import { colors } from '@/lib/colors';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalBudget: 0,
    totalPayments: 0,
    paidPayments: 0,
    overduePayments: 0,
    activeTasks: 0,
  });
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadRecentActivities(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      // Projects stats
      const { data: projects } = await supabase
        .from('projects')
        .select('*');

      const totalProjects = projects?.length || 0;
      const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
      const totalBudget = projects?.reduce((sum, p) => sum + p.total_budget, 0) || 0;

      // Payments stats
      const { data: payments } = await supabase
        .from('payments')
        .select('*');

      const totalPayments = payments?.length || 0;
      const paidPayments = payments?.filter(p => p.status === 'paid').length || 0;
      const overduePayments = payments?.filter(p => p.status === 'overdue').length || 0;

      // Outsourcing stats
      const { data: outsourcing } = await supabase
        .from('outsourcing')
        .select('*');

      const activeTasks = outsourcing?.filter(o => o.status === 'in_progress').length || 0;

      setStats({
        totalProjects,
        activeProjects,
        totalBudget,
        totalPayments,
        paidPayments,
        overduePayments,
        activeTasks,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .not('action', 'in', '(sign_in,sign_out,sign_up)')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shared Dashboard</Text>
          <Text style={styles.subtitle}>Team collaboration workspace</Text>
        </View>
        <TouchableOpacity style={styles.addButton}>
          <Plus size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Widget</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#3B82F6' }]}>
                <FolderOpen size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Total Projects</Text>
            </View>
            <Text style={styles.statValue}>{stats.totalProjects}</Text>
            <Text style={styles.statSubtext}>{stats.activeProjects} active</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#10B981' }]}>
                <DollarSign size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Total Budget</Text>
            </View>
            <Text style={styles.statValue}>{formatCurrency(stats.totalBudget)}</Text>
            <Text style={styles.statSubtext}>Allocated</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#F59E0B' }]}>
                <Users size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Outstanding</Text>
            </View>
            <Text style={styles.statValue}>${stats.overduePayments > 0 ? '200' : '0'}</Text>
            <Text style={styles.statSubtext}>Not Paid</Text>
          </Card>

          <Card style={styles.statCard}>
            <View style={styles.statHeader}>
              <View style={[styles.statIcon, { backgroundColor: '#EF4444' }]}>
                <Clock size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.statTitle}>Income Rate</Text>
            </View>
            <Text style={styles.statValue}>0%</Text>
            <Text style={styles.statSubtext}>This Month</Text>
          </Card>
        </View>

        {/* Recent Activity */}
        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Team Activity</Text>
            <TouchableOpacity>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>
          {recentActivities.length > 0 ? (
            <View style={styles.activityList}>
              {recentActivities.map((activity, index) => (
                <View key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityAvatar}>
                    <Text style={styles.activityAvatarText}>
                      {activity.profile?.full_name?.charAt(0) || 'U'}
                    </Text>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityDescription}>
                      <Text style={styles.activityUser}>
                        {activity.profile?.full_name || 'Unknown User'}
                      </Text>
                      {' '}
                      {activity.description}
                    </Text>
                    <Text style={styles.activityTime}>
                      {formatTimeAgo(activity.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No recent activity</Text>
          )}
        </Card>
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
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: colors.text.tertiary,
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: colors.brand.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    shadowColor: colors.brand.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  addButtonText: {
    color: colors.text.primary,
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    marginLeft: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: responsivePadding.horizontal,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: responsivePadding.vertical,
  },
  statCard: {
    width: getStatCardWidth(),
    marginBottom: responsivePadding.vertical * 0.5,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statTitle: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#9CA3AF',
    flex: 1,
  },
  statValue: {
    fontSize: responsiveFontSize(28),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
    marginBottom: 8,
  },
  statSubtext: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
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
  sectionLink: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  activityList: {
    gap: 16,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityAvatarText: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  activityContent: {
    flex: 1,
  },
  activityDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
    marginBottom: 4,
    lineHeight: 20,
  },
  activityUser: {
    fontFamily: 'Inter-SemiBold',
    color: '#3B82F6',
  },
  activityTime: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  emptyText: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    padding: 20,
  },
});