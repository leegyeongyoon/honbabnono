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
import { COLORS, CSS_SHADOWS, TYPOGRAPHY, SPACING, BORDER_RADIUS, TRANSITIONS } from '../styles';
import { Icon } from '../components/Icon';
import chatService from '../services/chatService';
import chatApiService, { ChatRoom, ChatMessage } from '../services/chatApiService';
import { getDetailedDateFormat, getChatDateHeader, isSameDay } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';
import { useUserStore } from '../store/userStore';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';
import UnderlineTabBar from '../components/UnderlineTabBar';

import { ChatListSkeleton } from '../components/skeleton';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

// --- Hover-aware wrapper for header icon buttons ---
const WebHoverButton: React.FC<{
  borderRadius: number;
  children: React.ReactNode;
}> = ({ borderRadius, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: 'pointer',
        borderRadius,
        transition: `background-color ${TRANSITIONS.normal}`,
        backgroundColor: hovered ? COLORS.neutral.grey100 : 'transparent',
      }}
    >
      {children}
    </div>
  );
};

// --- Hover-aware send button wrapper ---
const WebSendButtonWrapper: React.FC<{
  enabled: boolean;
  children: React.ReactNode;
}> = ({ enabled, children }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        cursor: enabled ? 'pointer' : 'default',
        borderRadius: 20,
        transition: `all ${TRANSITIONS.normal}`,
        transform: hovered && enabled ? 'scale(1.05)' : 'scale(1)',
      }}
    >
      {children}
    </div>
  );
};

