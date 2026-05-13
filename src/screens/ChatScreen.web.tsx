import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
} from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { COLORS, CSS_SHADOWS, TYPOGRAPHY, SPACING, BORDER_RADIUS, TRANSITIONS, CARD_STYLE, HEADER_STYLE } from '../styles';
import { Icon } from '../components/Icon';
import chatService from '../services/chatService';
import chatApiService, { ChatRoom, ChatMessage } from '../services/chatApiService';
import { getChatDateHeader, isSameDay } from '../utils/timeUtils';
import { useRouterNavigation } from '../components/RouterNavigation';
import { useUserStore } from '../store/userStore';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';

import { ChatListSkeleton } from '../components/skeleton';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

const FONT_FAMILY = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

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

// --- Figma chat/list item (web) ---
const WebChatListItem: React.FC<{
  item: ChatRoom;
  onSelect: (id: number) => void;
}> = ({ item, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const displayTitle = item.title;
  const hasUnread = item.unreadCount > 0;

  return (
    <div
      onClick={() => onSelect(item.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '14px 20px',
        backgroundColor: hovered ? COLORS.neutral.grey50 : 'transparent',
        transition: `background-color ${TRANSITIONS.normal}`,
        cursor: 'pointer',
      }}
      role="button"
      aria-label={`${displayTitle} 채팅방${hasUnread ? `, 읽지 않은 메시지 ${item.unreadCount}개` : ''}`}
    >
      {/* Figma: 57x57 원형 아바타 */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div
          style={{
            width: 57,
            height: 57,
            borderRadius: '50%',
            backgroundColor: getAvatarColor(displayTitle),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          <span style={{ fontSize: 20, fontWeight: 700, color: COLORS.text.white, fontFamily: FONT_FAMILY }}>
            {getInitials(displayTitle)}
          </span>
        </div>
        {hasUnread && (
          <div
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: COLORS.primary.main,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 6px',
              border: `2px solid ${COLORS.neutral.white}`,
            }}
          >
            <span style={{ fontSize: 10, fontWeight: 700, color: COLORS.neutral.white, lineHeight: 1, fontFamily: FONT_FAMILY }}>
              {item.unreadCount > 99 ? '99+' : item.unreadCount}
            </span>
          </div>
        )}
      </div>

      {/* Figma: 제목 16px SemiBold #121212, 설명 14px #868b94 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: hasUnread ? 600 : 500,
            color: COLORS.text.primary,
            letterSpacing: -0.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: FONT_FAMILY,
          }}
        >
          {displayTitle}
        </div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 400,
            color: COLORS.text.tertiary,
            letterSpacing: -0.8,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontFamily: FONT_FAMILY,
          }}
        >
          {item.lastMessage || '아직 메시지가 없습니다'}
        </div>
      </div>
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

  const [selectedTab, setSelectedTab] = useState<'meetup' | 'direct'>('meetup');
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

  const TAB_ITEMS: { key: 'meetup' | 'direct'; label: string }[] = [
    { key: 'meetup', label: '모임채팅' },
    { key: 'direct', label: '1:1 채팅' },
  ];
  const userId = user?.id?.toString() || '';

  // 1대1 채팅 권한 체크
  const checkDirectChatPermission = async (targetUserId: string) => {
    try {
      const meetupId = currentChatRoom?.meetupId;
      const token = localStorage.getItem('token');
      const response = await fetch(`${chatApiService.baseURL}/check-direct-chat-permission?currentUserId=${userId}&targetUserId=${targetUserId}&meetupId=${meetupId || ''}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
        },
      });
      const data = await response.json();
      return data.data || { allowed: false };
    } catch {
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
      chatApiService.markAsRead(roomId).catch(() => {});

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
    const filteredRooms = chatRooms.filter(room => room.type === selectedTab);

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
          title={selectedTab === 'direct' ? '1:1 채팅이 없어요' : '아직 모임채팅이 없어요'}
          description="매장에 예약하면 채팅이 시작돼요"
        />
      );
    }

    return (
      <ScrollView
        style={styles.chatList}
        contentContainerStyle={styles.chatListContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredRooms.map((item) => (
          <WebChatListItem key={item.id} item={item} onSelect={selectChatRoom} />
        ))}
      </ScrollView>
    );
  };

  // 채팅방 내부 UI
  const renderChatRoom = () => (
    <div style={webPageStyles.wrapper}>
    <div style={webPageStyles.container}>
    <View style={styles.chatRoom}>
      {/* 채팅 헤더 */}
      <div style={webPageStyles.chatRoomHeader}>
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
      </div>

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
                    fontFamily: FONT_FAMILY,
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
    </div>
    </div>
  );

  // 채팅방이 선택된 경우 채팅방 UI 표시
  if (selectedChatId && currentChatRoom) {
    return renderChatRoom();
  }

  return (
    <div style={webPageStyles.wrapper}>
    <div style={webPageStyles.container}>
    <View style={styles.container}>
      {/* Figma 헤더 */}
      <div style={webPageStyles.header}>
        <div style={webPageStyles.headerTitle}>채팅</div>
        <View style={styles.headerIcons}>
          <WebHoverButton borderRadius={20}>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} accessibilityLabel="검색">
              <Icon name="search" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </WebHoverButton>
          <WebHoverButton borderRadius={20}>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7} accessibilityLabel="알림">
              <Icon name="bell" size={22} color={COLORS.text.primary} />
            </TouchableOpacity>
          </WebHoverButton>
        </View>
      </div>

      {/* Figma 2-tab — simple underline */}
      <div style={{ display: 'flex', borderBottom: `1px solid ${CARD_STYLE.borderColor}`, backgroundColor: COLORS.neutral.white }}>
        {TAB_ITEMS.map((tab) => {
          const isActive = selectedTab === tab.key;
          const unreadCount = chatRooms
            .filter((r) => r.type === tab.key)
            .reduce((sum, r) => sum + (r.unreadCount > 0 ? 1 : 0), 0);
          return (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key)}
              style={{
                flex: 1,
                paddingTop: 12,
                paddingBottom: 14,
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: -0.3,
                background: 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${COLORS.text.primary}` : '2px solid transparent',
                color: isActive ? COLORS.text.primary : COLORS.text.secondary,
                cursor: 'pointer',
                fontFamily: FONT_FAMILY,
                transition: `color ${TRANSITIONS.normal}`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
              aria-selected={isActive}
            >
              {tab.label}
              {unreadCount > 0 && (
                <span
                  style={{
                    minWidth: 18,
                    height: 18,
                    padding: '0 6px',
                    borderRadius: 9,
                    backgroundColor: COLORS.primary.main,
                    color: COLORS.neutral.white,
                    fontSize: 10,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: FONT_FAMILY,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 채팅 목록 */}
      {renderChatList()}

      {/* Figma FAB 추가 버튼 */}
      <button
        onClick={() => navigate('/search-restaurants')}
        style={{
          position: 'fixed',
          bottom: 103,
          right: 16,
          width: 57,
          height: 57,
          borderRadius: BORDER_RADIUS.full,
          background: `linear-gradient(135deg, ${COLORS.primary.main}, ${COLORS.primary.dark})`,
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: CSS_SHADOWS.cta,
          transition: `transform ${TRANSITIONS.fast}`,
          zIndex: 20,
        }}
        aria-label="매장 검색"
      >
        <Icon name="plus" size={28} color={COLORS.text.white} />
      </button>

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
    </div>
    </div>
  );
};

// ── Web CSS-in-JS Styles (matching design system) ──
const webPageStyles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    backgroundColor: COLORS.neutral.background,
  },
  container: {
    maxWidth: 480,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    backgroundColor: COLORS.neutral.white,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
    fontFamily: FONT_FAMILY,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 700,
    letterSpacing: -0.3,
    color: COLORS.text.primary,
    fontFamily: FONT_FAMILY,
  },
  chatRoomHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px 12px',
    backgroundColor: COLORS.neutral.white,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`,
    boxShadow: CSS_SHADOWS.stickyHeader,
    zIndex: 10,
    fontFamily: FONT_FAMILY,
  },
};

const styles = StyleSheet.create({
  // === 전체 컨테이너 ===
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.white,
  },
  headerIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
  },
  lastMessage: {
    fontSize: 13,
    fontWeight: '400',
    color: COLORS.text.tertiary,
    lineHeight: 18,
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
  // chatRoomHeader moved to webPageStyles
  backButton: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatRoomTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
    color: COLORS.text.primary,
    textAlign: 'center',
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    paddingHorizontal: SPACING.lg,
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
  },

  // === 말풍선 ===
  messageBubble: {
    backgroundColor: COLORS.neutral.grey100,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.xxl,
    borderTopLeftRadius: BORDER_RADIUS.sm,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.sm,
  },
  messageText: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    color: COLORS.text.primary,
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
  },
  myMessageText: {
    color: COLORS.neutral.white,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.tertiary,
    marginTop: 4,
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
  },

  // === 메시지 입력 바 ===
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(17,17,17,0.06)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
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
    borderRadius: BORDER_RADIUS.pill,
    paddingLeft: 16,
    paddingRight: 4,
    height: 40,
    boxSizing: 'border-box',
    transition: `background-color ${TRANSITIONS.normal}, box-shadow ${TRANSITIONS.normal}`,
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
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
  },
  sendButton: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    transition: `background-color ${TRANSITIONS.fast}`,
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
    borderRadius: BORDER_RADIUS.full,
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
    borderRadius: BORDER_RADIUS.full,
    resizeMode: 'cover',
  },
  defaultProfileImage: {
    width: 34,
    height: 34,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text.white,
    fontFamily: '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif',
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
