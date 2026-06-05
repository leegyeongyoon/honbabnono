import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  dense?: boolean;
}

/** 빈 상태 — 아이콘 + 제목 + 설명 + (선택)액션. 텍스트만 있던 빈 화면 대체 */
const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action, dense }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      py: dense ? 4 : 8,
      px: 2,
      color: 'text.secondary',
    }}
  >
    {icon && (
      <Box
        sx={{
          fontSize: dense ? 36 : 48,
          color: 'text.disabled',
          mb: 1.5,
          '& svg': { fontSize: 'inherit' },
        }}
      >
        {icon}
      </Box>
    )}
    <Typography variant={dense ? 'body2' : 'subtitle1'} sx={{ fontWeight: 600, color: 'text.primary' }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 360 }}>
        {description}
      </Typography>
    )}
    {action && <Box sx={{ mt: 2 }}>{action}</Box>}
  </Box>
);

export default EmptyState;
