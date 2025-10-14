import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import {useTypedNavigation} from '../hooks/useWebNavigation';

const HomeScreen = () => {
  const navigation = useTypedNavigation();
  
  const meetups = [
    {
      id: 1,
      title: '강남역 파스타 맛집 탐방',
      location: '강남역',
      time: '오늘 7:00 PM',
      participants: 3,
      maxParticipants: 4,
      image: 'https://via.placeholder.com/300x200/FFB6C1/000000?text=Pasta',
    },
    {
      id: 2,
      title: '홍대 술집 호핑',
      location: '홍대입구역',
      time: '내일 8:00 PM',
      participants: 2,
      maxParticipants: 6,
      image: 'https://via.placeholder.com/300x200/98FB98/000000?text=Drinks',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>안녕하세요! 👋</Text>
        <Text style={styles.subtitle}>오늘은 누구와 함께 식사하실래요?</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 인기 모임</Text>
        {meetups.map(meetup => (
          <TouchableOpacity key={meetup.id} style={styles.meetupCard}>
            <Image source={{uri: meetup.image}} style={styles.meetupImage} />
            <View style={styles.meetupInfo}>
              <Text style={styles.meetupTitle}>{meetup.title}</Text>
              <Text style={styles.meetupLocation}>📍 {meetup.location}</Text>
              <Text style={styles.meetupTime}>🕐 {meetup.time}</Text>
              <Text style={styles.meetupParticipants}>
                👥 {meetup.participants}/{meetup.maxParticipants}명
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🍽️ 오늘의 추천</Text>
        <TouchableOpacity 
          style={styles.recommendationCard}
          onPress={() => navigation.navigateToSearch()}
        >
          <Text style={styles.recommendationTitle}>
            혼자 먹기 아까운 맛집들
          </Text>
          <Text style={styles.recommendationSubtitle}>
            함께 나누면 더 맛있어요!
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    marginBottom: 10,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  meetupCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  meetupImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  meetupInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  meetupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  meetupLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  meetupTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  meetupParticipants: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  recommendationCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  recommendationSubtitle: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
  },
});

export default HomeScreen;