import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { Psychology as PsychologyIcon } from '@mui/icons-material';

function ResearchAgent() {
  const [message] = React.useState('리서치 에이전트가 준비되었습니다.');

  const handleRunResearch = () => {
    alert('리서치 기능이 곧 구현됩니다!');
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700, color: '#4C422C' }}>
        <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
        리서치 에이전트
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        {message}
      </Alert>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          밥동무 Market Intelligence
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          혼밥 관련 인사이트를 수집하고 SNS 콘텐츠를 자동 생성합니다.
        </Typography>
        
        <Button 
          variant="contained" 
          onClick={handleRunResearch}
          sx={{ bgcolor: '#C9B59C', '&:hover': { bgcolor: '#A08B7A' } }}
        >
          리서치 시작
        </Button>
      </Paper>
    </Box>
  );
}

export default ResearchAgent;