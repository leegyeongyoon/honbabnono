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
import { COLORS, SHADOWS, CSS_SHADOWS, LAYOUT, CARD_STYLE, TYPOGRAPHY, SPACING, BORDER_RADIUS } from '../styles';
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

  const renderChatListItem = (item: ChatRoom) => {
    const displayTitle = item.type === 'meetup' ? item.title : item.title;
    const participantCount = item.type === 'meetup' ? item.participants.length : undefined;
    const hasUnread = item.unreadCount > 0;

    return (
      <div
        style={{
          transition: 'background-color 150ms ease',
          cursor: 'pointer',
          position: 'relative',
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.light; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        role="button"
        aria-label={`${displayTitle} 채팅방${hasUnread ? `, 읽지 않은 메시지 ${item.unreadCount}개` : ''}`}
      >
        {/* 읽지 않은 메시지 좌측 액센트 라인 */}
        {hasUnread && (
          <div style={{
            position: 'absolute',
            left: 0,
            top: 8,
            bottom: 8,
            width: 3,
            borderRadius: 2,
            backgroundColor: COLORS.primary.accent,
          }} />
        )}
        <TouchableOpacity
          style={styles.chatItem}
          onPress={() => selectChatRoom(item.id)}
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
              width: 22,
              height: 22,
              borderRadius: 11,
              backgroundColor: item.type === 'meetup' ? COLORS.primary.main : COLORS.neutral.grey400,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `2px solid ${COLORS.surface.primary}`,
            }}>
              <span style={{ fontSize: 11, color: COLORS.neutral.white }}>
                {item.type === 'meetup' ? '👥' : '💬'}
              </span>
            </div>
          </div>
          <View style={styles.chatInfo}>
            <View style={styles.chatTitleRow}>
              <Text style={[styles.chatTitle, hasUnread && { fontWeight: '800' as any }]} numberOfLines={1}>
                {displayTitle}
              </Text>
              {participantCount && (
                <View style={styles.chatParticipantBadge}>
                  <Text style={styles.chatParticipantCount}>{participantCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.lastMessage, hasUnread && { color: COLORS.text.secondary, fontWeight: '500' as any }]} numberOfLines={1}>
              {item.lastMessage || '아직 메시지가 없습니다'}
            </Text>
          </View>
          <View style={styles.chatMeta}>
            <Text style={[styles.chatTime, hasUnread && { color: COLORS.primary.accent, fontWeight: '600' as any }]}>
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
          title={selectedTab === '개인' ? '1:1 채팅이 없어요' : '아직 대화가 없어요'}
          description="약속에 참여하고 대화를 시작해보세요!"
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
        <div
          style={{ cursor: 'pointer', borderRadius: 22, transition: 'background-color 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey100; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
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
        </div>
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
        <div
          style={{ cursor: 'pointer', borderRadius: 22, transition: 'background-color 150ms ease' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey100; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
        >
          <TouchableOpacity style={styles.menuButton} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="메뉴">
            <Icon name="more-vertical" size={20} color={COLORS.text.primary} />
          </TouchableOpacity>
        </div>
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
                  margin: '20px 0',
                  gap: 12,
                }}>
                  <div style={{ flex: 1, height: 1, backgroundColor: COLORS.neutral.grey200 }} />
                  <div style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: COLORS.text.secondary,
                    backgroundColor: COLORS.surface.primary,
                    padding: '6px 16px',
                    borderRadius: BORDER_RADIUS.md,
                    boxShadow: CSS_SHADOWS.small,
                    border: `1px solid ${COLORS.neutral.grey100}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {getChatDateHeader(message.timestamp)}
                  </div>
                  <div style={{ flex: 1, height: 1, backgroundColor: COLORS.neutral.grey200 }} />
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
                      <div
                        style={{ transition: 'filter 150ms ease', borderRadius: BORDER_RADIUS.md }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(0.97)'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                      >
                        <View style={[styles.messageBubble]}>
                          <Text style={[styles.messageText]}>
                            {message.message}
                          </Text>
                        </View>
                      </div>
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
                    <div
                      style={{
                        backgroundColor: '#2D2926',
                        padding: SPACING.lg,
                        borderRadius: BORDER_RADIUS.md,
                        borderBottomRightRadius: BORDER_RADIUS.xs,
                        transition: 'filter 150ms ease',
                        boxShadow: CSS_SHADOWS.small,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.filter = 'brightness(1.1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.filter = 'none'; }}
                    >
                      <Text style={[styles.messageText, styles.myMessageText]}>
                        {message.message}
                      </Text>
                    </div>
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
        <View style={styles.inputRow}>
          {/* 첨부 버튼 */}
          <div
            style={{
              cursor: 'pointer',
              borderRadius: 22,
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey100; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <TouchableOpacity
              style={styles.attachButton}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="파일 첨부"
            >
              <Icon name="plus" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </div>
          <View style={[
            styles.inputContainer,
            messageInputFocused && {
              backgroundColor: COLORS.surface.primary,
              borderWidth: 1,
              borderColor: COLORS.primary.accent,
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
            <div
              style={{
                cursor: messageText.trim() && !isSending ? 'pointer' : 'default',
                borderRadius: 20,
                transition: 'all 200ms ease',
              }}
              onMouseEnter={(e) => {
                if (messageText.trim() && !isSending) {
                  (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)';
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
              }}
            >
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
                  size={18}
                  color={messageText.trim() && !isSending ? COLORS.text.white : COLORS.text.tertiary}
                />
              </TouchableOpacity>
            </div>
          </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.headerTitle}>채팅</Text>
          {chatRooms.filter(r => r.unreadCount > 0).length > 0 && (
            <View style={{
              backgroundColor: COLORS.primary.accent,
              borderRadius: 10,
              minWidth: 20,
              height: 20,
              paddingHorizontal: 6,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ ...TYPOGRAPHY.caption, fontWeight: '700' as any, color: COLORS.neutral.white }}>
                {chatRooms.reduce((sum, r) => sum + r.unreadCount, 0)}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.headerIcons}>
          <div
            style={{ cursor: 'pointer', borderRadius: 20, transition: 'background-color 150ms ease' }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = COLORS.neutral.grey100; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
          >
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
              <Icon name="bell" size={20} color={COLORS.text.primary} />
            </TouchableOpacity>
          </div>
        </View>
      </View>

      {/* 탭 네비게이션 */}
      <View style={styles.tabNavigation}>
        {tabs.map((tab) => {
          const tabCount = chatRooms.filter(r => {
            if (tab === '전체') return r.unreadCount > 0;
            if (tab === '약속') return r.type === 'meetup' && r.unreadCount > 0;
            return r.type === 'direct' && r.unreadCount > 0;
          }).length;

          return (
            <div key={tab} style={{ cursor: 'pointer', position: 'relative' }}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  selectedTab === tab && styles.selectedTabButton,
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
              {tabCount > 0 && selectedTab !== tab && (
                <div style={{
                  position: 'absolute',
                  top: -2,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: COLORS.primary.accent,
                  border: `2px solid ${COLORS.surface.primary}`,
                }} />
              )}
            </div>
          );
        })}
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    paddingTop: SPACING.xl,
    backgroundColor: COLORS.surface.primary,
    ...SHADOWS.sticky,
    // @ts-ignore — web CSS shadow
    boxShadow: CSS_SHADOWS.stickyHeader,
    zIndex: 10,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.h1,
    fontSize: 22,
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
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  tabButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.grey100,
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 200ms ease',
  } as any,
  selectedTabButton: {
    backgroundColor: COLORS.primary.main,
  },
  tabButtonText: {
    ...TYPOGRAPHY.body.small,
    fontWeight: '600',
    color: COLORS.text.secondary,
    transition: 'color 200ms ease',
  } as any,
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '700',
  },

  // === 채팅방 목록 ===
  chatList: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
  },
  chatListContainer: {
    paddingBottom: SPACING.xl,
  },
  chatListSkeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.surface.primary,
    paddingTop: SPACING.md,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
  },
  chatAvatarText: {
    fontSize: 19,
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
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  chatTitle: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  chatParticipantBadge: {
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
  },
  chatParticipantCount: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.tertiary,
  },
  lastMessage: {
    ...TYPOGRAPHY.body.medium,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: SPACING.md,
    paddingTop: 2,
  },
  chatTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  unreadCount: {
    ...TYPOGRAPHY.caption,
    fontWeight: '700',
    color: COLORS.text.white,
  },

  // === 빈 상태 / 로딩 ===
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxxl,
    backgroundColor: COLORS.surface.primary,
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
    backgroundColor: COLORS.surface.primary,
  },
  emptyText: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },

  // === 채팅방 내부 ===
  chatRoom: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  chatRoomHeader: {
    minHeight: 60,
    backgroundColor: COLORS.surface.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.sticky,
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
    ...TYPOGRAPHY.body.large,
    fontWeight: '700',
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
    paddingHorizontal: SPACING.xl,
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
    marginBottom: SPACING.xs,
  },
  senderName: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.secondary,
    fontWeight: '600',
  },

  // === 말풍선 ===
  messageBubble: {
    backgroundColor: '#F5F3F0',
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderTopLeftRadius: BORDER_RADIUS.xs,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  messageText: {
    ...TYPOGRAPHY.body.large,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.text.white,
  },
  messageTime: {
    ...TYPOGRAPHY.caption,
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
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    fontWeight: '400',
  },

  // === 메시지 입력 바 ===
  messageInput: {
    backgroundColor: COLORS.surface.primary,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    height: 68,
    justifyContent: 'center',
    // @ts-ignore — web CSS shadow for input bar
    boxShadow: CSS_SHADOWS.bottomSheet,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attachButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey50,
    borderRadius: 24,
    paddingLeft: 18,
    paddingRight: SPACING.xs,
    height: 48,
    boxSizing: 'border-box',
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
    transition: 'border-color 200ms ease, box-shadow 200ms ease',
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
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
    transition: 'background-color 150ms ease',
  } as any,
  sendButtonActive: {
    backgroundColor: COLORS.primary.accent,
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
    borderWidth: 1,
    borderColor: CARD_STYLE.borderColor,
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
    fontWeight: '700',
    color: COLORS.text.white,
  },
  messageContentWrapper: {
    flex: 1,
  },
  riceIndex: {
    ...TYPOGRAPHY.caption,
    color: COLORS.primary.accent,
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
    backgroundColor: COLORS.surface.primary,
    borderRadius: BORDER_RADIUS.lg,
    padding: 28,
    margin: 20,
    maxWidth: 360,
    width: '85%',
    ...SHADOWS.large,
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
    backgroundColor: COLORS.primary.accent,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    ...TYPOGRAPHY.button.large,
    color: COLORS.text.white,
  },
});

export default ChatScreen;
