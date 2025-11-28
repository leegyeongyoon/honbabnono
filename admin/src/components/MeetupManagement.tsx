import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

interface Meetup {
  id: string;
  title: string;
  hostName: string;
  location: string;
  date: string;
  time: string;
  currentParticipants: number;
  maxParticipants: number;
  category: string;
  status: '모집중' | '모집완료' | '진행중' | '종료' | '취소';
  createdAt: string;
}

const MeetupManagement: React.FC = () => {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMeetup, setSelectedMeetup] = useState<Meetup | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchMeetups();
  }, []);

  const fetchMeetups = async () => {
    try {
      const response = await axios.get<Meetup[]>('http://localhost:3001/api/admin/meetups');
      setMeetups(response.data);
    } catch (error) {
      console.error('모임 목록 로드 실패:', error);
    }
  };

  const handleMeetupAction = async (meetupId: string, action: 'cancel' | 'approve') => {
    try {
      await axios.post(`http://localhost:3001/api/admin/meetups/${meetupId}/${action}`);
      fetchMeetups();
      setDialogOpen(false);
    } catch (error) {
      console.error(`모임 ${action} 실패:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '모집중':
        return 'success';
      case '모집완료':
        return 'info';
      case '진행중':
        return 'warning';
      case '종료':
        return 'default';
      case '취소':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    return status;
  };

  const getCategoryText = (category: string) => {
    const categoryMap: { [key: string]: string } = {
      'korean': '한식',
      'japanese': '일식',
      'chinese': '중식',
      'western': '양식',
      'fusion': '퓨전',
      'cafe': '카페',
      'pub': '술집',
      'other': '기타'
    };
    return categoryMap[category] || category;
  };

  const filteredMeetups = meetups.filter(meetup =>
    meetup.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meetup.hostName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meetup.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        모임 관리
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="모임 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ width: 300 }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>모임명</TableCell>
              <TableCell>호스트</TableCell>
              <TableCell>장소</TableCell>
              <TableCell>카테고리</TableCell>
              <TableCell>일시</TableCell>
              <TableCell>참가자</TableCell>
              <TableCell>상태</TableCell>
              <TableCell>생성일</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredMeetups.map((meetup) => (
              <TableRow key={meetup.id}>
                <TableCell>{meetup.title}</TableCell>
                <TableCell>{meetup.hostName}</TableCell>
                <TableCell>{meetup.location}</TableCell>
                <TableCell>{getCategoryText(meetup.category)}</TableCell>
                <TableCell>
                  {new Date(meetup.date).toLocaleDateString()} {meetup.time}
                </TableCell>
                <TableCell>
                  {meetup.currentParticipants}/{meetup.maxParticipants}
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(meetup.status)}
                    color={getStatusColor(meetup.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(meetup.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedMeetup(meetup);
                      setDialogOpen(true);
                    }}
                  >
                    <VisibilityIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>모임 상세 정보</DialogTitle>
        <DialogContent>
          {selectedMeetup && (
            <Box sx={{ pt: 2 }}>
              <Typography variant="h6" gutterBottom>{selectedMeetup.title}</Typography>
              <Typography><strong>호스트:</strong> {selectedMeetup.hostName}</Typography>
              <Typography><strong>장소:</strong> {selectedMeetup.location}</Typography>
              <Typography><strong>카테고리:</strong> {getCategoryText(selectedMeetup.category)}</Typography>
              <Typography><strong>일시:</strong> {new Date(selectedMeetup.date).toLocaleDateString()} {selectedMeetup.time}</Typography>
              <Typography><strong>참가자:</strong> {selectedMeetup.currentParticipants}/{selectedMeetup.maxParticipants}명</Typography>
              <Typography><strong>상태:</strong> {getStatusText(selectedMeetup.status)}</Typography>
              <Typography><strong>생성일:</strong> {new Date(selectedMeetup.createdAt).toLocaleString()}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>닫기</Button>
          {selectedMeetup && selectedMeetup.status === '모집중' && (
            <>
              <Button
                onClick={() => handleMeetupAction(selectedMeetup.id, 'approve')}
                color="success"
                startIcon={<CheckCircleIcon />}
              >
                승인
              </Button>
              <Button
                onClick={() => handleMeetupAction(selectedMeetup.id, 'cancel')}
                color="error"
                startIcon={<CancelIcon />}
              >
                취소
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetupManagement;