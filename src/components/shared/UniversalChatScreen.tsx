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
  Image,
  Modal,
  SafeAreaView,
} from 'react-native';
import { COLORS, SHADOWS, LAYOUT } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
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

  const [selectedTab, setSelectedTab] = useState('모임채팅');
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<number | null>(propSelectedChatId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentChatRoom, setCurrentChatRoom] = useState<ChatRoom | null>(null);
  const [selectedUserForDM, setSelectedUserForDM] = useState<any>(null);
  const [showDMModal, setShowDMModal] = useState(false);
  const [messageInputFocused, setMessageInputFocused] = useState(false);

  const tabs = ['모임채팅', '1:1채팅'];
  const userId = currentUser?.id || '';

  // 1대1 채팅 권한 체크
  const checkDirectChatPermission = async (targetUserId: string) => {
    try {
      const meetupId = currentChatRoom?.meetupId;
      const response = await fetch(`${chatApiService.baseURL}/check-direct-chat-permission?currentUserId=${userId}&targetUserId=${targetUserId}&meetupId=${meetupId || ''}`);
      const data = await response.json();
      return data.data || { allowed: false };
    } catch (error) {
      console.error('1대1 채팅 권한 체크 실패:', error);
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
    } catch (error) {
      console.error('1대1 채팅 시작 실패:', error);
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
    } catch (error) {
      console.error('채팅방 목록 로드 실패:', error);
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

    } catch (error) {
      console.error('메시지 로드 실패:', error);
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
    if (!messageText.trim() || !selectedChatId || !currentChatRoom) {return;}

    const messageData = {
      message: messageText.trim(),
      senderId: userId,
      senderName: currentUser?.name || '사용자',
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
        senderName: currentUser?.name || '사용자',
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
          <Text style={styles.chatTitle} numberOfLines={1}>
            {displayTitle}
          </Text>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || '아직 메시지가 없습니다'}
          </Text>
        </View>
        <View style={styles.chatMeta}>
          <Text style={styles.chatTime}>
            {getDetailedDateFormat(item.lastTime)}
            {participantCount && item.lastTime ? ' \u2022 ' : ''}
            {participantCount ? `${participantCount}명` : ''}
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
    const filteredRooms = chatRooms.filter(room =>
      selectedTab === '모임채팅' ? room.type === 'meetup' : room.type === 'direct'
    );

    if (loading) {
      return (
        <View style={styles.chatListSkeletonContainer}>
          {[1, 2, 3, 4].map((i) => (
            <ChatListSkeleton key={i} />
          ))}
        </View>
      );
    }

    if (filteredRooms.length === 0) {
      return (
        <EmptyState
          icon="message-circle"
          title={selectedTab === '모임채팅' ? '참여한 모임 채팅이 없어요' : '1:1 채팅이 없어요'}
          description={selectedTab === '모임채팅' ? '모임에 참가하면 채팅방이 자동으로 생성됩니다' : undefined}
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
            if (navigation.goBack) {
              navigation.goBack();
            } else {
              setSelectedChatId(null);
              setCurrentChatRoom(null);
              setMessages([]);
            }
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
                  <View style={styles.messageWithProfile}>
                    <TouchableOpacity
                      style={styles.profileImageContainer}
                      onPress={() => handleUserProfileClick(message)}
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
                        <TouchableOpacity onPress={() => handleUserProfileClick(message)}>
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
          >
            <Icon
              name="send"
              size={20}
              color={messageText.trim() ? COLORS.text.white : COLORS.text.secondary}
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
              >
                <Text style={styles.modalButtonCancelText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButtonConfirm}
                onPress={() => startDirectChat(selectedUserForDM)}
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
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    borderBottomColor: COLORS.neutral.grey100,
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
    color: COLORS.text.tertiary,
  },
  selectedTabButtonText: {
    color: COLORS.primary.main,
    fontWeight: '700',
  },
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
    paddingVertical: 16,
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
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  chatInfo: {
    flex: 1,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 13,
    color: COLORS.text.tertiary,
  },
  chatMeta: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: 6,
    paddingTop: 2,
  },
  chatTime: {
    fontSize: 12,
    color: COLORS.text.tertiary,
  },
  unreadBadge: {
    backgroundColor: COLORS.primary.main,
    borderRadius: 11,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.text.white,
  },
  chatRoom: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  chatRoomHeader: {
    height: 64,
    backgroundColor: COLORS.neutral.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    ...SHADOWS.small,
  },
  backButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatRoomTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  menuButton: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
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
    fontWeight: '500',
  },
  messageBubble: {
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 20,
  },
  myMessageBubble: {
    backgroundColor: COLORS.primary.main,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: COLORS.text.primary,
    lineHeight: 20,
  },
  myMessageText: {
    color: COLORS.text.white,
  },
  messageTime: {
    fontSize: 11,
    color: COLORS.text.secondary,
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
    fontSize: 10,
    color: COLORS.primary.main,
  },
  messageInput: {
    backgroundColor: COLORS.neutral.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey100,
    paddingHorizontal: 20,
    paddingVertical: 14,
    height: 72,
    justifyContent: 'center',
    ...SHADOWS.large,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: COLORS.neutral.background,
    borderRadius: BORDER_RADIUS.xl,
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'transparent',
    width: '100%',
  },
  inputContainerFocused: {
    borderColor: COLORS.primary.main,
    ...SHADOWS.focused,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text.primary,
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendButton: {
    marginLeft: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text.secondary,
    backgroundColor: COLORS.neutral.white,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    textAlign: 'center',
    ...SHADOWS.small,
  },
  messageWithProfile: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  profileImageContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.neutral.grey200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: 'cover',
  },
  defaultProfileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defaultProfileText: {
    fontSize: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    padding: 24,
    margin: 20,
    maxWidth: 400,
    width: '90%',
    ...SHADOWS.medium,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey300,
    backgroundColor: COLORS.neutral.white,
    alignItems: 'center',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  modalButtonConfirm: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.primary.main,
    alignItems: 'center',
  },
  modalButtonConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.white,
  },
});

export default UniversalChatScreen;
