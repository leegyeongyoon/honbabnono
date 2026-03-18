import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Pagination,
  CircularProgress,
  Alert,
  Snackbar,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';
import ForumIcon from '@mui/icons-material/Forum';
import GroupIcon from '@mui/icons-material/Group';
import TodayIcon from '@mui/icons-material/Today';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../utils/api';

interface ChatRoom {
  id: string;
  meetup_id: string;
  meetup_title: string;
  meetup_status: string;
  message_count: number;
  participant_count: number;
  last_message_at: string | null;
}

interface ChatMessage {
  id: number;
  sender_id: string;
  sender_name: string;
  sender_image: string | null;
  content: string;
  created_at: string;
  is_deleted: boolean;
}

interface ChatStats {
  total_rooms: number;
  total_messages: number;
  active_rooms: number;
  today_messages: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

const MEETUP_STATUS_LABELS: Record<string, string> = {
  open: '모집중',
  confirmed: '확정',
  completed: '완료',
  cancelled: '취소',
};

const ChatManagement: React.FC = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [stats, setStats] = useState<ChatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Message dialog
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagePage, setMessagePage] = useState(1);
  const [messageTotalPages, setMessageTotalPages] = useState(1);

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<ChatMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/admin/chat-rooms', {
        params: {
          page,
          limit: 20,
          search,
        },
      });
      const data = response.data as any;
      setRooms(Array.isArray(data.rooms) ? data.rooms : []);
      if (data.pagination) {
        setTotalPages(data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('채팅방 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '채팅방 목록을 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/admin/chat/stats');
      const data = response.data as any;
      if (data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('채팅 통계 로드 실패:', error);
    }
  }, []);

  const fetchMessages = useCallback(async (roomId: string, msgPage: number) => {
    try {
      setMessagesLoading(true);
      const response = await apiClient.get(`/api/admin/chat-rooms/${roomId}/messages`, {
        params: {
          page: msgPage,
          limit: 50,
        },
      });
      const data = response.data as any;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
      if (data.pagination) {
        setMessageTotalPages(data.pagination.totalPages || 1);
      }
    } catch (error) {
      console.error('메시지 로드 실패:', error);
      setSnackbar({
        open: true,
        message: '메시지를 불러오는데 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleRoomClick = (room: ChatRoom) => {
    setSelectedRoom(room);
    setMessagePage(1);
    setMessageDialogOpen(true);
    fetchMessages(room.id, 1);
  };

  const handleMessagePageChange = (_: React.ChangeEvent<unknown>, newPage: number) => {
    setMessagePage(newPage);
    if (selectedRoom) {
      fetchMessages(selectedRoom.id, newPage);
    }
  };

  const handleDeleteClick = (message: ChatMessage) => {
    setMessageToDelete(message);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!messageToDelete) return;

    try {
      setDeleting(true);
      await apiClient.delete(`/api/admin/chat-messages/${messageToDelete.id}`);
      setSnackbar({
        open: true,
        message: '메시지가 삭제되었습니다.',
        severity: 'success',
      });
      setDeleteDialogOpen(false);
      setMessageToDelete(null);

      // Refresh messages
      if (selectedRoom) {
        fetchMessages(selectedRoom.id, messagePage);
      }
      fetchStats();
    } catch (error) {
      console.error('메시지 삭제 실패:', error);
      setSnackbar({
        open: true,
        message: '메시지 삭제에 실패했습니다.',
        severity: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const StatCard = ({ title, value, icon, color }: {
    title: string;
    value: number | string;
    icon: React.ReactNode;
    color: string;
  }) => (
    <Card>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Typography variant="h5" component="div">
              {value}
            </Typography>
          </Box>
          <Box sx={{ color }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (loading && rooms.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={400}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        채팅 관리
      </Typography>

      {/* 통계 카드 */}
      {stats && (
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            sm: '1fr 1fr',
            md: '1fr 1fr 1fr 1fr',
          },
          gap: 3,
          mb: 4,
        }}>
          <StatCard
            title="전체 채팅방"
            value={stats.total_rooms}
            icon={<ChatIcon fontSize="large" />}
            color="#2196f3"
          />
          <StatCard
            title="전체 메시지"
            value={stats.total_messages.toLocaleString()}
            icon={<ForumIcon fontSize="large" />}
            color="#4caf50"
          />
          <StatCard
            title="활성 채팅방"
            value={stats.active_rooms}
            icon={<GroupIcon fontSize="large" />}
            color="#ff9800"
          />
          <StatCard
            title="오늘 메시지"
            value={stats.today_messages}
            icon={<TodayIcon fontSize="large" />}
            color="#9c27b0"
          />
        </Box>
      )}

      {/* 검색 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <TextField
          placeholder="모임 제목으로 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flexGrow: 1, maxWidth: 400 }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          sx={{
            backgroundColor: '#C9B59C',
            '&:hover': {
              backgroundColor: '#A08B7A',
            },
          }}
        >
          검색
        </Button>
      </Box>

      {/* 채팅방 테이블 */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>모임 제목</TableCell>
              <TableCell align="center">참여자</TableCell>
              <TableCell align="center">메시지 수</TableCell>
              <TableCell>최근 활동</TableCell>
              <TableCell>모임 상태</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => (
              <TableRow
                key={room.id}
                hover
                sx={{ cursor: 'pointer' }}
                onClick={() => handleRoomClick(room)}
              >
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: 300,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {room.meetup_title}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip
                    label={`${room.participant_count}명`}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="center">
                  {room.message_count.toLocaleString()}
                </TableCell>
                <TableCell>{formatDate(room.last_message_at)}</TableCell>
                <TableCell>
                  <Chip
                    label={MEETUP_STATUS_LABELS[room.meetup_status] || room.meetup_status}
                    size="small"
                    color={
                      room.meetup_status === 'open'
                        ? 'success'
                        : room.meetup_status === 'confirmed'
                        ? 'info'
                        : room.meetup_status === 'completed'
                        ? 'default'
                        : 'error'
                    }
                  />
                </TableCell>
              </TableRow>
            ))}
            {rooms.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Typography color="textSecondary" sx={{ py: 4 }}>
                    채팅방이 없습니다.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* 페이지네이션 */}
      <Box display="flex" justifyContent="center" mt={3}>
        <Pagination
          count={totalPages}
          page={page}
          onChange={(_, newPage) => setPage(newPage)}
          color="primary"
        />
      </Box>

      {/* 메시지 보기 다이얼로그 */}
      <Dialog
        open={messageDialogOpen}
        onClose={() => setMessageDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">
              {selectedRoom?.meetup_title}
            </Typography>
            <Chip
              label={`${selectedRoom?.participant_count || 0}명 참여`}
              size="small"
              variant="outlined"
            />
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {messagesLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : messages.length === 0 ? (
            <Box display="flex" justifyContent="center" py={4}>
              <Typography color="textSecondary">메시지가 없습니다.</Typography>
            </Box>
          ) : (
            <>
              <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                {messages.map((message, index) => (
                  <React.Fragment key={message.id}>
                    <ListItem
                      alignItems="flex-start"
                      sx={{
                        opacity: message.is_deleted ? 0.5 : 1,
                        backgroundColor: message.is_deleted ? '#f5f5f5' : 'transparent',
                      }}
                      secondaryAction={
                        !message.is_deleted && (
                          <Tooltip title="메시지 삭제">
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={() => handleDeleteClick(message)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )
                      }
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={message.sender_image || undefined}
                          sx={{ backgroundColor: '#C9B59C' }}
                        >
                          {message.sender_name?.[0] || '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle2">
                              {message.sender_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {formatMessageTime(message.created_at)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          message.is_deleted ? (
                            <Typography
                              variant="body2"
                              color="textSecondary"
                              sx={{ fontStyle: 'italic' }}
                            >
                              삭제된 메시지입니다.
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                            >
                              {message.content}
                            </Typography>
                          )
                        }
                      />
                    </ListItem>
                    {index < messages.length - 1 && <Divider variant="inset" component="li" />}
                  </React.Fragment>
                ))}
              </List>

              {/* 메시지 페이지네이션 */}
              {messageTotalPages > 1 && (
                <Box display="flex" justifyContent="center" mt={2}>
                  <Pagination
                    count={messageTotalPages}
                    page={messagePage}
                    onChange={handleMessagePageChange}
                    color="primary"
                    size="small"
                  />
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMessageDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>

      {/* 메시지 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>메시지 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            이 메시지를 삭제하시겠습니까?
          </Typography>
          {messageToDelete && (
            <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#F9F8F6' }}>
              <Typography variant="subtitle2" gutterBottom>
                {messageToDelete.sender_name}
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {messageToDelete.content}
              </Typography>
            </Paper>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>취소</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : '삭제'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatManagement;
