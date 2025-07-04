import { Platform } from 'react-native';
import { supabase, dbHelpers } from './supabase';

// Platform-specific imports
let Notifications: any = null;
if (Platform.OS !== 'web') {
  try {
    Notifications = require('expo-notifications');
    
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (error) {
    console.warn('Expo Notifications not available');
  }
}

export const registerForPushNotifications = async () => {
  if (Platform.OS === 'web' || !Notifications) {
    console.log('Push notifications not supported on web');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    
    // Update user profile with push token
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        await dbHelpers.updateProfile(user.id, { push_token: token });
      } catch (error) {
        console.warn('Failed to update push token:', error);
      }
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
};

export const scheduleNotification = async (title: string, body: string, trigger?: any) => {
  if (Platform.OS === 'web' || !Notifications) {
    // Web fallback - could use browser notifications API
    if (Platform.OS === 'web' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
      } else if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          new Notification(title, { body });
        }
      }
    }
    return;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
      },
      trigger: trigger || null,
    });
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
};

export const cancelAllNotifications = async () => {
  if (Platform.OS === 'web' || !Notifications) return;
  
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('Error canceling notifications:', error);
  }
};

// Notification types for the app
export const notificationTypes = {
  MILESTONE_APPROVED: 'milestone_approved',
  MILESTONE_REJECTED: 'milestone_rejected',
  PAYMENT_DUE: 'payment_due',
  PAYMENT_OVERDUE: 'payment_overdue',
  TASK_ASSIGNED: 'task_assigned',
  TASK_COMPLETED: 'task_completed',
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
};

// Helper functions for specific notification types
export const sendMilestoneNotification = async (milestone: any, action: 'approved' | 'rejected') => {
  const title = `Milestone ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  const body = `"${milestone.name}" has been ${action}`;
  
  await scheduleNotification(title, body);
};

export const sendPaymentNotification = async (payment: any, type: 'due' | 'overdue') => {
  const title = type === 'due' ? 'Payment Due' : 'Payment Overdue';
  const body = `Payment to ${payment.recipient_name} is ${type}`;
  
  await scheduleNotification(title, body);
};

export const sendTaskNotification = async (task: any, action: 'assigned' | 'completed') => {
  const title = `Task ${action.charAt(0).toUpperCase() + action.slice(1)}`;
  const body = action === 'assigned' 
    ? `New task "${task.part_name}" assigned to ${task.person_name}`
    : `Task "${task.part_name}" has been completed`;
  
  await scheduleNotification(title, body);
};