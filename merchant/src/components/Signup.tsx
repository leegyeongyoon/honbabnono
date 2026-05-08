import React, { useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Divider from '@mui/material/Divider';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import StoreIcon from '@mui/icons-material/Store';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import apiClient from '../utils/api';

interface SignupProps {
  onGoLogin: () => void;
  onSignupComplete: () => void;
}

interface DocUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  uploaded: boolean;
  url: string | null;
  error: string | null;
}

const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';

const steps = ['계정 생성', '사업자 정보', '서류 업로드', '신청 완료'];

const INITIAL_DOC_STATE: DocUploadState = {
  file: null,
  preview: null,
  uploading: false,
  uploaded: false,
  url: null,
  error: null,
};

const Signup: React.FC<SignupProps> = ({ onGoLogin, onSignupComplete }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Step 1: Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');

  // Step 2: Business
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');

  // Step 3: Document uploads
  const [businessLicense, setBusinessLicense] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const [businessPermit, setBusinessPermit] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const [bankAccountCopy, setBankAccountCopy] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const bizLicenseRef = useRef<HTMLInputElement>(null);
  const bizPermitRef = useRef<HTMLInputElement>(null);
  const bankCopyRef = useRef<HTMLInputElement>(null);

  // Saved token from step 1
  const [savedToken, setSavedToken] = useState('');

  const formatBizNum = (v: string) => {
    const d = v.replace(/\D/g, '').slice(0, 10);
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  };

  const isStep1Valid =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 6 &&
    password === passwordConfirm;

  const isStep2Valid =
    businessNumber.replace(/\D/g, '').length === 10 &&
    businessName.trim().length > 0 &&
    representativeName.trim().length > 0;

  // File upload handler
  const handleFileSelect = async (
    file: File,
    docType: string,
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    const preview = file.type.startsWith('image/')
      ? URL.createObjectURL(file)
      : null;

    setter({
      file,
      preview,
      uploading: true,
      uploaded: false,
      url: null,
      error: null,
    });

    try {
      const formData = new FormData();
      formData.append('document', file);
      formData.append('doc_type', docType);

      const res = await apiClient.post('/api/merchants/upload-doc', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setter((prev) => ({
        ...prev,
        uploading: false,
        uploaded: true,
        url: res.data.data?.url || null,
        error: null,
      }));
    } catch (err: any) {
      const msg = err.response?.data?.error || '파일 업로드에 실패했습니다.';
      setter((prev) => ({
        ...prev,
        uploading: false,
        uploaded: false,
        error: msg,
      }));
    }
  };

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    docType: string,
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file, docType, setter);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    setter({ ...INITIAL_DOC_STATE });
  };

  // Step 1: Create account
  const handleCreateAccount = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await apiClient.post('/api/auth/register', {
        email: email.trim(),
        password,
        name: name.trim(),
      });
      const token = res.data.token || res.data.accessToken;
      if (!token) {
        setError('회원가입은 성공했으나 토큰을 받지 못했습니다. 로그인해주세요.');
        return;
      }
      setSavedToken(token);
      localStorage.setItem('merchantToken', token);
      setActiveStep(1);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || '회원가입에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 2 -> Step 3: Register as merchant, then upload docs
  const handleRegisterMerchant = async () => {
    setError('');
    setLoading(true);
    try {
      localStorage.setItem('merchantToken', savedToken);
      await apiClient.post('/api/merchants/register', {
        business_number: businessNumber.replace(/-/g, ''),
        business_name: businessName.trim(),
        representative_name: representativeName.trim(),
        bank_name: bankName.trim() || undefined,
        bank_account: bankAccount.trim() || undefined,
        bank_holder: bankHolder.trim() || undefined,
      });
      setActiveStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || '점주 등록에 실패했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Doc upload card component
  const DocUploadCard = ({
    label,
    required,
    state,
    inputRef,
    docType,
    setter,
  }: {
    label: string;
    required: boolean;
    state: DocUploadState;
    inputRef: React.RefObject<HTMLInputElement | null>;
    docType: string;
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>;
  }) => (
    <Box
      sx={{
        border: '2px dashed',
        borderColor: state.uploaded ? '#4CAF50' : state.error ? '#D32F2F' : '#DDD',
        borderRadius: 2,
        p: 2,
        mb: 2,
        textAlign: 'center',
        backgroundColor: state.uploaded ? '#F1F8E9' : '#FAFAFA',
        transition: 'all 0.2s',
      }}
    >
      <input
        ref={inputRef as React.LegacyRef<HTMLInputElement>}
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => handleFileInputChange(e, docType, setter)}
      />

      {state.uploading ? (
        <Box sx={{ py: 2 }}>
          <CircularProgress size={28} sx={{ color: BRAND }} />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            업로드 중...
          </Typography>
        </Box>
      ) : state.uploaded ? (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
            <CheckCircleIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#4CAF50' }}>
              업로드 완료
            </Typography>
            <IconButton size="small" onClick={() => handleRemoveFile(setter)} sx={{ ml: 0.5 }}>
              <DeleteIcon sx={{ fontSize: 16, color: '#999' }} />
            </IconButton>
          </Box>
          {state.preview ? (
            <Box
              component="img"
              src={state.preview}
              alt={label}
              sx={{ maxWidth: '100%', maxHeight: 100, objectFit: 'contain', borderRadius: 1 }}
            />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 36, color: '#999' }} />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {state.file?.name}
          </Typography>
        </Box>
      ) : (
        <Box onClick={() => inputRef.current?.click()} sx={{ cursor: 'pointer', py: 1 }}>
          <CloudUploadIcon sx={{ fontSize: 32, color: '#BBB', mb: 0.5 }} />
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {label} {required ? '(필수)' : '(선택)'}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            JPG, PNG, PDF / 최대 10MB
          </Typography>
        </Box>
      )}

      {state.error && (
        <Typography variant="caption" color="error" sx={{ display: 'block', mt: 0.5 }}>
          {state.error}
        </Typography>
      )}
    </Box>
  );

  // Step 4 (index 3): Complete
  if (activeStep === 3) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#FAF6F3', px: 2 }}>
        <Card sx={{ width: '100%', maxWidth: 480, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ width: 72, height: 72, borderRadius: '50%', backgroundColor: '#E8F5E9', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
              <StoreIcon sx={{ fontSize: 36, color: '#4CAF50' }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              점주 등록 신청 완료
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3, lineHeight: 1.7 }}>
              사업자 정보 검토 후 승인이 완료되면<br />
              대시보드를 이용하실 수 있습니다.
            </Typography>

            <Box sx={{ backgroundColor: '#FAF6F3', borderRadius: 2, p: 2.5, mb: 3, textAlign: 'left' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>처리 절차</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                1. 사업자등록번호 검증 (자동)<br />
                2. 관리자 서류 검토 (1~2 영업일)<br />
                3. 승인 완료 후 로그인하여 이용
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="contained"
              onClick={() => {
                localStorage.removeItem('merchantToken');
                onSignupComplete();
              }}
              sx={{
                py: 1.3,
                background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                fontWeight: 600,
                '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
              }}
            >
              로그인 화면으로 이동
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#FAF6F3', px: 2, py: 4 }}>
      <Card sx={{ width: '100%', maxWidth: 520, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box sx={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 1.5 }}>
              <StoreIcon sx={{ color: '#fff', fontSize: 26 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
              점주 회원가입
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              잇테이블 점주로 등록하고 매장을 관리하세요
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.slice(0, 3).map((label) => (
              <Step key={label}>
                <StepLabel StepIconProps={{ sx: { '&.Mui-active': { color: BRAND }, '&.Mui-completed': { color: BRAND } } }}>
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Step 1: Account */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth label="이름" placeholder="대표자 성명"
                value={name} onChange={(e) => setName(e.target.value)}
                required sx={{ mb: 2 }}
              />
              <TextField
                fullWidth label="이메일" type="email" placeholder="example@store.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
                required sx={{ mb: 2 }} autoComplete="email"
              />
              <TextField
                fullWidth label="비밀번호" placeholder="6자 이상"
                type={showPw ? 'text' : 'password'}
                value={password} onChange={(e) => setPassword(e.target.value)}
                required sx={{ mb: 2 }} autoComplete="new-password"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPw(!showPw)}>
                        {showPw ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth label="비밀번호 확인" type="password"
                value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                required sx={{ mb: 3 }} autoComplete="new-password"
                error={passwordConfirm.length > 0 && password !== passwordConfirm}
                helperText={passwordConfirm.length > 0 && password !== passwordConfirm ? '비밀번호가 일치하지 않습니다' : ''}
              />
              <Button
                fullWidth variant="contained" size="large"
                disabled={loading || !isStep1Valid}
                onClick={handleCreateAccount}
                sx={{
                  py: 1.5,
                  background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                  fontWeight: 600, fontSize: '1rem',
                  '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                  '&.Mui-disabled': { background: '#E0E0E0' },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '다음'}
              </Button>
            </Box>
          )}

          {/* Step 2: Business Info */}
          {activeStep === 1 && (
            <Box>
              <TextField
                fullWidth label="사업자등록번호" placeholder="000-00-00000"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(formatBizNum(e.target.value))}
                required sx={{ mb: 2 }} inputProps={{ maxLength: 12 }}
                helperText="하이픈(-) 자동 입력됩니다"
              />
              <TextField
                fullWidth label="상호명 (매장명)" placeholder="잇테이블 강남점"
                value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                required sx={{ mb: 2 }}
              />
              <TextField
                fullWidth label="대표자명"
                value={representativeName} onChange={(e) => setRepresentativeName(e.target.value)}
                required sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }}>
                <Typography variant="caption" color="text.secondary">정산 계좌 (선택)</Typography>
              </Divider>

              <TextField
                fullWidth label="은행명" placeholder="국민은행"
                value={bankName} onChange={(e) => setBankName(e.target.value)}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth label="계좌번호" placeholder="숫자만 입력"
                value={bankAccount} onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth label="예금주"
                value={bankHolder} onChange={(e) => setBankHolder(e.target.value)}
                sx={{ mb: 3 }}
              />

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button variant="outlined" onClick={() => setActiveStep(0)}
                  sx={{ flex: 1, py: 1.3, borderColor: '#CCC', color: '#666', fontWeight: 600 }}>
                  이전
                </Button>
                <Button
                  variant="contained" onClick={handleRegisterMerchant}
                  disabled={loading || !isStep2Valid}
                  sx={{
                    flex: 2, py: 1.3,
                    background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                    fontWeight: 600, fontSize: '1rem',
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                    '&.Mui-disabled': { background: '#E0E0E0' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '다음'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 3: Document Uploads */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                사업자 인증을 위한 서류를 업로드해주세요. (나중에 업로드도 가능합니다)
              </Typography>

              <DocUploadCard
                label="사업자등록증"
                required={true}
                state={businessLicense}
                inputRef={bizLicenseRef}
                docType="business_license"
                setter={setBusinessLicense}
              />

              <DocUploadCard
                label="영업신고증"
                required={false}
                state={businessPermit}
                inputRef={bizPermitRef}
                docType="business_permit"
                setter={setBusinessPermit}
              />

              <DocUploadCard
                label="통장사본"
                required={false}
                state={bankAccountCopy}
                inputRef={bankCopyRef}
                docType="bank_account_copy"
                setter={setBankAccountCopy}
              />

              <Box sx={{ display: 'flex', gap: 1.5, mt: 1 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(3)}
                  sx={{ flex: 1, py: 1.3, borderColor: '#CCC', color: '#666', fontWeight: 600 }}
                >
                  건너뛰기
                </Button>
                <Button
                  variant="contained"
                  disabled={!businessLicense.uploaded}
                  onClick={() => setActiveStep(3)}
                  sx={{
                    flex: 2, py: 1.3,
                    background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                    fontWeight: 600, fontSize: '1rem',
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                    '&.Mui-disabled': { background: '#E0E0E0' },
                  }}
                >
                  완료
                </Button>
              </Box>
            </Box>
          )}

          {/* Footer: go to login */}
          <Divider sx={{ my: 2.5 }} />
          <Typography variant="body2" sx={{ textAlign: 'center', color: '#999' }}>
            이미 계정이 있으신가요?{' '}
            <Button variant="text" onClick={onGoLogin}
              sx={{ color: BRAND_DARK, fontWeight: 600, p: 0, minWidth: 'auto', textTransform: 'none' }}>
              로그인
            </Button>
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Signup;
