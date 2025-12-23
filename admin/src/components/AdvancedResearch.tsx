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
  ListItemText,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Tab,
  Tabs,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Psychology as PsychologyIcon,
  ExpandMore as ExpandMoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Storage as StorageIcon,
  Analytics as AnalyticsIcon,
  Palette as PaletteIcon,
  PlayArrow as PlayIcon,
  ContentCopy as CopyIcon,
  Instagram as InstagramIcon,
  Tag as TagIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import apiClient from '../utils/api';

interface FullPipelineResult {
  date: string;
  collector: any;
  analyst: any;
  studio: any;
  complianceCheck: any;
}

function AdvancedResearch() {
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [result, setResult] = useState<FullPipelineResult | null>(null);
  const [tone, setTone] = useState<'warm_story' | 'humor_meme'>('warm_story');
  const [customPrompt, setCustomPrompt] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [savedReports, setSavedReports] = useState<any[]>([]);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [copyContent, setCopyContent] = useState('');

  useEffect(() => {
    loadSavedReports();
  }, []);

  const loadSavedReports = async () => {
    try {
      const response = await apiClient.get('/api/admin/advanced/advanced-reports');
      const data = response.data as { success: boolean; reports: any[] };
      if (data.success) {
        setSavedReports(data.reports);
      }
    } catch (error) {
      console.error('리포트 로드 실패:', error);
    }
  };

  const handleRunPipeline = async () => {
    if (loading) return;
    
    setLoading(true);
    setCurrentStep('파이프라인 시작...');
    setResult(null);
    setActiveTab(0); // 첫 번째 탭으로 이동
    
    try {
      // 전체 파이프라인 실행
      setCurrentStep('🔍 Step 1/3: 데이터 수집 중... (최대 3분 소요)');
      
      const response = await apiClient.post('/api/admin/advanced/run-full-pipeline', {
        tone,
        customPrompt,
        keywords: [
          '혼밥', '혼자 밥', '혼자 고기', '혼술', '밥친구', '밥약',
          '점심 같이', '저녁 같이', '1인분', '2인분 주문',
          '샤브샤브 혼자', '전골 혼자', '회 혼자', '외로움',
          '자취', '지방 발령', '새 직장', '새 동네',
          '노쇼', '약속 파토', '번개 모임', '신뢰', '후기',
          '매너', '안전', '실명 인증', '본인확인', '보증금'
        ]
      }, {
        timeout: 180000 // 3분 타임아웃
      });

      const data = response.data as { success: boolean; result: FullPipelineResult };
      if (data.success && data.result) {
        console.log('🎉 파이프라인 결과:', data.result);
        setResult(data.result);
        setCurrentStep('✅ 파이프라인 완료!');
        await loadSavedReports(); // 새 리포트 로드
        
        // 결과가 있으면 자동으로 탭 전환
        if (data.result.studio) {
          setActiveTab(2); // 생성 콘텐츠 탭으로 이동
        } else if (data.result.analyst) {
          setActiveTab(1); // 분석 결과 탭으로 이동
        }
      } else {
        setCurrentStep('❌ 파이프라인 실행 실패');
        console.error('파이프라인 결과 없음:', data);
      }
    } catch (error: any) {
      console.error('파이프라인 실행 오류:', error);
      setCurrentStep('❌ 오류: ' + (error.response?.data?.error || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCopyContent = (content: string, title: string) => {
    setCopyContent(content);
    setSelectedContent(title);
    setCopyDialogOpen(true);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(copyContent);
    setCopyDialogOpen(false);
  };

  const renderCollectorResult = (data: any) => {
    if (!data) return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            수집된 데이터가 없습니다.
          </Typography>
        </CardContent>
      </Card>
    );

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <StorageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            수집된 데이터
          </Typography>
          
          {data.keyTrends && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>주요 트렌드</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {data.keyTrends.map((trend: string, idx: number) => (
                  <Chip key={idx} label={trend} color="primary" variant="outlined" />
                ))}
              </Box>
            </Box>
          )}

          {data.sources && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>수집된 소스 ({data.sources.length}개)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <List>
                  {data.sources.map((source: any, idx: number) => (
                    <ListItem key={idx}>
                      <ListItemText
                        primary={source.title}
                        secondary={
                          <>
                            <Typography variant="body2">{source.summary}</Typography>
                            <Chip label={source.type} size="small" sx={{ mt: 1 }} />
                          </>
                        }
                      />
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

  const renderAnalystResult = (data: any) => {
    if (!data) return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            분석 결과가 없습니다.
          </Typography>
        </CardContent>
      </Card>
    );

    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <AnalyticsIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            분석 인사이트
          </Typography>

          {data.clusters && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                핵심 클러스터
              </Typography>
              {data.clusters.map((cluster: any, idx: number) => (
                <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                  <Typography variant="h6" color="primary">{cluster.name}</Typography>
                  <Typography variant="body1" sx={{ my: 1 }}>
                    "{cluster.oneLiner}"
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    인사이트: {cluster.whatItMeansForBapdongmu || cluster.insight}
                  </Typography>
                </Paper>
              ))}
            </Box>
          )}

          {data.hypothesesToValidate && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>검증할 가설 ({data.hypothesesToValidate.length}개)</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {data.hypothesesToValidate.map((hypo: any, idx: number) => (
                  <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      가설: {hypo.hypothesis}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      이유: {hypo.why}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      테스트 방법: {hypo.howToTest?.join(', ')}
                    </Typography>
                  </Paper>
                ))}
              </AccordionDetails>
            </Accordion>
          )}

          {data.risksAndFixes && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>리스크 & 해결방안</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {data.risksAndFixes.map((risk: any, idx: number) => (
                  <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" color="error">
                      리스크: {risk.risk}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      왜 지금?: {risk.whyNow}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      제품 개선: {risk.productFix?.join(', ')}
                    </Typography>
                    <Typography variant="body2">
                      카피 앵글: {risk.copyAngle?.join(', ')}
                    </Typography>
                  </Paper>
                ))}
              </AccordionDetails>
            </Accordion>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderStudioResult = (data: any) => {
    if (!data) return (
      <Card>
        <CardContent>
          <Typography variant="body2" color="text.secondary">
            생성된 콘텐츠가 없습니다.
          </Typography>
        </CardContent>
      </Card>
    );

    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            <PaletteIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            생성된 콘텐츠
          </Typography>

          {/* Threads 콘텐츠 */}
          {data.threadsDrafts && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                <TagIcon sx={{ mr: 1 }} />
                Threads 콘텐츠
              </Typography>
              {data.threadsDrafts.map((thread: any, idx: number) => (
                <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={thread.type === 'long' ? '롱폼' : '숏폼'} 
                      size="small" 
                      color={thread.type === 'long' ? 'primary' : 'default'}
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleCopyContent(
                        `${thread.hook}\n\n${thread.body}\n\n${thread.cta}\n\n${thread.hashtags?.join(' ')}`,
                        `Threads ${thread.type}`
                      )}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body1" fontWeight="bold">{thread.hook}</Typography>
                  <Typography variant="body2" sx={{ my: 1, whiteSpace: 'pre-wrap' }}>
                    {thread.body}
                  </Typography>
                  <Typography variant="body2" color="primary">{thread.cta}</Typography>
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {thread.hashtags?.map((tag: string, i: number) => (
                      <Chip key={i} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {/* Instagram 콘텐츠 */}
          {data.instagramDrafts && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                <InstagramIcon sx={{ mr: 1 }} />
                Instagram 콘텐츠
              </Typography>
              {data.instagramDrafts.map((insta: any, idx: number) => (
                <Paper key={idx} sx={{ p: 2, mb: 2, bgcolor: '#fef5e7' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Chip 
                      label={insta.format} 
                      size="small" 
                      color="secondary"
                    />
                    <IconButton
                      size="small"
                      onClick={() => handleCopyContent(
                        `${insta.caption}\n\n${insta.hashtags?.join(' ')}`,
                        `Instagram ${insta.format}`
                      )}
                    >
                      <CopyIcon />
                    </IconButton>
                  </Box>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {insta.caption}
                  </Typography>
                  
                  {insta.carouselSlides && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" fontWeight="bold">캐러셀 슬라이드:</Typography>
                      {insta.carouselSlides.map((slide: any) => (
                        <Paper key={slide.slideNo} sx={{ p: 1, mt: 1, bgcolor: 'white' }}>
                          <Typography variant="caption">슬라이드 {slide.slideNo}</Typography>
                          <Typography variant="body2" fontWeight="bold">{slide.headline}</Typography>
                          <Typography variant="caption">{slide.sub}</Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            비주얼: {slide.visual}
                          </Typography>
                        </Paper>
                      ))}
                    </Box>
                  )}
                  
                  <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {insta.hashtags?.map((tag: string, i: number) => (
                      <Chip key={i} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Paper>
              ))}
            </Box>
          )}

          {/* 이미지 기획 */}
          {data.imagePlans && (
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography>
                  <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  이미지 기획 ({data.imagePlans.length}개)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                {data.imagePlans.map((image: any, idx: number) => (
                  <Paper key={idx} sx={{ p: 2, mb: 2 }}>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {image.name} ({image.style})
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      컨셉: {image.concept}
                    </Typography>
                    <Typography variant="body2">
                      구성: {image.shotOrLayout?.join(', ')}
                    </Typography>
                    {image.overlayText && (
                      <Typography variant="body2">
                        텍스트: {image.overlayText.join(', ')}
                      </Typography>
                    )}
                    {image.aiPromptKR && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight="bold">AI 프롬프트 (한글):</Typography>
                        <Typography variant="caption" display="block">{image.aiPromptKR}</Typography>
                      </Box>
                    )}
                    {image.aiPromptEN && (
                      <Box sx={{ mt: 1, p: 1, bgcolor: '#f0f0f0', borderRadius: 1 }}>
                        <Typography variant="caption" fontWeight="bold">AI Prompt (English):</Typography>
                        <Typography variant="caption" display="block">{image.aiPromptEN}</Typography>
                      </Box>
                    )}
                  </Paper>
                ))}
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
        고급 리서치 파이프라인
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight="bold">
          🚀 3단계 자동 파이프라인
        </Typography>
        <Typography variant="body2">
          1️⃣ Collector: 혼밥 관련 신호 수집 → 
          2️⃣ Analyst: 패턴 분석 및 인사이트 도출 → 
          3️⃣ Studio: Threads/Instagram 콘텐츠 생성
        </Typography>
      </Alert>

      {/* 컨트롤 패널 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          파이프라인 설정
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>콘텐츠 톤</Typography>
          <ToggleButtonGroup
            value={tone}
            exclusive
            onChange={(e, newTone) => newTone && setTone(newTone)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value="warm_story">
              🤗 따뜻한 스토리텔링
            </ToggleButton>
            <ToggleButton value="humor_meme">
              😄 유머와 밈
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <TextField
          label="커스텀 프롬프트 (선택사항)"
          multiline
          rows={3}
          fullWidth
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="예: 20대 직장인 타겟으로 점심 혼밥 문화 분석"
          sx={{ mb: 3 }}
        />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            variant="contained"
            size="large"
            onClick={handleRunPipeline}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <PlayIcon />}
            sx={{ 
              bgcolor: '#C9B59C', 
              '&:hover': { bgcolor: '#A08B7A' },
              minWidth: 200
            }}
          >
            {loading ? '실행 중...' : '전체 파이프라인 실행'}
          </Button>
          
          {currentStep && (
            <Typography variant="body2" color="text.secondary">
              {currentStep}
            </Typography>
          )}
        </Box>
      </Paper>

      {/* 결과 표시 */}
      {result ? (
        <Box>
          <Paper sx={{ p: 2, mb: 2, bgcolor: '#e8f5e9' }}>
            <Typography variant="body2" color="success.dark">
              ✅ 파이프라인 실행 완료 - {new Date(result.date).toLocaleString('ko-KR')}
            </Typography>
          </Paper>
          
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
            <Tab label="📦 수집 데이터" />
            <Tab label="📊 분석 결과" />
            <Tab label="✨ 생성 콘텐츠" />
            <Tab label="✅ 컴플라이언스" />
          </Tabs>

          {activeTab === 0 && renderCollectorResult(result.collector)}
          {activeTab === 1 && renderAnalystResult(result.analyst)}
          {activeTab === 2 && renderStudioResult(result.studio)}
          {activeTab === 3 && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>컴플라이언스 체크</Typography>
                <List>
                  <ListItem>
                    <ListItemText 
                      primary="개인정보 미포함" 
                      secondary={result.complianceCheck?.noPII ? '✅ 통과' : '❌ 검토 필요'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="장문 인용 없음" 
                      secondary={result.complianceCheck?.noLongQuotes ? '✅ 통과' : '❌ 검토 필요'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="비방 내용 없음" 
                      secondary={result.complianceCheck?.noDefamation ? '✅ 통과' : '❌ 검토 필요'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText 
                      primary="데이팅 톤 배제" 
                      secondary={result.complianceCheck?.noDatingTone ? '✅ 통과' : '❌ 검토 필요'}
                    />
                  </ListItem>
                </List>
                {result.complianceCheck?.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2">참고사항:</Typography>
                    {result.complianceCheck.notes.map((note: string, idx: number) => (
                      <Typography key={idx} variant="body2" color="text.secondary">
                        • {note}
                      </Typography>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          )}
        </Box>
      ) : (
        !loading && (
          <Paper sx={{ p: 3, mt: 2, bgcolor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom color="text.secondary">
              아직 실행된 파이프라인이 없습니다
            </Typography>
            <Typography variant="body2" color="text.secondary">
              위의 "전체 파이프라인 실행" 버튼을 클릭하여 시작하세요.
            </Typography>
          </Paper>
        )
      )}

      {/* 과거 리포트 */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          저장된 리포트 ({savedReports.length}개)
        </Typography>
        {savedReports.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            아직 저장된 리포트가 없습니다. 위의 파이프라인을 실행해보세요!
          </Typography>
        ) : (
          savedReports.slice(0, 5).map((report) => (
            <Card 
              key={report.id} 
              sx={{ 
                mb: 2, 
                cursor: 'pointer',
                '&:hover': { bgcolor: '#f5f5f5' },
                border: '1px solid #e0e0e0'
              }}
              onClick={() => {
                console.log('리포트 선택:', report);
                setResult(report.report);
                setActiveTab(0); // 첫 번째 탭으로 이동
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {new Date(report.date).toLocaleString('ko-KR')}
                  </Typography>
                  <Chip label="클릭해서 보기" size="small" color="primary" />
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  📦 소스: {report.report?.collector?.sources?.length || 0}개 | 
                  📊 클러스터: {report.report?.analyst?.clusters?.length || 0}개 | 
                  ✏️ 콘텐츠: {(report.report?.studio?.threadsDrafts?.length || 0) + 
                           (report.report?.studio?.instagramDrafts?.length || 0)}개
                </Typography>
              </CardContent>
            </Card>
          ))
        )}
      </Paper>

      {/* 복사 다이얼로그 */}
      <Dialog open={copyDialogOpen} onClose={() => setCopyDialogOpen(false)}>
        <DialogTitle>콘텐츠 복사</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            {selectedContent} 콘텐츠가 준비되었습니다.
          </Typography>
          <TextField
            multiline
            rows={10}
            fullWidth
            value={copyContent}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialogOpen(false)}>취소</Button>
          <Button onClick={copyToClipboard} variant="contained">
            클립보드에 복사
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AdvancedResearch;