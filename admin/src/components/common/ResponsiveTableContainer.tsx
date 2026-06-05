import React from 'react';
import TableContainer from '@mui/material/TableContainer';
import Paper from '@mui/material/Paper';

interface ResponsiveTableContainerProps {
  minWidth?: number;
  children: React.ReactNode;
}

/**
 * 테이블 가로 스크롤 컨테이너 — 좁은 화면에서 다컬럼 테이블이 깨지지 않게.
 * 보조 컬럼은 셀에서 sx={{ display: { xs:'none', md:'table-cell' } }}로 숨기고,
 * 전체 데이터는 각 화면의 상세 Dialog가 커버한다.
 */
const ResponsiveTableContainer: React.FC<ResponsiveTableContainerProps> = ({ minWidth = 720, children }) => (
  <TableContainer
    component={Paper}
    elevation={0}
    sx={{
      overflowX: 'auto',
      width: '100%',
      border: '1px solid',
      borderColor: 'divider',
      '& table': { minWidth },
    }}
  >
    {children}
  </TableContainer>
);

export default ResponsiveTableContainer;
