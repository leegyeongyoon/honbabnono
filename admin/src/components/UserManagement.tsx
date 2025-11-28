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
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import axios from 'axios';

interface User {
  id: string;
  name: string;
  email: string;
  provider: string;
  isVerified: boolean;
  createdAt: string;
  lastLoginAt?: string;
  status: 'active' | 'blocked' | 'pending';
}

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get<User[]>(`${process.env.REACT_APP_API_URL}/admin/users`);
      setUsers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('사용자 목록 로드 실패:', error);
      setUsers([]);
    }
  };

  const handleUserAction = async (userId: string, action: 'block' | 'unblock' | 'verify') => {
    try {
      await axios.post(`${process.env.REACT_APP_API_URL}/admin/users/${userId}/${action}`);
      fetchUsers();
      setDialogOpen(false);
    } catch (error) {
      console.error(`사용자 ${action} 실패:`, error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'blocked':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'blocked':
        return '차단';
      case 'pending':
        return '대기';
      default:
        return status;
    }
  };

  const getProviderText = (provider: string) => {
    switch (provider) {
      case 'kakao':
        return '카카오';
      case 'google':
        return '구글';
      case 'email':
        return '이메일';
      default:
        return provider;
    }
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        사용자 관리
      </Typography>

      <Box sx={{ mb: 3 }}>
        <TextField
          placeholder="사용자 검색..."
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
              <TableCell>이름</TableCell>
              <TableCell>이메일</TableCell>
              <TableCell>로그인 방식</TableCell>
              <TableCell>인증 상태</TableCell>
              <TableCell>계정 상태</TableCell>
              <TableCell>가입일</TableCell>
              <TableCell>최근 로그인</TableCell>
              <TableCell>관리</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{getProviderText(user.provider)}</TableCell>
                <TableCell>
                  <Chip
                    label={user.isVerified ? '인증됨' : '미인증'}
                    color={user.isVerified ? 'success' : 'warning'}
                    size="small"
                    icon={user.isVerified ? <CheckCircleIcon /> : undefined}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusText(user.status)}
                    color={getStatusColor(user.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : '-'}
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedUser(user);
                      setDialogOpen(true);
                    }}
                  >
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>사용자 관리</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ pt: 2 }}>
              <Typography><strong>이름:</strong> {selectedUser.name}</Typography>
              <Typography><strong>이메일:</strong> {selectedUser.email}</Typography>
              <Typography><strong>상태:</strong> {getStatusText(selectedUser.status)}</Typography>
              <Typography><strong>인증:</strong> {selectedUser.isVerified ? '인증됨' : '미인증'}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>취소</Button>
          {selectedUser && (
            <>
              {!selectedUser.isVerified && (
                <Button
                  onClick={() => handleUserAction(selectedUser.id, 'verify')}
                  color="success"
                  startIcon={<CheckCircleIcon />}
                >
                  인증
                </Button>
              )}
              {selectedUser.status === 'active' ? (
                <Button
                  onClick={() => handleUserAction(selectedUser.id, 'block')}
                  color="error"
                  startIcon={<BlockIcon />}
                >
                  차단
                </Button>
              ) : (
                <Button
                  onClick={() => handleUserAction(selectedUser.id, 'unblock')}
                  color="success"
                >
                  차단 해제
                </Button>
              )}
            </>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;