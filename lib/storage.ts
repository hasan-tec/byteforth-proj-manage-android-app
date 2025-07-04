import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Web-compatible storage wrapper
const storage = Platform.OS === 'web' 
  ? {
      async getItem(key: string): Promise<string | null> {
        if (typeof localStorage === 'undefined') return null;
        return localStorage.getItem(key);
      },
      async setItem(key: string, value: string): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(key, value);
      },
      async removeItem(key: string): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        localStorage.removeItem(key);
      },
      async getAllKeys(): Promise<string[]> {
        if (typeof localStorage === 'undefined') return [];
        return Object.keys(localStorage);
      },
      async clear(): Promise<void> {
        if (typeof localStorage === 'undefined') return;
        localStorage.clear();
      },
    }
  : AsyncStorage;

export const storeData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await storage.setItem(key, jsonValue);
  } catch (e) {
    console.error('Error storing data:', e);
  }
};

export const getData = async (key: string) => {
  try {
    const jsonValue = await storage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Error reading data:', e);
    return null;
  }
};

export const removeData = async (key: string) => {
  try {
    await storage.removeItem(key);
  } catch (e) {
    console.error('Error removing data:', e);
  }
};

export const getAllKeys = async () => {
  try {
    return await storage.getAllKeys();
  } catch (e) {
    console.error('Error getting all keys:', e);
    return [];
  }
};

export const clearAll = async () => {
  try {
    await storage.clear();
  } catch (e) {
    console.error('Error clearing storage:', e);
  }
};

// Offline data management
export const offlineStorage = {
  // Cache data with timestamp
  async cacheData(key: string, data: any, ttl: number = 3600000) { // 1 hour default TTL
    const cacheItem = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    await storeData(`cache_${key}`, cacheItem);
  },

  // Get cached data if not expired
  async getCachedData(key: string) {
    try {
      const cacheItem = await getData(`cache_${key}`);
      if (!cacheItem) return null;

      const { data, timestamp, ttl } = cacheItem;
      const isExpired = Date.now() - timestamp > ttl;
      
      if (isExpired) {
        await removeData(`cache_${key}`);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error getting cached data:', error);
      return null;
    }
  },

  // Queue operations for offline sync
  async queueOperation(operation: {
    type: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    id?: string;
  }) {
    try {
      const queue = await getData('offline_queue') || [];
      queue.push({
        ...operation,
        timestamp: Date.now(),
        id: operation.id || `temp_${Date.now()}_${Math.random()}`,
      });
      await storeData('offline_queue', queue);
    } catch (error) {
      console.error('Error queuing operation:', error);
    }
  },

  // Get queued operations
  async getQueuedOperations() {
    try {
      return await getData('offline_queue') || [];
    } catch (error) {
      console.error('Error getting queued operations:', error);
      return [];
    }
  },

  // Clear processed operations
  async clearQueuedOperations() {
    try {
      await removeData('offline_queue');
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  },

  // Remove specific operation from queue
  async removeQueuedOperation(operationId: string) {
    try {
      const queue = await getData('offline_queue') || [];
      const filteredQueue = queue.filter((op: any) => op.id !== operationId);
      await storeData('offline_queue', filteredQueue);
    } catch (error) {
      console.error('Error removing queued operation:', error);
    }
  },
};