import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { supabase, dbHelpers } from './supabase';
import { offlineStorage } from './storage';

// Network state management
let isOnline = true;
let networkListeners: ((isOnline: boolean) => void)[] = [];

// Initialize network monitoring (mobile only)
export const initializeNetworkMonitoring = () => {
  if (Platform.OS === 'web') {
    // Web network monitoring
    const updateOnlineStatus = () => {
      const wasOnline = isOnline;
      isOnline = navigator.onLine;
      
      if (wasOnline !== isOnline) {
        networkListeners.forEach(listener => listener(isOnline));
        if (isOnline) {
          syncOfflineData();
        }
      }
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  } else {
    // Mobile network monitoring
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      isOnline = state.isConnected ?? false;
      
      if (wasOnline !== isOnline) {
        networkListeners.forEach(listener => listener(isOnline));
        if (isOnline) {
          syncOfflineData();
        }
      }
    });

    return unsubscribe;
  }
};

export const addNetworkListener = (listener: (isOnline: boolean) => void) => {
  networkListeners.push(listener);
  
  return () => {
    networkListeners = networkListeners.filter(l => l !== listener);
  };
};

export const getNetworkStatus = () => isOnline;

// Offline data synchronization
export const syncOfflineData = async () => {
  if (!isOnline) return;

  try {
    const queuedOperations = await offlineStorage.getQueuedOperations();
    
    for (const operation of queuedOperations) {
      try {
        await processQueuedOperation(operation);
        await offlineStorage.removeQueuedOperation(operation.id);
      } catch (error) {
        console.error('Failed to sync operation:', operation, error);
        // Keep failed operations in queue for retry
      }
    }
  } catch (error) {
    console.error('Error syncing offline data:', error);
  }
};

const processQueuedOperation = async (operation: any) => {
  const { type, table, data, id } = operation;

  switch (table) {
    case 'projects':
      if (type === 'create') {
        await dbHelpers.createProject(data);
      } else if (type === 'update') {
        await dbHelpers.updateProject(id, data);
      } else if (type === 'delete') {
        await dbHelpers.deleteProject(id);
      }
      break;

    case 'milestones':
      if (type === 'create') {
        await dbHelpers.createMilestone(data);
      } else if (type === 'update') {
        await dbHelpers.updateMilestone(id, data);
      }
      break;

    case 'outsourcing':
      if (type === 'create') {
        await dbHelpers.createOutsourcing(data);
      } else if (type === 'update') {
        await dbHelpers.updateOutsourcing(id, data);
      }
      break;

    case 'payments':
      if (type === 'create') {
        await dbHelpers.createPayment(data);
      } else if (type === 'update') {
        await dbHelpers.updatePayment(id, data);
      }
      break;

    default:
      console.warn('Unknown table for sync operation:', table);
  }
};

// Offline-aware CRUD operations
export const offlineAwareOperations = {
  async createProject(projectData: any) {
    if (isOnline) {
      return await dbHelpers.createProject(projectData);
    } else {
      await offlineStorage.queueOperation({
        type: 'create',
        table: 'projects',
        data: projectData,
      });
      
      // Return optimistic result
      const tempProject = {
        ...projectData,
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      // Cache optimistically
      const cachedProjects = await offlineStorage.getCachedData('projects') || [];
      cachedProjects.unshift(tempProject);
      await offlineStorage.cacheData('projects', cachedProjects);
      
      return tempProject;
    }
  },

  async updateProject(projectId: string, updates: any) {
    if (isOnline) {
      return await dbHelpers.updateProject(projectId, updates);
    } else {
      await offlineStorage.queueOperation({
        type: 'update',
        table: 'projects',
        data: updates,
        id: projectId,
      });
      
      // Update cached data optimistically
      const cachedProjects = await offlineStorage.getCachedData('projects') || [];
      const updatedProjects = cachedProjects.map((project: any) =>
        project.id === projectId 
          ? { ...project, ...updates, updated_at: new Date().toISOString() }
          : project
      );
      await offlineStorage.cacheData('projects', updatedProjects);
      
      return updatedProjects.find((p: any) => p.id === projectId);
    }
  },

  async getProjects() {
    if (isOnline) {
      try {
        const projects = await dbHelpers.getProjects();
        await offlineStorage.cacheData('projects', projects);
        return projects;
      } catch (error) {
        console.warn('Failed to fetch projects online, using cache:', error);
        return await offlineStorage.getCachedData('projects') || [];
      }
    } else {
      return await offlineStorage.getCachedData('projects') || [];
    }
  },

  // Similar patterns for other entities...
  async createMilestone(milestoneData: any) {
    if (isOnline) {
      return await dbHelpers.createMilestone(milestoneData);
    } else {
      await offlineStorage.queueOperation({
        type: 'create',
        table: 'milestones',
        data: milestoneData,
      });
      
      const tempMilestone = {
        ...milestoneData,
        id: `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const cachedMilestones = await offlineStorage.getCachedData('milestones') || [];
      cachedMilestones.unshift(tempMilestone);
      await offlineStorage.cacheData('milestones', cachedMilestones);
      
      return tempMilestone;
    }
  },

  async getMilestones(projectId?: string) {
    const cacheKey = projectId ? `milestones_${projectId}` : 'milestones';
    
    if (isOnline) {
      try {
        const milestones = await dbHelpers.getMilestones(projectId);
        await offlineStorage.cacheData(cacheKey, milestones);
        return milestones;
      } catch (error) {
        console.warn('Failed to fetch milestones online, using cache:', error);
        return await offlineStorage.getCachedData(cacheKey) || [];
      }
    } else {
      return await offlineStorage.getCachedData(cacheKey) || [];
    }
  },
};