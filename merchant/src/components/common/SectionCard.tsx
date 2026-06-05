import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';

interface SectionCardProps {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
}

/** 섹션 카드 — 선택적 헤더(타이틀+액션) + 본문 */
const SectionCard: React.FC<SectionCardProps> = ({ title, action, children, noPadding }) => (
  <Card>
    {title && (
      <>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2.5,
            py: 1.75,
          }}
        >
          <Typography variant="h6">{title}</Typography>
          {action}
        </Box>
        <Divider />
      </>
    )}
    {noPadding ? children : <CardContent>{children}</CardContent>}
  </Card>
);

export default SectionCard;
