import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/** 화면 상단 헤더 — 타이틀/부제 + 우측 액션 슬롯 통일 */
const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <Box
    sx={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: 2,
      alignItems: 'center',
      justifyContent: 'space-between',
      mb: 3,
    }}
  >
    <Box>
      <Typography variant="h4">{title}</Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {actions && (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
        {actions}
      </Box>
    )}
  </Box>
);

export default PageHeader;
