import React from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

interface LoadingSkeletonProps {
  variant: 'table' | 'cards' | 'dashboard';
  rows?: number;
  columns?: number;
  count?: number;
}

/** 로딩 골격 — CircularProgress 대체. 데이터 구조를 미리 보여줘 체감 지연 감소 */
const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant, rows = 5, columns = 4, count = 4 }) => {
  if (variant === 'table') {
    return (
      <Table>
        <TableBody>
          {Array.from({ length: rows }).map((_, r) => (
            <TableRow key={r}>
              {Array.from({ length: columns }).map((__, c) => (
                <TableCell key={c}>
                  <Skeleton variant="text" width={c === 0 ? '80%' : '60%'} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (variant === 'cards') {
    return (
      <Grid container spacing={2}>
        {Array.from({ length: count }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="rounded" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="50%" height={28} />
                  <Skeleton variant="text" width="70%" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // dashboard
  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Skeleton variant="rounded" width={48} height={48} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="50%" height={28} />
                  <Skeleton variant="text" width="70%" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card><CardContent><Skeleton variant="rectangular" height={220} /></CardContent></Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card><CardContent><Skeleton variant="rectangular" height={220} /></CardContent></Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LoadingSkeleton;
