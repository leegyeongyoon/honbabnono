import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';

type StatColor = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  color?: StatColor;
  subtitle?: string;
}

/** KPI/요약 카드 — 색은 팔레트 키만 (hex 금지). 아이콘 박스 + 값 + 라벨 */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon, color = 'primary', subtitle }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {icon && (
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: (t) => alpha(t.palette[color].main, 0.12),
            color: `${color}.main`,
            '& svg': { fontSize: 26 },
          }}
        >
          {icon}
        </Box>
      )}
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap>
          {label}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="text.disabled">
            {subtitle}
          </Typography>
        )}
      </Box>
    </CardContent>
  </Card>
);

export default StatCard;
