import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Badge from '@mui/material/Badge';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import SendIcon from '@mui/icons-material/Send';
import apiClient from '../utils/api';
import getRestaurantId from '../utils/getRestaurantId';

// ── Types ──────────────────────────────────────────────────────
interface ChatRoom {
  id: string;
  reservation_id: string;
  customer_name: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  reservation_status: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  sender_role: 'customer' | 'merchant';
  sender_name?: string;
  message: string;
  created_at: string;
}

// ── Style constants ────────────────────────────────────────────
const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';
const BRAND_LIGHT = '#FAF6F3';

const formatTime = (iso?: string) => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('ko-KR', {
      month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

// ── Component ──────────────────────────────────────────────────
const ChatInbox: React.FC = () => {
  const restaurantId = getRestaurantId();

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const res = await apiClient.get('/api/reservation-chat/merchant/rooms');
      const d = res.data.data || res.data;
      setRooms(d.rooms ?? []);
    } catch (err: any) {
      setError(err.response?.data?.error || '문의 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const res = await apiClient.get(`/api/reservation-chat/rooms/${roomId}/messages`);
      const d = res.data.data || res.data;
      setMessages(d.messages ?? []);
      // 읽음 처리 후 목록의 unread 갱신
      await apiClient.post(`/api/reservation-chat/rooms/${roomId}/read`).catch(() => {});
      fetchRooms();
    } catch {
      // silent
    }
  }, [fetchRooms]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  // 폴링 — 목록 15초, 열린 대화 5초 (소켓 연동은 후속)
  useEffect(() => {
    const id = setInterval(fetchRooms, 15_000);
    return () => clearInterval(id);
  }, [fetchRooms]);

  useEffect(() => {
    if (!selectedRoom) return;
    fetchMessages(selectedRoom.id);
    const id = setInterval(() => fetchMessages(selectedRoom.id), 5_000);
    return () => clearInterval(id);
  }, [selectedRoom, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !selectedRoom || sending) return;
    setSending(true);
    try {
      await apiClient.post(`/api/reservation-chat/rooms/${selectedRoom.id}/messages`, { message: text });
      setInput('');
      fetchMessages(selectedRoom.id);
    } catch (err: any) {
      alert(err.response?.data?.error || '메시지 전송에 실패했습니다.');
    } finally {
      setSending(false);
    }
  };

  if (!restaurantId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">매장 등록을 먼저 완료해주세요. (매장 정보 탭에서 등록 가능)</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>문의</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 180px)', minHeight: 480 }}>
        {/* 좌측: 문의 목록 */}
        <Paper sx={{ width: 320, flexShrink: 0, overflowY: 'auto', borderRadius: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress sx={{ color: BRAND }} />
            </Box>
          ) : rooms.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>
              아직 문의가 없습니다.
            </Typography>
          ) : (
            <List disablePadding>
              {rooms.map((room) => (
                <ListItemButton
                  key={room.id}
                  selected={selectedRoom?.id === room.id}
                  onClick={() => setSelectedRoom(room)}
                  sx={{
                    borderBottom: '1px solid #F0F0F0',
                    '&.Mui-selected': { backgroundColor: BRAND_LIGHT },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700}>{room.customer_name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {room.reservation_date} {String(room.reservation_time).slice(0, 5)} · {room.party_size}명
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="caption" color="text.secondary" noWrap component="span">
                        {room.last_message || '메시지 없음'}
                      </Typography>
                    }
                  />
                  {room.unread_count > 0 && (
                    <Badge badgeContent={room.unread_count} color="error" sx={{ mr: 1 }} />
                  )}
                </ListItemButton>
              ))}
            </List>
          )}
        </Paper>

        {/* 우측: 대화 */}
        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
          {!selectedRoom ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                좌측에서 문의를 선택하세요.
              </Typography>
            </Box>
          ) : (
            <>
              {/* 대화 헤더 */}
              <Box sx={{ p: 2, borderBottom: '1px solid #F0F0F0', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={700}>{selectedRoom.customer_name}</Typography>
                <Chip
                  size="small"
                  label={`${selectedRoom.reservation_date} ${String(selectedRoom.reservation_time).slice(0, 5)} · ${selectedRoom.party_size}명`}
                />
              </Box>

              {/* 메시지 목록 */}
              <Box sx={{ flex: 1, overflowY: 'auto', p: 2, backgroundColor: '#FCFAF8' }}>
                {messages.map((m) => {
                  const mine = m.sender_role === 'merchant';
                  return (
                    <Box key={m.id} sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', mb: 1 }}>
                      <Box
                        sx={{
                          maxWidth: '70%', px: 1.8, py: 1, borderRadius: 2.5,
                          backgroundColor: mine ? BRAND : '#FFFFFF',
                          color: mine ? '#FFFFFF' : 'text.primary',
                          border: mine ? 'none' : '1px solid #EEE',
                        }}
                      >
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {m.message}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ display: 'block', textAlign: 'right', mt: 0.3, opacity: 0.7 }}
                        >
                          {formatTime(m.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
                <div ref={bottomRef} />
              </Box>

              {/* 입력 */}
              <Box sx={{ display: 'flex', gap: 1, p: 2, borderTop: '1px solid #F0F0F0' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="답변을 입력하세요"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  inputProps={{ maxLength: 1000 }}
                />
                <Button
                  variant="contained"
                  endIcon={<SendIcon />}
                  disabled={!input.trim() || sending}
                  onClick={handleSend}
                  sx={{ backgroundColor: BRAND, '&:hover': { backgroundColor: BRAND_DARK }, flexShrink: 0 }}
                >
                  전송
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ChatInbox;
