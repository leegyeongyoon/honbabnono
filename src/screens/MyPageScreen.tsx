import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';

const MyPageScreen = () => {
  const menuItems = [
    {id: 1, title: '내 모임 관리', icon: '👥', hasNotification: true},
    {id: 2, title: '찜한 모임', icon: '❤️', hasNotification: false},
    {id: 3, title: '리뷰 관리', icon: '⭐', hasNotification: false},
    {id: 4, title: '결제 내역', icon: '💳', hasNotification: false},
    {id: 5, title: '설정', icon: '⚙️', hasNotification: false},
    {id: 6, title: '고객센터', icon: '💬', hasNotification: false},
  ];

  const stats = [
    {label: '참여한 모임', value: '12회'},
    {label: '개설한 모임', value: '3회'},
    {label: '받은 리뷰', value: '4.8점'},
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <Image
          source={{
            uri: 'https://via.placeholder.com/100x100/007AFF/ffffff?text=👤',
          }}
          style={styles.profileImage}
        />
        <View style={styles.profileInfo}>
          <Text style={styles.userName}>김혼밥</Text>
          <Text style={styles.userLevel}>🌟 믿음직한 밥친구</Text>
          <Text style={styles.userDescription}>
            맛있는 음식과 좋은 사람들을 사랑해요!
          </Text>
        </View>
        <TouchableOpacity style={styles.editButton}>
          <Text style={styles.editButtonText}>편집</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsSection}>
        {stats.map((stat, index) => (
          <View key={index} style={styles.statItem}>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.achievementSection}>
        <Text style={styles.sectionTitle}>🏆 내 뱃지</Text>
        <View style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>🍝</Text>
            <Text style={styles.badgeText}>파스타 러버</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>🍻</Text>
            <Text style={styles.badgeText}>소주 한 잔</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>👑</Text>
            <Text style={styles.badgeText}>모임왕</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map(item => (
          <TouchableOpacity key={item.id} style={styles.menuItem}>
            <View style={styles.menuLeft}>
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuTitle}>{item.title}</Text>
            </View>
            <View style={styles.menuRight}>
              {item.hasNotification && <View style={styles.notificationDot} />}
              <Text style={styles.menuArrow}>›</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userLevel: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  userDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  editButton: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  editButtonText: {
    fontSize: 14,
    color: '#333',
  },
  statsSection: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  achievementSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badge: {
    alignItems: 'center',
    padding: 10,
  },
  badgeEmoji: {
    fontSize: 30,
    marginBottom: 8,
  },
  badgeText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
  },
  menuTitle: {
    fontSize: 16,
    color: '#333',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    marginRight: 10,
  },
  menuArrow: {
    fontSize: 20,
    color: '#ccc',
  },
  logoutButton: {
    backgroundColor: '#fff',
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  logoutText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});

export default MyPageScreen;