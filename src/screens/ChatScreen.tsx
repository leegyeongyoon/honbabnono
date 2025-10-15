import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { useRoute } from '@react-navigation/native';

interface ChatMessage {
  id: number;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: string;
  isCurrentUser: boolean;
}

const ChatScreen = () => {
  const route = useRoute();
  const { meetupId, meetupTitle } = route.params as { meetupId: number; meetupTitle: string };
  
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      senderId: 'host',
      senderName: '김혼밥',
      message: '안녕하세요! 모임에 참여해주셔서 감사합니다 😊',
      timestamp: '14:20',
      isCurrentUser: false,
    },
    {
      id: 2,
      senderId: 'host',
      senderName: '김혼밥',
      message: '강남역 2번 출구 앞 스타벅스에서 만나면 될까요?',
      timestamp: '14:21',
      isCurrentUser: false,
    },
    {
      id: 3,
      senderId: 'user2',
      senderName: '이식사',
      message: '네! 좋습니다',
      timestamp: '14:22',
      isCurrentUser: false,
    },
    {
      id: 4,
      senderId: 'current',
      senderName: '나',
      message: '저도 참여하겠습니다!',
      timestamp: '14:23',
      isCurrentUser: true,
    },
  ]);

  const sendMessage = () => {
    if (message.trim()) {
      const newMessage: ChatMessage = {
        id: messages.length + 1,
        senderId: 'current',
        senderName: '나',
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString('ko-KR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        isCurrentUser: true,
      };
      
      setMessages([...messages, newMessage]);
      setMessage('');
    }
  };

  const renderMessage = (msg: ChatMessage) => {
    if (msg.isCurrentUser) {
      return (
        <View key={msg.id} style={styles.myMessageContainer}>
          <View style={styles.myMessageBubble}>
            <Text style={styles.myMessageText}>{msg.message}</Text>
            <Text style={styles.myMessageTime}>{msg.timestamp}</Text>
          </View>
        </View>
      );
    }

    return (
      <View key={msg.id} style={styles.otherMessageContainer}>
        <Image 
          source={{ uri: `https://via.placeholder.com/40x40/F5CB76/ffffff?text=${msg.senderName.charAt(0)}` }}
          style={styles.senderAvatar}
        />
        <View style={styles.otherMessageContent}>
          <Text style={styles.senderName}>{msg.senderName}</Text>
          <View style={styles.otherMessageBubble}>
            <Text style={styles.otherMessageText}>{msg.message}</Text>
            <Text style={styles.otherMessageTime}>{msg.timestamp}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* 채팅 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{meetupTitle || '모임 채팅'}</Text>
          <Text style={styles.headerSubtitle}>모임 채팅방 · 참여자 4명</Text>
        </View>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* 안전 공지 */}
      <View style={styles.safetyNotice}>
        <Text style={styles.safetyIcon}>🛡️</Text>
        <Text style={styles.safetyText}>
          안전한 모임을 위해 개인정보 공유를 주의하고, 불편한 상황 시 신고해주세요
        </Text>
      </View>

      {/* 메시지 목록 */}
      <ScrollView style={styles.messagesContainer} showsVerticalScrollIndicator={false}>
        {messages.map(renderMessage)}
      </ScrollView>

      {/* 메시지 입력 */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          placeholder="메시지를 입력하세요..."
          value={message}
          onChangeText={setMessage}
          multiline
          maxLength={500}
        />
        <TouchableOpacity 
          style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!message.trim()}
        >
          <Text style={styles.sendButtonText}>전송</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    ...SHADOWS.small,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  moreButton: {
    padding: 8,
  },
  moreButtonText: {
    fontSize: 20,
    color: COLORS.text.secondary,
  },
  safetyNotice: {
    backgroundColor: COLORS.secondary.light,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary.main,
  },
  safetyIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  safetyText: {
    fontSize: 12,
    color: COLORS.text.secondary,
    flex: 1,
    lineHeight: 16,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  myMessageContainer: {
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    ...SHADOWS.small,
  },
  myMessageText: {
    fontSize: 16,
    color: COLORS.text.white,
    lineHeight: 20,
  },
  myMessageTime: {
    fontSize: 11,
    color: COLORS.text.white,
    opacity: 0.8,
    marginTop: 4,
    textAlign: 'right',
  },
  otherMessageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  senderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  otherMessageContent: {
    flex: 1,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 4,
    marginLeft: 4,
  },
  otherMessageBubble: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxWidth: '80%',
    ...SHADOWS.small,
  },
  otherMessageText: {
    fontSize: 16,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  otherMessageTime: {
    fontSize: 11,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  inputContainer: {
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    ...SHADOWS.small,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
    color: COLORS.text.primary,
    backgroundColor: COLORS.neutral.background,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 10,
    ...SHADOWS.small,
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.neutral.grey300,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default ChatScreen;