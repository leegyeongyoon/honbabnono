import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Icon } from '../components/Icon';
import { COLORS, CARD_STYLE } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { getApiBaseUrl } from '../services/apiClient';
import reservationChatApiService, { ChatMessage } from '../services/reservationChatApiService';

// ============================================================
// ReservationChatScreen — 매장 문의 1:1 채팅 (잇테이블 v2)
// URL: /reservation-chat/:roomId
// ============================================================

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const ReservationChatScreen: React.FC = () => {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const list = await reservationChatApiService.getMessages(roomId);
      setMessages(list);
      await reservationChatApiService.markRead(roomId).catch(() => {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 실시간 수신 (소켓 — 토큰 인증 + resvchat 룸)
  useEffect(() => {
    if (!roomId) return;
    let socket: Socket | null = null;
    let token: string | null = null;
    try {
      token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    } catch {
      token = null;
    }
    if (!token) return;

    socket = io(getApiBaseUrl().replace(/\/api\/?$/, ''), {
      transports: ['websocket', 'polling'],
      auth: { token },
    });
    socket.on('connect', () => socket?.emit('join_resv_chat', roomId));
    socket.on('reservation_chat_message', (raw: any) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === raw.id)) return prev;
        return [...prev, {
          id: raw.id,
          roomId: raw.room_id,
          senderId: raw.sender_id,
          senderRole: raw.sender_role,
          message: raw.message,
          createdAt: raw.created_at,
        }];
      });
      reservationChatApiService.markRead(roomId).catch(() => {});
    });

    return () => {
      socket?.emit('leave_resv_chat', roomId);
      socket?.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !roomId || sending) return;
    setSending(true);
    try {
      const saved = await reservationChatApiService.sendMessage(roomId, text);
      setMessages((prev) => (prev.some((m) => m.id === saved.id) ? prev : [...prev, saved]));
      setInput('');
    } catch (err: any) {
      alert(err?.response?.data?.error || '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div style={s.wrapper}>
      <div style={s.container}>
        {/* 헤더 */}
        <div style={s.header}>
          <div style={s.backBtn} onClick={() => navigate(-1)}>
            <Icon name="arrow-left" size={20} color={COLORS.text.primary} />
          </div>
          <div style={s.headerTitle}>매장 문의</div>
          <div style={{ width: 36 }} />
        </div>

        {/* 메시지 목록 */}
        <div style={s.messageList}>
          {loading ? (
            <div style={s.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primary.main} />
            </div>
          ) : messages.length === 0 ? (
            <div style={s.emptyText}>
              매장에 궁금한 점을 남겨보세요.
              <br />알레르기, 자리 요청 등 무엇이든 좋아요.
            </div>
          ) : (
            messages.map((m) => {
              const mine = m.senderRole === 'customer';
              return (
                <div key={m.id} style={{ ...s.messageRow, justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={mine ? s.bubbleMine : s.bubbleOther}>
                    {!mine && <div style={s.senderLabel}>사장님</div>}
                    <div style={{ ...s.bubbleText, color: mine ? COLORS.text.white : COLORS.text.primary }}>
                      {m.message}
                    </div>
                    <div style={{ ...s.timeText, color: mine ? 'rgba(255,255,255,0.7)' : COLORS.text.tertiary }}>
                      {formatTime(m.createdAt)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* 입력 바 */}
        <div style={s.inputBar}>
          <input
            style={s.input}
            value={input}
            placeholder="메시지를 입력하세요"
            maxLength={1000}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          />
          <div
            style={{ ...s.sendButton, opacity: input.trim() && !sending ? 1 : 0.4 }}
            onClick={handleSend}
          >
            전송
          </div>
        </div>
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  wrapper: { minHeight: '100vh', backgroundColor: COLORS.neutral.background },
  container: {
    maxWidth: 480, margin: '0 auto', display: 'flex',
    flexDirection: 'column' as const, height: '100vh',
  },
  loadingWrap: { display: 'flex', justifyContent: 'center', paddingTop: 80 },

  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px', backgroundColor: COLORS.surface.primary,
    borderBottom: `1px solid ${CARD_STYLE.borderColor}`, flexShrink: 0,
  },
  backBtn: {
    width: 36, height: 36, display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer',
  },
  headerTitle: { fontSize: 16, fontWeight: 700, color: COLORS.text.primary, fontFamily: FONT },

  messageList: {
    flex: 1, overflowY: 'auto' as const,
    padding: `${SPACING.lg}px ${SPACING.screen.horizontal}px`,
  },
  emptyText: {
    textAlign: 'center' as const, color: COLORS.text.tertiary, fontSize: 13,
    fontFamily: FONT, lineHeight: '1.7', paddingTop: 60,
  },
  messageRow: { display: 'flex', marginBottom: SPACING.sm },
  bubbleMine: {
    maxWidth: '75%', padding: '10px 14px',
    borderRadius: `${BORDER_RADIUS.xl}px ${BORDER_RADIUS.xl}px 4px ${BORDER_RADIUS.xl}px`,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
  },
  bubbleOther: {
    maxWidth: '75%', padding: '10px 14px',
    borderRadius: `${BORDER_RADIUS.xl}px ${BORDER_RADIUS.xl}px ${BORDER_RADIUS.xl}px 4px`,
    backgroundColor: COLORS.surface.primary,
    border: `1px solid ${CARD_STYLE.borderColor}`,
  },
  senderLabel: { fontSize: 11, fontWeight: 700, color: COLORS.primary.main, fontFamily: FONT, marginBottom: 2 },
  bubbleText: { fontSize: 14, fontFamily: FONT, lineHeight: '1.5', wordBreak: 'break-word' as const },
  timeText: { fontSize: 10, fontFamily: FONT, marginTop: 4, textAlign: 'right' as const },

  inputBar: {
    display: 'flex', gap: SPACING.sm, padding: `${SPACING.md}px ${SPACING.screen.horizontal}px`,
    backgroundColor: COLORS.surface.primary,
    borderTop: `1px solid ${CARD_STYLE.borderColor}`, flexShrink: 0,
  },
  input: {
    flex: 1, padding: '11px 14px', fontSize: 14, fontFamily: FONT,
    border: `1px solid ${COLORS.neutral.grey200}`, borderRadius: BORDER_RADIUS.pill,
    outline: 'none',
  },
  sendButton: {
    padding: '11px 18px', borderRadius: BORDER_RADIUS.pill,
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    color: COLORS.text.white, fontSize: 14, fontWeight: 700,
    cursor: 'pointer', fontFamily: FONT, flexShrink: 0,
  },
};

export default ReservationChatScreen;
