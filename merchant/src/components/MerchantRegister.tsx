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
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import StoreIcon from '@mui/icons-material/Store';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import apiClient from '../utils/api';

interface MerchantRegisterProps {
  onBack: () => void;
  token: string;
  existingStatus?: string | null;
}

interface DocUploadState {
  file: File | null;
  preview: string | null;
  uploading: boolean;
  uploaded: boolean;
  url: string | null;
  error: string | null;
}

const steps = ['사업자 정보 입력', '계좌 정보 입력', '서류 업로드', '신청 완료'];

const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';

const INITIAL_DOC_STATE: DocUploadState = {
  file: null,
  preview: null,
  uploading: false,
  uploaded: false,
  url: null,
  error: null,
};

const MerchantRegister: React.FC<MerchantRegisterProps> = ({ onBack, token, existingStatus }) => {
  const [activeStep, setActiveStep] = useState(existingStatus === 'pending' ? 3 : 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Step 1: Business info
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [representativeName, setRepresentativeName] = useState('');

  // Step 2: Document uploads
  const [businessLicense, setBusinessLicense] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const [businessPermit, setBusinessPermit] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const [bankAccountCopy, setBankAccountCopy] = useState<DocUploadState>({ ...INITIAL_DOC_STATE });
  const bizLicenseRef = useRef<HTMLInputElement | null>(null);
  const bizPermitRef = useRef<HTMLInputElement | null>(null);
  const bankCopyRef = useRef<HTMLInputElement | null>(null);

  // Step 3: Bank info
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankHolder, setBankHolder] = useState('');

  const formatBusinessNumber = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
  };

  const handleBusinessNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBusinessNumber(formatBusinessNumber(e.target.value));
  };

  const isStep1Valid = businessNumber.replace(/\D/g, '').length === 10 && businessName.trim() && representativeName.trim();
  const isStep2Valid = businessLicense.uploaded; // 사업자등록증은 필수
  const isStep3Valid = bankName.trim() && bankAccount.trim() && bankHolder.trim();

  // File upload handler
  const handleFileSelect = async (
    file: File,
    docType: string,
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    // Preview
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
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleRemoveFile = (
    setter: React.Dispatch<React.SetStateAction<DocUploadState>>
  ) => {
    setter({ ...INITIAL_DOC_STATE });
  };

  // Step 1 -> 2: 점주 등록 (사업자 정보 + 계좌 정보 함께 전송, merchant record 생성 후 서류 업로드 가능)
  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      localStorage.setItem('merchantToken', token);

      await apiClient.post('/api/merchants/register', {
        business_number: businessNumber.replace(/-/g, ''),
        business_name: businessName.trim(),
        representative_name: representativeName.trim(),
        bank_name: bankName.trim(),
        bank_account: bankAccount.trim(),
        bank_holder: bankHolder.trim(),
      });

      setActiveStep(2);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || '점주 등록 신청 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAndBack = () => {
    localStorage.removeItem('merchantToken');
    localStorage.removeItem('merchantData');
    onBack();
  };

  // File upload card component
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
          <CircularProgress size={32} sx={{ color: BRAND }} />
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
              sx={{
                maxWidth: '100%',
                maxHeight: 120,
                objectFit: 'contain',
                borderRadius: 1,
              }}
            />
          ) : (
            <InsertDriveFileIcon sx={{ fontSize: 40, color: '#999' }} />
          )}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {state.file?.name}
          </Typography>
        </Box>
      ) : (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{ cursor: 'pointer', py: 1 }}
        >
          <CloudUploadIcon sx={{ fontSize: 36, color: '#BBB', mb: 0.5 }} />
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

  // Pending/completed state
  if (activeStep === 3) {
    const isPending = existingStatus === 'pending' || !existingStatus;
    const isRejected = existingStatus === 'rejected';

    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#FAF6F3',
          px: 2,
        }}
      >
        <Card sx={{ width: '100%', maxWidth: 500, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box sx={{ mb: 3 }}>
              {isRejected ? (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: '#FFEBEE',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <Typography sx={{ fontSize: 36 }}>!</Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    backgroundColor: '#FFF8E1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  <HourglassEmptyIcon sx={{ fontSize: 36, color: '#F9A825' }} />
                </Box>
              )}
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              {isRejected ? '승인이 거절되었습니다' : '신청이 완료되었습니다'}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {isRejected
                ? '입력하신 사업자 정보를 다시 확인하고 재신청해 주세요.'
                : '관리자가 사업자 등록 정보를 검토 중입니다.\n승인이 완료되면 로그인하여 대시보드를 이용할 수 있습니다.'}
            </Typography>

            <Box
              sx={{
                backgroundColor: '#FAF6F3',
                borderRadius: 2,
                p: 2.5,
                mb: 3,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <CheckCircleOutlineIcon sx={{ color: '#4CAF50', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  처리 절차
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'left', lineHeight: 1.8 }}>
                1. 사업자등록번호 검증 (자동)<br />
                2. 관리자 서류 검토 (1~2 영업일)<br />
                3. 승인 완료 후 대시보드 이용 가능
              </Typography>
            </Box>

            <Button
              fullWidth
              variant="outlined"
              onClick={handleLogoutAndBack}
              sx={{
                py: 1.2,
                borderColor: BRAND,
                color: BRAND_DARK,
                fontWeight: 600,
                '&:hover': { borderColor: BRAND_DARK, backgroundColor: '#FAF6F3' },
              }}
            >
              로그인 화면으로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#FAF6F3',
        px: 2,
        py: 4,
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 560, borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <CardContent sx={{ p: 4 }}>
          {/* Header */}
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <StoreIcon sx={{ color: '#fff', fontSize: 28 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#333' }}>
              점주 등록 신청
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              사업자 정보를 입력하여 잇테이블 점주로 등록하세요
            </Typography>
          </Box>

          {/* Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
            {steps.slice(0, 3).map((label) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: BRAND },
                      '&.Mui-completed': { color: BRAND },
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Step 1: Business Info */}
          {activeStep === 0 && (
            <Box>
              <TextField
                fullWidth
                label="사업자등록번호"
                placeholder="000-00-00000"
                value={businessNumber}
                onChange={handleBusinessNumberChange}
                required
                sx={{ mb: 2 }}
                helperText="하이픈(-) 포함 자동 입력됩니다"
                inputProps={{ maxLength: 12 }}
              />
              <TextField
                fullWidth
                label="상호명"
                placeholder="매장 이름을 입력하세요"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="대표자명"
                placeholder="대표자 성명"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                required
                sx={{ mb: 3 }}
              />
              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!isStep1Valid}
                onClick={() => setActiveStep(1)}
                sx={{
                  py: 1.5,
                  background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                  fontWeight: 600,
                  fontSize: '1rem',
                  '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                  '&.Mui-disabled': { background: '#E0E0E0' },
                }}
              >
                다음
              </Button>
            </Box>
          )}

          {/* Step 2: Bank Info */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                정산금을 받으실 계좌 정보를 입력해주세요.
              </Typography>
              <TextField
                fullWidth
                label="은행명"
                placeholder="예: 국민은행"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="계좌번호"
                placeholder="- 없이 숫자만 입력"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value.replace(/\D/g, ''))}
                required
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="예금주"
                placeholder="통장에 표시된 이름"
                value={bankHolder}
                onChange={(e) => setBankHolder(e.target.value)}
                required
                sx={{ mb: 2 }}
              />

              <Divider sx={{ my: 2 }} />

              {/* Summary */}
              <Box sx={{ backgroundColor: '#FAF6F3', borderRadius: 2, p: 2, mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  입력 정보 확인
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  사업자번호: {businessNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  상호: {businessName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  대표자: {representativeName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  정산계좌: {bankName} {bankAccount}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <Button
                  variant="outlined"
                  onClick={() => setActiveStep(0)}
                  sx={{
                    flex: 1,
                    py: 1.3,
                    borderColor: '#CCC',
                    color: '#666',
                    fontWeight: 600,
                  }}
                >
                  이전
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={loading || !isStep3Valid}
                  sx={{
                    flex: 2,
                    py: 1.3,
                    background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                    '&.Mui-disabled': { background: '#E0E0E0' },
                  }}
                >
                  {loading ? <CircularProgress size={24} sx={{ color: '#fff' }} /> : '다음'}
                </Button>
              </Box>
            </Box>
          )}

          {/* Step 3: Document Uploads (merchant record now exists) */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                사업자 인증을 위한 서류를 업로드해주세요.
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
                  sx={{
                    flex: 1,
                    py: 1.3,
                    borderColor: '#CCC',
                    color: '#666',
                    fontWeight: 600,
                  }}
                >
                  건너뛰기
                </Button>
                <Button
                  variant="contained"
                  disabled={!isStep2Valid}
                  onClick={() => setActiveStep(3)}
                  sx={{
                    flex: 2,
                    py: 1.3,
                    background: `linear-gradient(135deg, ${BRAND} 0%, #D8BCA8 100%)`,
                    fontWeight: 600,
                    fontSize: '1rem',
                    '&:hover': { background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` },
                    '&.Mui-disabled': { background: '#E0E0E0' },
                  }}
                >
                  완료
                </Button>
              </Box>
            </Box>
          )}

          {/* Back to login */}
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="text"
              onClick={handleLogoutAndBack}
              sx={{ color: '#999', fontSize: '0.85rem' }}
            >
              로그인 화면으로 돌아가기
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default MerchantRegister;
