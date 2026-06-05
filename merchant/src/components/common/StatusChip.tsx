import React from 'react';
import Chip from '@mui/material/Chip';
import { StatusDef, resolveStatus } from '../../theme';

interface StatusChipProps {
  status?: string;
  map: Record<string, StatusDef>;
  size?: 'small' | 'medium';
  variant?: 'filled' | 'outlined';
}

/** 도메인 상태 칩 — 중앙 상태맵에서 라벨/색 해석 */
const StatusChip: React.FC<StatusChipProps> = ({ status, map, size = 'small', variant = 'filled' }) => {
  const { label, color } = resolveStatus(map, status);
  return <Chip label={label} color={color} size={size} variant={variant} />;
};

export default StatusChip;
