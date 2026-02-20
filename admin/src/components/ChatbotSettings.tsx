import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import apiClient from '../utils/api';

interface ChatbotSetting {
  id: number;
  trigger_type: string;
  message_type: string;
  title: string;
  message: string;
  trigger_time_before: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface EditDialogState {
  open: boolean;
  setting: ChatbotSetting | null;
}

const ChatbotSettings: React.FC = () => {
  const [settings, setSettings] = useState<ChatbotSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [editDialog, setEditDialog] = useState<EditDialogState>({ open: false, setting: null });
  const [editForm, setEditForm] = useState({
    title: '',
    message: '',
    trigger_time_before: 0,
    is_active: true
  });

  useEffect(() => {
    fetchChatbotSettings();
  }, []);

  const fetchChatbotSettings = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: ChatbotSetting[] }>(
        '/api/admin/chatbot/settings'
      );
      
      if ((response.data as any).success) {
        const data = (response.data as any).data;
        setSettings(Array.isArray(data) ? data : []);
      } else {
        setSettings([]);
      }
    } catch (error) {
      console.error('챗봇 설정 로드 실패:', error);
      setSettings([]);
      setSnackbar({
        open: true,
        message: '챗봇 설정을 불러오는데 실패했습니다.',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (setting: ChatbotSetting) => {
    setEditForm({
      title: setting.title,
      message: setting.message,
      trigger_time_before: setting.trigger_time_before,
      is_active: setting.is_active
    });
    setEditDialog({ open: true, setting });
  };

  const handleSave = async () => {
    if (!editDialog.setting) return;

    try {
      const response = await apiClient.put(
        `/api/admin/chatbot/settings/${editDialog.setting.id}`,
        editForm
      );

      if ((response.data as any).success) {
        setSnackbar({
          open: true,
          message: '챗봇 설정이 성공적으로 업데이트되었습니다.',
          severity: 'success'
        });
        
        // 설정 목록 새로고침
        await fetchChatbotSettings();
        
        // 다이얼로그 닫기
        setEditDialog({ open: false, setting: null });
      }
    } catch (error) {
      console.error('챗봇 설정 업데이트 실패:', error);
      setSnackbar({
        open: true,
        message: '챗봇 설정 업데이트에 실패했습니다.',
        severity: 'error'
      });
    }
  };

  const handleCancel = () => {
    setEditDialog({ open: false, setting: null });
  };

  const getTriggerTypeDisplay = (triggerType: string) => {
    switch (triggerType) {
      case 'meetup_start':
        return '약속 시작';
      case 'reminder_30min':
        return '30분 전 알림';
      case 'reminder_10min':
        return '10분 전 알림';
      case 'attendance_check':
        return '출석체크 안내';
      default:
        return triggerType;
    }
  };

  const getMessageTypeDisplay = (messageType: string) => {
    switch (messageType) {
      case 'welcome':
        return '환영';
      case 'reminder':
        return '알림';
      case 'instruction':
        return '안내';
      case 'warning':
        return '경고';
      default:
        return messageType;
    }
  };

  const getMessageTypeColor = (messageType: string) => {
    switch (messageType) {
      case 'welcome':
        return '#C9B59C';
      case 'reminder':
        return '#7A8A6E';
      case 'instruction':
        return '#D9CFC7';
      case 'warning':
        return '#B5857A';
      default:
        return '#888888';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="200px">
        <Typography>로딩 중...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
        <SmartToyIcon sx={{ mr: 1, color: '#C9B59C' }} />
        <Typography variant="h4">
          챗봇 메시지 설정
        </Typography>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2">
          약속 진행 중 자동으로 전송되는 챗봇 메시지를 설정할 수 있습니다.
          각 메시지는 특정 시간에 채팅방에 자동으로 전송됩니다.
        </Typography>
      </Alert>

      <Box sx={{ 
        display: 'grid', 
        gridTemplateColumns: { 
          xs: '1fr', 
          md: '1fr 1fr' 
        }, 
        gap: 3 
      }}>
        {settings.map((setting) => (
          <Card sx={{ height: '100%' }} key={setting.id}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ mb: 1 }}>
                      {getTriggerTypeDisplay(setting.trigger_type)}
                    </Typography>
                    <Box display="flex" gap={1} sx={{ mb: 1 }}>
                      <Chip 
                        label={getMessageTypeDisplay(setting.message_type)}
                        size="small"
                        sx={{ 
                          backgroundColor: getMessageTypeColor(setting.message_type),
                          color: 'white'
                        }}
                      />
                      {setting.trigger_time_before > 0 && (
                        <Chip
                          icon={<AccessTimeIcon />}
                          label={`${setting.trigger_time_before}분 전`}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Box>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={setting.is_active}
                        onChange={async (e) => {
                          try {
                            await apiClient.put(
                              `/api/admin/chatbot/settings/${setting.id}`,
                              { ...setting, is_active: e.target.checked }
                            );
                            await fetchChatbotSettings();
                            setSnackbar({
                              open: true,
                              message: `챗봇 메시지가 ${e.target.checked ? '활성화' : '비활성화'}되었습니다.`,
                              severity: 'success'
                            });
                          } catch (error) {
                            setSnackbar({
                              open: true,
                              message: '설정 변경에 실패했습니다.',
                              severity: 'error'
                            });
                          }
                        }}
                        size="small"
                      />
                    }
                    label="활성"
                    sx={{ margin: 0 }}
                  />
                </Box>

                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {setting.title}
                </Typography>

                <Box
                  sx={{
                    backgroundColor: '#f5f5f5',
                    padding: 2,
                    borderRadius: 1,
                    mb: 2,
                    minHeight: '100px',
                    maxHeight: '150px',
                    overflow: 'auto'
                  }}
                >
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      whiteSpace: 'pre-line',
                      fontSize: '0.85rem'
                    }}
                  >
                    {setting.message}
                  </Typography>
                </Box>

                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleEdit(setting)}
                  sx={{ 
                    borderColor: '#C9B59C',
                    color: '#C9B59C',
                    '&:hover': {
                      borderColor: '#B5A085',
                      backgroundColor: 'rgba(201, 181, 156, 0.1)'
                    }
                  }}
                >
                  편집
                </Button>
              </CardContent>
            </Card>
        ))}
      </Box>

      {/* 편집 다이얼로그 */}
      <Dialog
        open={editDialog.open}
        onClose={handleCancel}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          챗봇 메시지 편집
          {editDialog.setting && (
            <Typography variant="body2" color="textSecondary">
              {getTriggerTypeDisplay(editDialog.setting.trigger_type)}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="메시지 제목"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              sx={{ mb: 2 }}
            />
            
            <TextField
              fullWidth
              label="메시지 내용"
              multiline
              rows={6}
              value={editForm.message}
              onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
              sx={{ mb: 2 }}
              helperText="줄바꿈은 \\n을 사용해주세요. 예: 안녕하세요!\\n\\n즐거운 약속 되세요!"
            />

            {editDialog.setting?.trigger_type.includes('reminder') && (
              <TextField
                fullWidth
                type="number"
                label="알림 시간 (분 전)"
                value={editForm.trigger_time_before}
                onChange={(e) => setEditForm({ 
                  ...editForm, 
                  trigger_time_before: parseInt(e.target.value) || 0 
                })}
                sx={{ mb: 2 }}
                InputProps={{ inputProps: { min: 0, max: 60 } }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                />
              }
              label="메시지 활성화"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} startIcon={<CancelIcon />}>
            취소
          </Button>
          <Button 
            onClick={handleSave} 
            variant="contained" 
            startIcon={<SaveIcon />}
            sx={{ backgroundColor: '#C9B59C' }}
          >
            저장
          </Button>
        </DialogActions>
      </Dialog>

      {/* 스낵바 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChatbotSettings;