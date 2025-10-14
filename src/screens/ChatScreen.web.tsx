import React from 'react';
import {View, Text, StyleSheet, ScrollView, TouchableOpacity} from 'react-native';

const ChatScreen = () => {
  const chats = [
    {
      id: 1,
      title: '강남역 파스타 맛집 탐방',
      lastMessage: '네, 7시에 만나요!',
      time: '오후 3:25',
      unreadCount: 2,
      participants: ['김철수', '이영희', '박민수'],
    },
    {
      id: 2,
      title: '홍대 술집 호핑',
      lastMessage: '어떤 술집 가실래요?',
      time: '오후 2:15',
      unreadCount: 0,
      participants: ['최영진', '서미영'],
    },
    {
      id: 3,
      title: '신촌 브런치 모임',
      lastMessage: '사진 올려주세요~',
      time: '오후 1:30',
      unreadCount: 5,
      participants: ['김민지', '이준호', '박소연', '정다은'],
    },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <Text style={styles.headerSubtitle}>
          진행 중인 모임 {chats.length}개
        </Text>
      </View>

      <ScrollView style={styles.chatList}>
        {chats.map(chat => (
          <TouchableOpacity key={chat.id} style={styles.chatItem}>
            <View style={styles.chatAvatar}>
              <Text style={styles.avatarText}>
                {chat.participants.length}명
              </Text>
            </View>
            <View style={styles.chatContent}>
              <View style={styles.chatHeader}>
                <Text style={styles.chatTitle} numberOfLines={1}>
                  {chat.title}
                </Text>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </View>
              <Text style={styles.participants} numberOfLines={1}>
                {chat.participants.join(', ')}
              </Text>
              <Text style={styles.lastMessage} numberOfLines={1}>
                {chat.lastMessage}
              </Text>
            </View>
            {chat.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{chat.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  chatTime: {
    fontSize: 12,
    color: '#999',
  },
  participants: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default ChatScreen;