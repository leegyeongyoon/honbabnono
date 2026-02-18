import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Image,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS, CARD_STYLE, BORDER_RADIUS, SPACING, TYPOGRAPHY } from '../../styles';
import {Icon} from '../Icon';
import chatService from '../../services/chatService';
import chatApiService, {ChatRoom, ChatMessage} from '../../services/chatApiService';
import {getDetailedDateFormat, getChatDateHeader, isSameDay} from '../../utils/timeUtils';
import {useUserStore} from '../../store/userStore';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarColor, getInitials } from '../../utils/avatarColor';
import { ChatListSkeleton } from '../skeleton';
import EmptyState from '../EmptyState';

interface NavigationAdapter {
  navigate: (screen: string, params?: any) => void;
  goBack?: () => void;
}

interface UniversalChatScreenProps {
  navigation: NavigationAdapter;
  user?: any;
  selectedChatId?: number | null;
  onChatSelect?: (chatId: number) => void;
  ChatRoomModal?: React.ComponentType<any>;
}

const UniversalChatScreen: React.FC<UniversalChatScreenProps> = ({
  navigation,
  user,
  selectedChatId: propSelectedChatId,
  onChatSelect,
  ChatRoomModal
}) => {
  const { user: storeUser } = useUserStore();
  const { isAuthenticated } = useAuth();
  const currentUser = user || storeUser;

  const [selectedTab, setSelectedTab] = useState('전체');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(propSelectedChatId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(null);
  const [selectedUserForDM, setSelectedUserForDM] = useState<any>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const [messageInputFocused, setMessageInputFocused] = useState(false);
  const messageListRef = useRef<ScrollView>(null);

  const tabs = ['전체', '모임', '개인'];
  const userId = currentUser?.id || '';

  // 1대1 채팅 권한 체크
  const checkDirectChatPermission = async (targetUserId: string) => {
    try {
      const meetupId = currentChatRoom?.meetupId;
      const response = await fetch(`${chatApiService.baseURL}/check-direct-chat-permission?currentUserId=${userId}&targetUserId=${targetUserId}&meetupId=${meetupId || ''}`);
      const data = await response.json();
      return data.data || { allowed: false };
    } catch (_error) {
      return { allowed: false };
    }
  };

  // 1대1 채팅 시작
  const startDirectChat = async (targetUser: any) => {
    try {
      const permission = await checkDirectChatPermission(targetUser.id);
      if (!permission.allowed) {
        Alert.alert('알림', '1대1 채팅을 시작할 수 없습니다.');
        return;
      }

      const response = await chatApiService.createDirectChatRoom({
        participantId: targetUser.id,
        participantName: targetUser.name,
        userId,
        userName: currentUser?.name || '사용자',
        meetupId: currentChatRoom?.meetupId
      });

      if (response.success) {
        setSelectedChatId(response.data.id);
        setShowDMModal(false);
        await loadMessages(response.data.id);
      } else {
        Alert.alert('오류', response.message || '1대1 채팅방을 생성할 수 없습니다.');
      }
    } catch (_error) {
      Alert.alert('오류', '1대1 채팅을 시작할 수 없습니다.');
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
  }, [isAuthenticated, userId]);

  // 채팅방 목록 로드
  const loadChatRooms = async () => {
    // 인증되지 않았거나 userId가 없으면 빈 배열 반환
    if (!isAuthenticated || !userId) {
      setChatRooms([]);
      return;
    }

    try {
      setLoading(true);
      const rooms = await chatApiService.getChatRooms(userId);
      setChatRooms(rooms);
    } catch (_error) {
      // 로그인이 필요한 경우 안내
      if (!currentUser) {
        Alert.alert('로그인 필요', '채팅 기능을 사용하려면 로그인이 필요합니다.', [
          { text: '확인', onPress: () => navigation.navigate('Login') }
        ]);
      } else {
        Alert.alert('오류', '채팅방 목록을 불러올 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 메시지 로드
  const loadMessages = async (roomId: number) => {
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

      // 서버에 읽음 처리 요청 (DB에 lastReadAt 업데이트)
      await chatApiService.markAsRead(roomId);

      // 로컬 상태에서도 읽지 않은 메시지 수 초기화
      setChatRooms(prev => prev.map(room =>
        room.id === roomId ? { ...room, unreadCount: 0 } : room
      ));

    } catch (_error) {
      Alert.alert('오류', '메시지를 불러올 수 없습니다.');
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

  // 채팅방 선택
  const selectChatRoom = async (roomId: number) => {
    if (onChatSelect) {
      onChatSelect(roomId);
    } else {
      await loadMessages(roomId);
    }
  };

  // 메시지 전송
  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChatId || !currentChatRoom || isSending) {return;}

    const messageData = {
      message: messageText.trim(),
      senderId: userId,
      senderName: currentUser?.name || '사용자',
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
        senderName: currentUser?.name || '사용자',
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
      Alert.alert('오류', '메시지를 전송할 수 없습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const renderChatListItem = (item: ChatRoom) => {
    const displayTitle = item.title;
    const participantCount = item.type === 'meetup' ? item.participants.length : undefined;

    return (
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
    <KeyboardAvoidingView
      style={styles.chatRoom}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* 채팅 헤더 */}
      <View style={styles.chatRoomHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (navigation.goBack) {
              navigation.goBack();
            } else {
              setSelectedChatId(null);
              setCurrentChatRoom(null);
              setMessages([]);
            }
          }}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <Icon name="chevron-left" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
        <Text style={styles.chatRoomTitle}>
          {currentChatRoom?.title || '채팅'}
        </Text>
        <TouchableOpacity
          style={styles.menuButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="메뉴"
        >
          <Icon name="more-vertical" size={20} color={COLORS.text.primary} />
        </TouchableOpacity>
      </View>

      {/* 메시지 목록 */}
      <ScrollView
        ref={messageListRef}
        style={styles.messageList}
        contentContainerStyle={styles.messageListContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((message, index) => {
          // 이전 메시지와 날짜가 다르면 날짜 헤더 표시
          const showDateHeader = index === 0 || !isSameDay(messages[index - 1].timestamp, message.timestamp);
          const prevMessage = index > 0 ? messages[index - 1] : null;
          const isSameSender = prevMessage && prevMessage.senderId === message.senderId && !showDateHeader;
          const messageSpacing = isSameSender ? 3 : 10;

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
                            {message.senderName.charAt(0)}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                    <View style={styles.messageContentWrapper}>
                      <View style={styles.messageHeader}>
                        <TouchableOpacity onPress={() => handleUserProfileClick(message)} activeOpacity={0.7}>
                          <Text style={styles.senderName}>{message.senderName}</Text>
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
          messageInputFocused && styles.inputContainerFocused,
        ]}>
          <TextInput
            style={styles.textInput}
            placeholder="메시지를 입력하세요..."
            placeholderTextColor={COLORS.neutral.grey400}
            value={messageText}
            onChangeText={setMessageText}
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            onFocus={() => setMessageInputFocused(true)}
            onBlur={() => setMessageInputFocused(false)}
          />
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
              color={messageText.trim() && !isSending ? COLORS.text.white : COLORS.neutral.grey400}
            />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
      <Modal
        visible={showDMModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDMModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedUserForDM?.name}님과 1대1 채팅</Text>
            <Text style={styles.modalDescription}>
              {selectedUserForDM?.name}님과 개인적인 대화를 나누시겠습니까?
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
      </Modal>
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
    paddingVertical: 14,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.sticky,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
  },
  headerTitle: {
    ...TYPOGRAPHY.heading.h1,
    color: COLORS.text.primary,
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

  // === 탭 네비게이션 ===
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTabButton: {
    backgroundColor: COLORS.primary.main,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  selectedTabButtonText: {
    color: COLORS.text.white,
    fontWeight: '600',
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
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  chatAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text.white,
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
    gap: 6,
  },
  chatTitle: {
    ...TYPOGRAPHY.body.large,
    fontWeight: '600',
    color: COLORS.text.primary,
    flexShrink: 1,
  },
  chatParticipantCount: {
    fontSize: 12,
    fontWeight: '400',
    color: COLORS.text.tertiary,
  },
  lastMessage: {
    ...TYPOGRAPHY.body.small,
    color: COLORS.text.tertiary,
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 2,
  },
  chatTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.accent,
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
    color: COLORS.text.white,
  },

  // === 채팅방 내부 ===
  chatRoom: {
    flex: 1,
    backgroundColor: COLORS.surface.secondary,
  },
  chatRoomHeader: {
    height: 56,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: CARD_STYLE.borderColor,
    ...SHADOWS.sticky,
    zIndex: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatRoomTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
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
    backgroundColor: COLORS.surface.secondary,
  },
  messageListContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
  },
  messageItem: {
    marginBottom: 10,
    maxWidth: '78%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  senderName: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.secondary,
  },

  // === 말풍선 ===
  messageBubble: {
    backgroundColor: '#F5F3F0',
    padding: 12,
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },
  myMessageBubble: {
    backgroundColor: '#9A7450',
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderTopRightRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.xs,
  },
  messageText: {
    ...TYPOGRAPHY.body.large,
    color: COLORS.text.primary,
    lineHeight: 22,
  },
  myMessageText: {
    color: COLORS.text.white,
  },
  messageTime: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
    marginTop: 3,
  },
  myMessageTime: {
    textAlign: 'right',
  },
  myMessageMeta: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  readReceipt: {
    ...TYPOGRAPHY.caption,
    color: COLORS.text.tertiary,
  },

  // === 메시지 입력 바 ===
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: CARD_STYLE.borderColor,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 64,
    justifyContent: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.light,
    borderRadius: BORDER_RADIUS.lg,
    paddingLeft: 16,
    paddingRight: 4,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
    width: '100%',
  },
  inputContainerFocused: {
    backgroundColor: COLORS.neutral.white,
    borderColor: COLORS.primary.main,
    ...SHADOWS.focused,
  },
  textInput: {
    flex: 1,
    ...TYPOGRAPHY.input,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingVertical: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: COLORS.primary.accent,
    ...SHADOWS.cta,
  },

  // === 날짜 구분선 ===
  dateHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  dateHeaderText: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    color: COLORS.text.tertiary,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.sm,
    textAlign: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },

  // === 메시지 프로필 ===
  messageWithProfile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
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
    color: COLORS.text.tertiary,
    marginLeft: 6,
    fontWeight: '500',
  },

  // === DM 모달 ===
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: 24,
    margin: 20,
    maxWidth: 360,
    width: '85%',
    ...SHADOWS.large,
  },
  modalTitle: {
    ...TYPOGRAPHY.heading.h3,
    color: COLORS.text.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    ...TYPOGRAPHY.body.medium,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButtonCancel: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.neutral.light,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.neutral.grey100,
  },
  modalButtonCancelText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.secondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary.accent,
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  modalButtonConfirmText: {
    ...TYPOGRAPHY.button.medium,
    color: COLORS.text.white,
  },
});

export default UniversalChatScreen;