import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { COLORS, SHADOWS } from '../../styles/colors';
import { Icon } from '../Icon';
import MeetupCard from '../MeetupCard';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack: () => void;
}

const UniversalWishlistScreen: React.FC<{navigation: NavigationAdapter, user?: any}> = ({ navigation, user }) => {
  const [wishlistMeetups, setWishlistMeetups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getApiUrl = () => process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const fetchWishlist = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/user/wishlist`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      setWishlistMeetups(data.meetups || []);
    } catch (error) {
      console.error('찜한 모임 조회 실패:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchWishlist(); }, [fetchWishlist]);

  const removeFromWishlist = async (meetupId: string) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      await fetch(`${getApiUrl()}/user/wishlist/${meetupId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setWishlistMeetups(prev => prev.filter(m => m.id !== meetupId));
    } catch (error) {
      console.error('찜 해제 실패:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>찜한 모임</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>찜한 모임</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchWishlist();}} />}
      >
        {wishlistMeetups.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 80 }}>
            <Icon name="heart" size={48} color={COLORS.text.tertiary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: COLORS.text.primary, marginTop: 16 }}>
              찜한 모임이 없습니다
            </Text>
          </View>
        ) : (
          <View style={{ padding: 16 }}>
            {wishlistMeetups.map(meetup => (
              <View key={meetup.id} style={styles.wishlistItem}>
                <MeetupCard
                  meetup={meetup}
                  onPress={() => navigation.navigate('MeetupDetail', { meetupId: meetup.id })}
                />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => removeFromWishlist(meetup.id)}
                >
                  <Icon name="x" size={16} color={COLORS.functional.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.neutral.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: COLORS.neutral.white, ...SHADOWS.small,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text.primary },
  wishlistItem: { position: 'relative', marginBottom: 12 },
  removeButton: {
    position: 'absolute', top: 8, right: 8, backgroundColor: COLORS.neutral.white,
    borderRadius: 12, padding: 4, ...SHADOWS.small,
  },
});

export default UniversalWishlistScreen;