// --- Hover-aware chat list item ---
const WebChatListItem: React.FC<{
  item: ChatRoom;
  onSelect: (id: number) => void;
}> = ({ item, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const displayTitle = item.type === 'meetup' ? item.title : item.title;
  const participantCount = item.type === 'meetup' ? item.participants.length : undefined;
  const hasUnread = item.unreadCount > 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: hovered ? COLORS.neutral.light : hasUnread ? COLORS.primary.light : 'transparent',
        transition: `background-color ${TRANSITIONS.normal}`,
        cursor: 'pointer',
        borderBottom: `1px solid ${COLORS.neutral.grey100}`,
      }}
      role="button"
      aria-label={`${displayTitle} 채팅방${hasUnread ? `, 읽지 않은 메시지 ${item.unreadCount}개` : ''}`}
    >
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() => onSelect(item.id)}
        activeOpacity={0.7}
      >
        {/* 아바타 + 타입 뱃지 */}
        <div style={{ position: 'relative', marginRight: 14 }}>
          <View style={[styles.chatAvatar, { backgroundColor: getAvatarColor(displayTitle) }]}>
            <Text style={styles.chatAvatarText}>
              {getInitials(displayTitle)}
            </Text>
          </View>
          {/* 채팅방 타입 뱃지 */}
          <div style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: item.type === 'meetup' ? COLORS.primary.main : COLORS.neutral.grey400,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `2px solid ${COLORS.surface.primary}`,
          }}>
            <span style={{ fontSize: 10, lineHeight: '20px' }}>
              {item.type === 'meetup' ? '👥' : '💬'}
            </span>
          </div>
        </div>
        <View style={styles.chatInfo}>
          <View style={styles.chatTitleRow}>
            <Text style={[styles.chatTitle, hasUnread && styles.chatTitleUnread]} numberOfLines={1}>
              {displayTitle}
            </Text>
            {participantCount && (
              <View style={styles.chatParticipantBadge}>
                <Text style={styles.chatParticipantCount}>{participantCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]} numberOfLines={1}>
            {item.lastMessage || '아직 메시지가 없습니다'}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
            {getDetailedDateFormat(item.lastTime)}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>
                {item.unreadCount > 99 ? '99+' : item.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </div>
  );
};

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
  const [isSending, setIsSending] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(null);
  const [selectedUserForDM, setSelectedUserForDM] = useState<any>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const { toast, showError, hideToast } = useToast();
  const [messageInputFocused, setMessageInputFocused] = useState(false);
  const messageListRef = React.useRef<ScrollView>(null);

  const tabs = ['전체', '약속', '개인'];
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

  // 메시지 로드
  const loadMessages = async (roomId: number) => {
    try {
      const { chatRoom, messages: roomMessages } = await chatApiService.getChatMessages(roomId, userId);
      setCurrentChatRoom(chatRoom);
      setMessages(roomMessages);
    } catch (error) {
      // silently handle error
      showError('메시지를 불러올 수 없습니다.');
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
    if (!messageText.trim() || !selectedChatId || !currentChatRoom || isSending) {return;}

    const messageData = {
      message: messageText.trim(),
      senderId: userId,
      senderName: user?.name || '사용자',
    };

    try {
      setIsSending(true);

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

      // 스크롤 하단 이동
      setTimeout(() => {
        messageListRef.current?.scrollToEnd?.({ animated: true });
      }, 100);
    } catch (error) {
      // silently handle error
      showError('메시지를 전송할 수 없습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const renderChatList = () => {
    const filteredRooms = chatRooms.filter(room => {
      if (selectedTab === '전체') return true;
      if (selectedTab === '약속') return room.type === 'meetup';
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
          title={selectedTab === '개인' ? '1:1 채팅이 없어요' : '아직 채팅이 없어요'}
          description="밥약속에 참가하면 채팅이 시작돼요"
        />
      );
    }

    return (
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <WebChatListItem item={item} onSelect={selectChatRoom} />
        )}
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
        <WebHoverButton borderRadius={22}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              routerNavigation.goBack();
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <Icon name="chevron-left" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </WebHoverButton>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.chatRoomTitle}>
            {currentChatRoom?.title || '채팅'}
          </Text>
          {currentChatRoom?.type === 'meetup' && currentChatRoom.participants?.length > 0 && (
            <Text style={{ ...TYPOGRAPHY.caption, color: COLORS.text.tertiary, marginTop: 1 }}>
              참여자 {currentChatRoom.participants.length}명
            </Text>
          )}
        </View>
        <WebHoverButton borderRadius={22}>
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="메뉴">
            <Icon name="more-vertical" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </WebHoverButton>
      </View>

      {/* 메시지 목록 */}
      <ScrollView
        ref={messageListRef}
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
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '24px 0 16px',
                  gap: 12,
                }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: COLORS.neutral.grey100 }} />
                  <div style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: COLORS.text.tertiary,
                    backgroundColor: COLORS.neutral.white,
                    padding: '4px 14px',
                    whiteSpace: 'nowrap',
                    letterSpacing: 0.1,
                  }}>
                    {getChatDateHeader(message.timestamp)}
                  </div>
                  <div style={{ flex: 1, height: 1, backgroundColor: COLORS.neutral.grey100 }} />
                </div>
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
                      {!isSameSender && (
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
                      )}
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
                    <View style={styles.myMessageBubble}>
                      <Text style={[styles.messageText, styles.myMessageText]}>
                        {message.message}
                      </Text>
                    </View>
                    <View style={styles.myMessageMeta}>
                      <Text style={styles.readReceipt}>읽음</Text>
                      <Text style={[styles.messageTime, styles.myMessageTime]}>
                        {new Date(message.timestamp).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })}
                      </Text>
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
        <View style={styles.inputRow}>
          <View style={[
            styles.inputContainer,
            messageInputFocused && styles.inputContainerFocused as any,
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
          </View>
          <WebSendButtonWrapper enabled={!!messageText.trim() && !isSending}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                messageText.trim() && !isSending && styles.sendButtonActive,
              ]}
              onPress={sendMessage}
              disabled={!messageText.trim() || isSending}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="메시지 전송"
            >
              <Icon
                name="send"
                size={16}
                color={messageText.trim() && !isSending ? COLORS.text.white : COLORS.text.tertiary}
              />
            </TouchableOpacity>
          </WebSendButtonWrapper>
        </View>
      </View>
    </View>
  );

  // 채팅방이 선택된 경우 채팅방 UI 표시
  if (selectedChatId && currentChatRoom) {
    return renderChatRoom();
  }

  // UnderlineTabBar용 탭 아이템 생성
  const tabItems = tabs.map(tab => {
    const count = chatRooms.filter(r => {
      if (tab === '전체') return r.unreadCount > 0;
      if (tab === '약속') return r.type === 'meetup' && r.unreadCount > 0;
      return r.type === 'direct' && r.unreadCount > 0;
    }).length;
    return { key: tab, label: tab, badge: count || undefined };
  });

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.headerTitle}>채팅</Text>
          {chatRooms.filter(r => r.unreadCount > 0).length > 0 && (
            <View style={styles.headerUnreadBadge}>
              <Text style={styles.headerUnreadText}>
                {chatRooms.reduce((sum, r) => sum + r.unreadCount, 0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerIcons}>
          <WebHoverButton borderRadius={20}>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
              <Icon name="bell" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </WebHoverButton>
        </View>
      </View>

      {/* 탭 네비게이션 — UnderlineTabBar */}
      <UnderlineTabBar tabs={tabItems} activeKey={selectedTab} onTabChange={setSelectedTab} />

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
    backgroundColor: COLORS.neutral.white,
  },

  // === 채팅 리스트 헤더 ===
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.stickyHeader,
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
    color: COLORS.text.primary,
  },
  headerUnreadBadge: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerUnreadText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.neutral.white,
    lineHeight: 14,
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

  // === 채팅방 목록 ===
  chatList: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  chatListContainer: {
    paddingBottom: SPACING.xl,
  },
  chatListSkeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
    paddingTop: SPACING.md,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  chatAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  chatAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  chatInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: SPACING.sm,
  },
  chatTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  chatTitleUnread: {
    fontWeight: '700',
  },
  chatParticipantBadge: {
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  chatParticipantCount: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  lastMessage: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    lineHeight: 18,
  },
  lastMessageUnread: {
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 8,
    paddingTop: 2,
  },
  chatTime: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  chatTimeUnread: {
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.neutral.white,
    lineHeight: 14,
  },

  // === 빈 상태 / 로딩 ===
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
    backgroundColor: COLORS.neutral.white,
  },
  loadingText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
    backgroundColor: COLORS.neutral.white,
  },
  emptyText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // === 채팅방 내부 ===
  chatRoom: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey50,
  },
  chatRoomHeader: {
    minHeight: 56,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.stickyHeader,
    zIndex: 10,
  },
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRoomTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.neutral.grey50,
  },
  messageListContainer: {
    paddingHorizontal: 16,
    paddingVertical: SPACING.md,
  },
  messageItem: {
    marginBottom: SPACING.md,
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
    fontSize: 12,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // === 말풍선 ===
  messageBubble: {
    backgroundColor: COLORS.neutral.grey100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopLeftRadius: 4,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.text.primary,
  },
  myMessageText: {
    color: COLORS.neutral.white,
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
    gap: 6,
  },
  readReceipt: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },

  // === 메시지 입력 바 ===
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 4,
    height: 40,
    boxSizing: 'border-box',
    transition: 'background-color 200ms ease, box-shadow 200ms ease',
  },
  inputContainerFocused: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    // @ts-ignore — web CSS shadow for focused input
    boxShadow: CSS_SHADOWS.focused,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
    color: COLORS.text.primary,
    maxHeight: 80,
    paddingVertical: 0,
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'background-color 150ms ease',
  } as any,
  sendButtonActive: {
    backgroundColor: COLORS.primary.main,
  },

  // === 메시지 프로필 ===
  messageWithProfile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  profileImageContainer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  profileImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    resizeMode: 'cover',
  },
  defaultProfileImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  messageContentWrapper: {
    flex: 1,
  },
  riceIndex: {
    ...TYPOGRAPHY.caption,
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
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: 28,
    margin: 20,
    maxWidth: 360,
    width: '85%',
    // @ts-ignore — web CSS shadow for modal
    boxShadow: CSS_SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.h2,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.text.secondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.text.white,
  },
});

export default ChatScreen;
