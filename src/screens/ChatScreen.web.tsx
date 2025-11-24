import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SHADOWS, LAYOUT } from '../styles/colors';
import { Icon } from '../components/Icon';
import chatService from '../services/chatService';
import chatApiService, { ChatRoom, ChatMessage } from '../services/chatApiService';
import { getDetailedDateFormat, getChatDateHeader, isSameDay } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';

interface ChatScreenProps {
  navigation?: any;
  user?: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, user }) => {
  const navigate = useNavigate();
  const routerNavigation = useRouterNavigation();
  const { id: chatIdFromUrl } = useParams<{ id?: string }>();
  
  const [selectedTab, setSelectedTab] = useState('모임채팅');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(
    chatIdFromUrl ? parseInt(chatIdFromUrl) : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(null);

  const tabs = ['모임채팅', '1:1채팅'];
  const userId = user?.id || 'user1';

  // 컴포넌트 마운트 시 WebSocket 연결 및 채팅방 목록 로드
  useEffect(() => {
    // 기존 리스너 제거
    chatService.offNewMessage();
    
    // WebSocket 연결
    chatService.connect();
    
    // 채팅방 목록 로드
    loadChatRooms();

    // 실시간 메시지 수신 설정
    chatService.onNewMessage(handleNewMessage);

    // 정리 함수
    return () => {
      chatService.offNewMessage();
      if (selectedChatId) {
        chatService.leaveRoom(selectedChatId);
      }
    };
  }, []);

  // URL에서 채팅방 ID가 있으면 해당 채팅방 로드
  useEffect(() => {
    console.log('🔍 useEffect 실행:', { chatIdFromUrl, loading, selectedChatId });
    
    if (chatIdFromUrl) {
      const roomId = parseInt(chatIdFromUrl);
      
      // 이미 선택된 채팅방이면 중복 호출 방지
      if (selectedChatId === roomId && currentChatRoom) {
        console.log('🔍 이미 로드된 채팅방:', roomId);
        return;
      }
      
      console.log('🔍 URL에서 채팅방 ID 감지, 강제 로드:', roomId);
      selectChatRoomFromUrl(roomId);
    } else if (!chatIdFromUrl && selectedChatId) {
      console.log('🔍 URL에 채팅방 ID 없음, 목록으로 돌아가기');
      if (selectedChatId) {
        chatService.leaveRoom(selectedChatId);
      }
      setSelectedChatId(null);
      setCurrentChatRoom(null);
      setMessages([]);
    }
  }, [chatIdFromUrl]);

  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const rooms = await chatApiService.getChatRooms(userId);
      setChatRooms(rooms);
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error);
      Alert.alert('오류', '채팅방 목록을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 실시간 메시지 수신 처리
  const handleNewMessage = (newMessage: ChatMessage) => {
    if (selectedChatId === newMessage.chatRoomId) {
      setMessages(prev => [...prev, newMessage]);
    }
    
    // 채팅방 목록의 마지막 메시지 업데이트
    setChatRooms(prev => prev.map(room => 
      room.id === newMessage.chatRoomId 
        ? { 
            ...room, 
            lastMessage: newMessage.message, 
            lastTime: newMessage.timestamp,
            unreadCount: selectedChatId === newMessage.chatRoomId ? room.unreadCount : room.unreadCount + 1
          }
        : room
    ));
  };

  // URL에서 채팅방 로드 (navigate 호출 없음)
  const selectChatRoomFromUrl = async (roomId: number) => {
    try {
      console.log('🔍 selectChatRoomFromUrl 시작:', roomId);
      setLoading(true);
      
      // 이전 채팅방에서 나가기
      if (selectedChatId) {
        chatService.leaveRoom(selectedChatId);
      }

      // 새 채팅방 입장
      chatService.joinRoom(roomId);
      
      console.log('🔍 API 호출 시작: getChatMessages');
      // 메시지 로드
      const { chatRoom, messages: roomMessages } = await chatApiService.getChatMessages(roomId, userId);
      
      console.log('🔍 API 호출 완료, 채팅방:', chatRoom?.title, '메시지 수:', roomMessages?.length);
      
      setSelectedChatId(roomId);
      setCurrentChatRoom(chatRoom);
      setMessages(roomMessages);
      
      // 읽지 않은 메시지 수 초기화
      setChatRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, unreadCount: 0 } : room
      ));
      
      console.log('🔍 상태 설정 완료, selectedChatId:', roomId, 'currentChatRoom:', chatRoom?.title);
    } catch (error) {
      console.error('채팅방 선택 실패:', error);
      Alert.alert('오류', '채팅방을 열 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 채팅방 선택 (사용자 클릭 시)
  const selectChatRoom = async (roomId: number) => {
    // URL 변경
    navigate(`/chat/${roomId}`);
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChatId || !currentChatRoom) return;

    const messageData = {
      message: messageText.trim(),
      senderId: userId,
      senderName: user?.name || '사용자',
    };

    try {
      // API로 메시지 전송
      const sentMessage = await chatApiService.sendMessage(selectedChatId, messageData, userId);
      
      // 로컬 상태에 메시지 추가
      setMessages(prev => [...prev, sentMessage]);
      
      // WebSocket으로 실시간 전송
      chatService.sendMessage({
        roomId: selectedChatId,
        message: messageText.trim(),
        senderId: userId,
        senderName: user?.name || '사용자',
      });

      // 채팅방 목록의 마지막 메시지 업데이트
      setChatRooms(prev => prev.map(room => 
        room.id === selectedChatId 
          ? { ...room, lastMessage: messageText.trim(), lastTime: sentMessage.timestamp }
          : room
      ));

      setMessageText('');
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      Alert.alert('오류', '메시지를 전송할 수 없습니다.');
    }
  };

  const renderChatListItem = (item: ChatRoom) => {
    const displayTitle = item.type === 'meetup' ? item.title : item.title;
    const participantCount = item.type === 'meetup' ? item.participants.length : undefined;
    
    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => selectChatRoom(item.id)}
      >
        <View style={styles.chatAvatar}>
          <Text style={styles.chatAvatarText}>
            {displayTitle.charAt(0)}
          </Text>
        </View>
        <View style={styles.chatInfo}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '아직 메시지가 없습니다'}
          </Text>
          <Text style={styles.chatTime}>
            {getDetailedDateFormat(item.lastTime)}
            {participantCount && item.lastTime ? ' • ' : ''}
            {participantCount ? `${participantCount}명` : ''}
          </Text>
        </View>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderChatList = () => {
    const filteredRooms = chatRooms.filter(room => 
      selectedTab === '모임채팅' ? room.type === 'meetup' : room.type === 'direct'
    );

    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>채팅방을 불러오는 중...</Text>
        </View>
      );
    }

    if (filteredRooms.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {selectedTab === '모임채팅' ? '참여한 모임이 없습니다' : '1:1 채팅이 없습니다'}
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderChatListItem(item)}
        style={styles.chatList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatListContainer}
        refreshing={loading}
        onRefresh={loadChatRooms}
      />
    );
  };

  // 채팅방 내부 UI
  const renderChatRoom = () => (
    <View style={styles.chatRoom}>
      {/* 채팅 헤더 */}
      <View style={styles.chatRoomHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            routerNavigation.goBack();
          }}
        >
          <Icon name="chevron-left" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.chatRoomTitle}>
          {currentChatRoom?.title || '채팅'}
        </Text>
        <TouchableOpacity style={styles.menuButton}>
          <Icon name="more-vertical" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 메시지 목록 */}
      <ScrollView 
        style={styles.messageList} 
        contentContainerStyle={styles.messageListContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message, index) => {
          // 이전 메시지와 날짜가 다르면 날짜 헤더 표시
          const showDateHeader = index === 0 || !isSameDay(messages[index - 1].timestamp, message.timestamp);
          
          return (
            <View key={message.id}>
              {showDateHeader && (
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>
                    {getChatDateHeader(message.timestamp)}
                  </Text>
                </View>
              )}
              <View
                style={[styles.messageItem, message.isMe && styles.myMessage]}
              >
                {!message.isMe && (
                  <View style={styles.messageHeader}>
                    <Text style={styles.senderName}>{message.senderName}</Text>
                  </View>
                )}
                <View style={[styles.messageBubble, message.isMe && styles.myMessageBubble]}>
                  <Text style={[styles.messageText, message.isMe && styles.myMessageText]}>
                    {message.message}
                  </Text>
                </View>
                <Text style={[styles.messageTime, message.isMe && styles.myMessageTime]}>
                  {new Date(message.timestamp).toLocaleTimeString('ko-KR', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    hour12: true 
                  })}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 메시지 입력 */}
      <View style={styles.messageInput}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요..."
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
          >
            <Icon 
              name="send" 
              size={18} 
              color={messageText.trim() ? COLORS.text.white : COLORS.text.secondary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // 채팅방이 선택된 경우 채팅방 UI 표시
  console.log('🔍 렌더링 조건 체크:', { selectedChatId, currentChatRoom: currentChatRoom?.title, loading });
  if (selectedChatId && currentChatRoom) {
    console.log('🔍 채팅방 UI 렌더링');
    return renderChatRoom();
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="search" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Icon name="bell" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tabButton,
              selectedTab === tab && styles.selectedTabButton
            ]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[
              styles.tabButtonText,
              selectedTab === tab && styles.selectedTabButtonText
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 채팅 목록 */}
      {renderChatList()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    height: 60,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  headerIcon: {
    padding: 8,
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  selectedTabButton: {
    borderBottomColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  selectedTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  chatListContainer: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 4,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.neutral.white,
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: COLORS.neutral.white,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  chatRoom: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  chatRoomHeader: {
    height: 60,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey200,
  },
  backButton: {
    padding: 8,
  },
  chatRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
  },
  messageList: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  messageListContainer: {
    padding: 16,
  },
  messageItem: {
    marginBottom: 16,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageHeader: {
    marginBottom: 4,
  },
  senderName: {
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  messageBubble: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.text.white,
  },
  messageTime: {
    fontSize: 10,
    color: COLORS.text.secondary,
    marginTop: 4,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    padding: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary.main,
  },
  dateHeader: {
    alignItems: 'center',
    marginVertical: 20,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    textAlign: 'center',
  },
});

export default ChatScreen;