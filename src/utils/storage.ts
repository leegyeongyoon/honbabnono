/**
 * Universal Storage Utility
 * Works on both React Native and Web platforms
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

class UniversalStorage {
  private isWeb = Platform.OS === 'web';

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage.getItem(key);
        }
        return null;
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      // silently handle error
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem(key, value);
        }
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      // silently handle error
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      if (this.isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.removeItem(key);
        }
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      // silently handle error
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.isWeb) {
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.clear();
        }
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      // silently handle error
    }
  }

  // Helper methods for JSON data
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const item = await this.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      // silently handle error
      return null;
    }
  }

  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      await this.setItem(key, JSON.stringify(value));
    } catch (error) {
      // silently handle error
    }
  }
}

// Create singleton instance
const storage = new UniversalStorage();

export default storage;