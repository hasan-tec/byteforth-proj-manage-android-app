import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Filter, FolderOpen, Users, CreditCard, User } from 'lucide-react-native';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { ActivityLog } from '@/types/database';
import { responsivePadding, responsiveFontSize, getActivityCardPadding, isTablet } from '@/lib/responsive';

export default function ActivityScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select(`
          *,
          profile:profiles(full_name, avatar_url)
        `)
        .not('action', 'in', '(sign_in,sign_out,sign_up)')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setActivities(data || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || activity.resource_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  const getActivityIcon = (resourceType: string) => {
    switch (resourceType) {
      case 'project':
        return <FolderOpen size={16} color="#3B82F6" />;
      case 'outsourcing':
        return <Users size={16} color="#F59E0B" />;
      case 'payment':
        return <CreditCard size={16} color="#10B981" />;
      default:
        return <User size={16} color="#9CA3AF" />;
    }
  };

  const typeFilters = [
    { label: 'All', value: 'all' },
    { label: 'Projects', value: 'project' },
    { label: 'Milestones', value: 'milestone' },
    { label: 'Tasks', value: 'outsourcing' },
    { label: 'Payments', value: 'payment' },
    { label: 'Users', value: 'user' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Filter size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={20} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search activities..."
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
        {typeFilters.map((filter) => (
          <TouchableOpacity
            key={filter.value}
            style={[
              styles.filterPill,
              filterType === filter.value && styles.filterPillActive
            ]}
            onPress={() => setFilterType(filter.value)}
          >
            <Text style={[
              styles.filterPillText,
              filterType === filter.value && styles.filterPillTextActive
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
        {filteredActivities.length > 0 ? (
          filteredActivities.map((activity) => (
            <TouchableOpacity key={activity.id}>
              <Card style={styles.activityCard}>
                <View style={styles.activityHeader}>
                  <View style={styles.activityIcon}>
                    {getActivityIcon(activity.resource_type)}
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityDescription}>
                      {activity.description}
                    </Text>
                    <View style={styles.activityMeta}>
                      <Text style={styles.activityAction}>
                        {activity.action}
                      </Text>
                      <Text style={styles.activityTime}>
                        {formatTimeAgo(activity.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Activity Found</Text>
            <Text style={styles.emptyDescription}>
              {searchQuery || filterType !== 'all' 
                ? 'Try adjusting your search or filters'
                : 'Activity will appear here as you use the app'
              }
            </Text>
          </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsivePadding.horizontal,
    paddingVertical: responsivePadding.vertical * 0.75,
    paddingBottom: responsivePadding.vertical * 0.5,
  },
  title: {
    fontSize: responsiveFontSize(28),
    fontFamily: 'Inter-Bold',
    color: '#F9FAFB',
  },
  filterButton: {
    width: responsiveFontSize(40),
    height: responsiveFontSize(40),
    borderRadius: responsiveFontSize(20),
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: responsivePadding.horizontal,
    marginBottom: responsivePadding.vertical * 0.5,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: isTablet() ? 16 : 12,
    gap: 12,
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
    paddingVertical: isTablet() ? 12 : 8,
    borderRadius: 20,
    backgroundColor: '#374151',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#3B82F6',
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
  activityCard: {
    marginBottom: 12,
    paddingVertical: getActivityCardPadding(),
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIcon: {
    width: isTablet() ? 40 : 32,
    height: isTablet() ? 40 : 32,
    borderRadius: isTablet() ? 20 : 16,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: isTablet() ? 16 : 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityDescription: {
    fontSize: responsiveFontSize(14),
    fontFamily: 'Inter-Regular',
    color: '#F9FAFB',
    marginBottom: 4,
    lineHeight: responsiveFontSize(20),
  },
  activityMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activityAction: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
    textTransform: 'capitalize',
  },
  activityTime: {
    fontSize: responsiveFontSize(12),
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
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
    lineHeight: responsiveFontSize(20),
  },
});