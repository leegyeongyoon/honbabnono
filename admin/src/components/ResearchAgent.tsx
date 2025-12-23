import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import apiClient from '../utils/api';

interface ResearchReport {
  id: number;
  report: any;
  date: string;
}

function ResearchAgent() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<ResearchReport[]>([]);
  const [currentReport, setCurrentReport] = useState<any>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [message, setMessage] = useState('리서치 에이전트가 준비되었습니다.');

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const response = await apiClient.get('/api/admin/research-reports');
      const data = response.data as { success: boolean; reports: ResearchReport[] };
      if (data.success) {
        setReports(data.reports);
      }
    } catch (error) {
      console.error('리포트 로드 실패:', error);
    }
  };

  const handleRunResearch = async () => {
    if (loading) return;
    
    setLoading(true);
    setMessage('리서치를 실행 중입니다...');
    
    try {
      const systemPrompt = `당신은 혼밥(혼자 밥 먹기) 플랫폼 '혼밥시러'의 마켓 리서치 전문가입니다. 
아래 요청에 대해 다음 형식의 JSON으로 응답해주세요:

{
  "summary": "핵심 인사이트 요약 (2-3문장)",
  "trends": ["트렌드1", "트렌드2", "트렌드3"],
  "insights": [
    {
      "title": "인사이트 제목",
      "content": "상세 내용",
      "impact": "비즈니스 영향도 (high/medium/low)"
    }
  ],
  "recommendations": ["권장사항1", "권장사항2"],
  "keywords": ["핵심키워드1", "핵심키워드2"],
  "competitive_analysis": "경쟁사 분석 내용",
  "next_actions": ["다음 액션1", "다음 액션2"]
}`;

      const dailyPrompt = customPrompt || `혼밥 관련 최신 트렌드와 시장 동향을 분석해주세요. 
특히 다음 항목들에 대해 분석해주세요:
- 혼밥 문화의 최신 변화
- 혼밥족 타겟 고객의 니즈 변화  
- 관련 앱/서비스의 시장 동향
- SNS상 혼밥 관련 키워드 트렌드
- 경쟁사 동향 및 차별화 포인트`;

      const response = await apiClient.post('/api/admin/research-agent', {
        systemPrompt,
        dailyPrompt,
        sources: [],
        customKeywords: ['혼밥', '혼밥시러', '혼자밥', '솔로다이닝', '1인식당']
      }, {
        timeout: 120000 // 2분 타임아웃 설정
      });

      const data = response.data as { success: boolean; result: any };
      if (data.success) {
        setCurrentReport(data.result);
        setMessage('리서치가 완료되었습니다!');
        await loadReports(); // 새 리포트 로드
      } else {
        setMessage('리서치 실행 중 오류가 발생했습니다.');
      }
    } catch (error: any) {
      console.error('리서치 실행 오류:', error);
      setMessage('리서치 실행 중 오류가 발생했습니다: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const renderReport = (report: any) => {
    if (!report) return null;

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            리서치 결과
          </Typography>
          
          {report.summary && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <strong>핵심 인사이트:</strong> {report.summary}
            </Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            {report.trends && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  <TrendingUpIcon sx={{ mr: 1 }} /> 주요 트렌드
                </Typography>
                {report.trends.map((trend: string, index: number) => (
                  <Chip key={index} label={trend} sx={{ mr: 1, mb: 1 }} />
                ))}
              </Paper>
            )}

            {report.keywords && (
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  핵심 키워드
                </Typography>
                {report.keywords.map((keyword: string, index: number) => (
                  <Chip key={index} label={keyword} variant="outlined" sx={{ mr: 1, mb: 1 }} />
                ))}
              </Paper>
            )}
          </Box>

          {report.insights && (
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">세부 인사이트 ({report.insights.length}개)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {report.insights.map((insight: any, index: number) => (
                  <Paper key={index} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {insight.title}
                      <Chip 
                        label={insight.impact} 
                        size="small" 
                        color={insight.impact === 'high' ? 'error' : insight.impact === 'medium' ? 'warning' : 'default'}
                        sx={{ ml: 1 }}
                      />
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {insight.content}
                    </Typography>
                  </Paper>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {report.recommendations && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">권장 사항</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {report.recommendations.map((rec: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText primary={rec} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}

          {report.competitive_analysis && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">경쟁사 분석</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography>{report.competitive_analysis}</Typography>
              </AccordionDetails>
            </Accordion>
          )}

          {report.next_actions && (
            <Accordion sx={{ mt: 1 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6">다음 액션</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {report.next_actions.map((action: string, index: number) => (
                    <ListItem key={index}>
                      <ListItemText primary={action} />
                    </ListItem>
                  ))}
                </List>
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>
    );
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

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          혼밥시러 Market Intelligence
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          혼밥 관련 인사이트를 수집하고 시장 동향을 분석합니다.
        </Typography>

        <TextField
          label="커스텀 리서치 요청 (선택사항)"
          multiline
          rows={3}
          fullWidth
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="예: 20대 여성 타겟 혼밥족의 최신 소비 패턴을 분석해주세요"
          sx={{ mb: 3 }}
        />
        
        <Button 
          variant="contained" 
          onClick={handleRunResearch}
          disabled={loading}
          sx={{ bgcolor: '#C9B59C', '&:hover': { bgcolor: '#A08B7A' } }}
          startIcon={loading ? <CircularProgress size={20} /> : <PsychologyIcon />}
        >
          {loading ? '리서치 실행 중...' : '리서치 시작'}
        </Button>
      </Paper>

      {currentReport && renderReport(currentReport)}

      {reports.length > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            과거 리포트 ({reports.length}개)
          </Typography>
          {reports.slice(0, 5).map((report) => (
            <Card key={report.id} sx={{ mb: 2, cursor: 'pointer' }}
                  onClick={() => setCurrentReport(report.report)}>
              <CardContent>
                <Typography variant="subtitle2">
                  {new Date(report.date).toLocaleString('ko-KR')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {report.report?.summary || 'AI 리서치 리포트'}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Paper>
      )}
    </Box>
  );
}

export default ResearchAgent;