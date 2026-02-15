import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, SHADOWS, CSS_SHADOWS, LAYOUT } from '../styles/colors';
import { SPACING } from '../styles/spacing';
import { Icon } from '../components/Icon';
import chatService from '../services/chatService';
import chatApiService, { ChatRoom, ChatMessage } from '../services/chatApiService';
import { getDetailedDateFormat, getChatDateHeader, isSameDay } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';
import { useUserStore } from '../store/userStore';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';
import { FadeIn } from '../components/animated';
import { ChatListSkeleton } from '../components/skeleton';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

interface ChatScreenProps {
  navigation?: any;
  user?: any;
}

const ChatScreen: React.FC<ChatScreenProps> = ({ navigation }) => {
  const navigate = useNavigate();
  const routerNavigation = useRouterNavigation();
  const { id: chatIdFromUrl } = useParams<{ id?: string }>();
  const { user } = useUserStore();
  
  const [selectedTab, setSelectedTab] = useState('전체');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(
    chatIdFromUrl ? parseInt(chatIdFromUrl) : null
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(null);
  const [selectedUserForDM, setSelectedUserForDM] = useState<any>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const { toast, showError, hideToast } = useToast();
  const [messageInputFocused, setMessageInputFocused] = useState(false);

  const tabs = ['전체', '모임', '개인'];
  const userId = user?.id?.toString() || '';

  // 1대1 채팅 권한 체크
  const checkDirectChatPermission = async (targetUserId: string) => {
    try {
      const meetupId = currentChatRoom?.meetupId;
      const response = await fetch(`${chatApiService.baseURL}/check-direct-chat-permission?currentUserId=${userId}&targetUserId=${targetUserId}&meetupId=${meetupId || ''}`);
      const data = await response.json();
      return data.data || { allowed: false };
    } catch (error) {
      // silently handle error
      return { allowed: false };
    }
  };

  // 1대1 채팅 시작
  const startDirectChat = async (targetUser: any) => {
    try {
      const permission = await checkDirectChatPermission(targetUser.id);
      if (!permission.allowed) {
        showError('1대1 채팅을 시작할 수 없습니다.');
        return;
      }

      const response = await chatApiService.createDirectChatRoom({
        participantId: targetUser.id,
        participantName: targetUser.name,
        userId,
        userName: user?.name || '사용자',
        meetupId: currentChatRoom?.meetupId
      });

      if (response.success) {
        setSelectedChatId(response.data.id);
        setShowDMModal(false);
        await loadMessages(response.data.id);
      } else {
        showError(response.message || '1대1 채팅방을 생성할 수 없습니다.');
      }
    } catch (error) {
      // silently handle error
      showError('1대1 채팅을 시작할 수 없습니다.');
    }
  };

  // 사용자 프로필 클릭 핸들러
  const handleUserProfileClick = async (message: ChatMessage) => {
    if (message.senderId === userId) {return;} // 자기 자신은 클릭 불가

    const permission = await checkDirectChatPermission(message.senderId);
    if (permission.allowed) {
      setSelectedUserForDM({
        id: message.senderId,
        name: message.senderName
      });
      setShowDMModal(true);
    }
  };

  // 컴포넌트 마운트 시 WebSocket 연결
  useEffect(() => {
    chatService.offNewMessage();
    chatService.connect();
    chatService.onNewMessage(handleNewMessage);

    return () => {
      chatService.offNewMessage();
      if (selectedChatId) {
        chatService.leaveRoom(selectedChatId);
      }
    };
  }, []);

  // 유저 정보가 준비되면 채팅방 목록 로드
  useEffect(() => {
    if (userId) {
      loadChatRooms();
    }
  }, [userId]);

  // URL에서 채팅방 ID가 있으면 해당 채팅방 로드 (userId 의존성 추가)
  useEffect(() => {
    if (!userId) return;

    if (chatIdFromUrl) {
      const roomId = parseInt(chatIdFromUrl);

      // 이미 선택된 채팅방이면 중복 호출 방지
      if (selectedChatId === roomId && currentChatRoom) {
        return;
      }

      selectChatRoomFromUrl(roomId);
    } else if (!chatIdFromUrl && selectedChatId) {
      chatService.leaveRoom(selectedChatId);
      setSelectedChatId(null);
      setCurrentChatRoom(null);
      setMessages([]);
    }
  }, [chatIdFromUrl, userId]);

  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    try {
      setLoading(true);
      const rooms = await chatApiService.getChatRooms(userId);
      setChatRooms(rooms);
    } catch (error) {
      // silently handle error
      showError('채팅방 목록을 불러올 수 없습니다.');
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
      setLoading(true);
      
      // 이전 채팅방에서 나가기
      if (selectedChatId) {
        chatService.leaveRoom(selectedChatId);
      }

      // 새 채팅방 입장
      chatService.joinRoom(roomId);
      
      // 메시지 로드
      const { chatRoom, messages: roomMessages } = await chatApiService.getChatMessages(roomId, userId);
      
      setSelectedChatId(roomId);
      setCurrentChatRoom(chatRoom);
      setMessages(roomMessages);
      
      // 읽지 않은 메시지 수 초기화
      setChatRooms(prev => prev.map(room => 
        room.id === roomId ? { ...room, unreadCount: 0 } : room
      ));
      
      // 채팅방 읽음 처리 API 호출 (즉시 배지 제거)
      try {
        const response = await fetch(`${chatApiService.baseURL}/rooms/${roomId}/read`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        // silently handle read status
      } catch (error) {
        // silently handle error
      }
      
    } catch (error) {
      // silently handle error
      showError('채팅방을 열 수 없습니다.');
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
    if (!messageText.trim() || !selectedChatId || !currentChatRoom) {return;}

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
      // silently handle error
      showError('메시지를 전송할 수 없습니다.');
    }
  };

  const renderChatListItem = (item: ChatRoom) => {
    const displayTitle = item.type === 'meetup' ? item.title : item.title;
    const participantCount = item.type === 'meetup' ? item.participants.length : undefined;

    return (
      <div
        style={{ transition: 'background-color 150ms ease', cursor: 'pointer' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.light; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        role="button"
        aria-label={`${displayTitle} 채팅방${item.unreadCount > 0 ? `, 읽지 않은 메시지 ${item.unreadCount}개` : ''}`}
      >
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => selectChatRoom(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(displayTitle) }]}>
            <Text style={styles.chatAvatarText}>
              {getInitials(displayTitle)}
            </Text>
          </View>
          <View style={styles.chatInfo}>
            <View style={styles.chatTitleRow}>
              <Text style={styles.chatTitle} numberOfLines={1}>
                {displayTitle}
              </Text>
              {participantCount && (
                <Text style={styles.chatParticipantCount}>{participantCount}</Text>
              )}
            </View>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.lastMessage || '아직 메시지가 없습니다'}
            </Text>
          </View>
          <View style={styles.chatMeta}>
            <Text style={styles.chatTime}>
              {getDetailedDateFormat(item.lastTime)}
            </Text>
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </div>
    );
  };

  const renderChatList = () => {
    const filteredRooms = chatRooms.filter(room => {
      if (selectedTab === '전체') return true;
      if (selectedTab === '모임') return room.type === 'meetup';
      return room.type === 'direct';
    });

    if (loading) {
      return (
        <View style={styles.chatListSkeletonContainer}>
          {[1, 2, 3, 4, 5].map((i) => (
            <ChatListSkeleton key={i} />
          ))}
        </View>
      );
    }

    if (filteredRooms.length === 0) {
      return (
        <EmptyState
          icon="message-circle"
          iconSize={56}
          title={selectedTab === '개인' ? '1:1 채팅이 없어요' : '아직 대화가 없어요'}
          description="모임에 참여하고 대화를 시작해보세요!"
        />
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
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.chatRoomTitle}>
          {currentChatRoom?.title || '채팅'}
        </Text>
        <TouchableOpacity style={styles.menuButton} activeOpacity={0.7}>
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
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const isSameSender = prevMessage && prevMessage.senderId === message.senderId && !showDateHeader;
          const messageSpacing = isSameSender ? 4 : 12;

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
                style={[styles.messageItem, message.isMe && styles.myMessage, { marginBottom: messageSpacing }]}
              >
                {!message.isMe && (
                  <View style={styles.messageWithProfile}>
                    <TouchableOpacity
                      style={styles.profileImageContainer}
                      onPress={() => handleUserProfileClick(message)}
                      activeOpacity={0.7}
                    >
                      {message.profileImage ? (
                        <Image 
                          source={{ uri: message.profileImage }} 
                          style={styles.profileImage}
                        />
                      ) : (
                        <View style={styles.defaultProfileImage}>
                          <Text style={styles.defaultProfileText}>
                            {(message.senderName || '?').charAt(0)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.messageContentWrapper}>
                      <View style={styles.messageHeader}>
                        <TouchableOpacity onPress={() => handleUserProfileClick(message)} activeOpacity={0.7}>
                          <Text style={styles.senderName}>{message.senderName || '사용자'}</Text>
                        </TouchableOpacity>
                        {message.riceIndex && (
                          <Text style={styles.riceIndex}>
                            {message.riceIndex.level.emoji} {message.riceIndex.calculatedIndex}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.messageBubble]}>
                        <Text style={[styles.messageText]}>
                          {message.message}
                        </Text>
                      </View>
                      <Text style={[styles.messageTime]}>
                        {new Date(message.timestamp).toLocaleTimeString('ko-KR', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </Text>
                    </View>
                  </View>
                )}
                {message.isMe && (
                  <View>
                    <View style={[styles.messageBubble, styles.myMessageBubble]}>
                      <Text style={[styles.messageText, styles.myMessageText]}>
                        {message.message}
                      </Text>
                    </View>
                    <View style={styles.myMessageMeta}>
                      <Text style={[styles.messageTime, styles.myMessageTime]}>
                        {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Text>
                      <Text style={styles.readReceipt}>읽음</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* 메시지 입력 */}
      <View style={styles.messageInput}>
        <View style={[
          styles.inputContainer,
          messageInputFocused && {
            backgroundColor: COLORS.neutral.white,
            borderWidth: 1,
            borderColor: COLORS.primary.main,
            boxShadow: CSS_SHADOWS.focused,
          } as any,
        ]}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={COLORS.text.tertiary}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            onFocus={() => setMessageInputFocused(true)}
            onBlur={() => setMessageInputFocused(false)}
          />
          <TouchableOpacity
            style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
            onPress={sendMessage}
            disabled={!messageText.trim()}
            activeOpacity={0.7}
          >
            <Icon
              name="send"
              size={18}
              color={messageText.trim() ? COLORS.text.white : COLORS.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // 채팅방이 선택된 경우 채팅방 UI 표시
  if (selectedChatId && currentChatRoom) {
    return renderChatRoom();
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>채팅</Text>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
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
            activeOpacity={0.7}
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

      {/* 1대1 채팅 시작 모달 */}
      {showDMModal && selectedUserForDM && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedUserForDM.name}님과 1대1 채팅</Text>
            <Text style={styles.modalDescription}>
              {selectedUserForDM.name}님과 개인적인 대화를 나누시겠습니까?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={() => setShowDMModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => startDirectChat(selectedUserForDM)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonConfirmText}>채팅 시작</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
    </View>
  );
};

const styles = StyleSheet.create({
  // === 전체 컨테이너 ===
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },

  // === 채팅 리스트 헤더 ===
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 52,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.text.primary,
    letterSpacing: -0.3,
  },
  headerIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // === 탭 네비게이션 (pill 칩 스타일) ===
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTabButton: {
    backgroundColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },

  // === 채팅방 목록 ===
  chatList: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  chatListContainer: {
    paddingBottom: 20,
  },
  chatListSkeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    paddingTop: 8,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.neutral.white,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey100,
  },
  chatAvatarText: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  chatParticipantCount: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  lastMessage: {
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: COLORS.functional.error,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 7,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text.white,
  },

  // === 빈 상태 / 로딩 ===
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

  // === 채팅방 내부 ===
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
    paddingHorizontal: 8,
    ...SHADOWS.small,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // === 메시지 목록 ===
  messageList: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  messageListContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  messageItem: {
    marginBottom: 12,
    maxWidth: '75%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 13,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // === 말풍선 ===
  messageBubble: {
    backgroundColor: COLORS.neutral.white,
    padding: 14,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...SHADOWS.small,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.text.white,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 4,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  myMessageMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  readReceipt: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },

  // === 메시지 입력 바 ===
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    height: 64,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 22,
    paddingLeft: 18,
    paddingRight: 4,
    height: 44,
    width: '100%',
    boxSizing: 'border-box',
    borderWidth: 1,
    borderColor: 'transparent',
    transition: 'border-color 150ms ease, box-shadow 150ms ease',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary.main,
  },

  // === 날짜 구분선 ===
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text.secondary,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    textAlign: 'center',
    overflow: 'hidden',
    ...SHADOWS.small,
  },

  // === 메시지 프로필 ===
  messageWithProfile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileImageContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  defaultProfileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  messageContentWrapper: {
    flex: 1,
  },
  riceIndex: {
    fontSize: 11,
    color: COLORS.primary.main,
    marginLeft: 8,
    fontWeight: '600',
  },

  // === DM 모달 ===
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 20,
    padding: 28,
    margin: 20,
    maxWidth: 360,
    width: '85%',
    ...SHADOWS.large,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default ChatScreen;