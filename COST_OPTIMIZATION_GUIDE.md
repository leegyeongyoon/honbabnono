# AWS 비용 최적화 가이드

## 현재 비용 분석 (월 $91.76)

### 주요 비용 항목:
1. **Virtual Private Cloud**: $27.72 (NAT Gateway 추정)
2. **RDS**: $23.45 (프리티어 초과)
3. **ELB**: $16.78 (Application Load Balancer)
4. **CloudWatch**: $15.90 (로그 및 메트릭)
5. **ECS**: $6.46 (Fargate)

## 최적화 방안

### 1. RDS 자동 스케줄링 (예상 절약: $15-20/월)
```bash
# 적용 방법
terraform plan -target="aws_db_instance.main"
terraform apply -target="aws_db_instance.main"
```

**설정된 스케줄:**
- 중지: 매일 23:00 KST (UTC 14:00)  
- 시작: 매일 09:00 KST (UTC 00:00)
- **10시간 절약 = 약 42% RDS 비용 절감**

### 2. CloudWatch 로그 최적화 (예상 절약: $10-12/월)
- 로그 보존기간: 30일 → 1일
- 불필요한 메트릭 알람 제거
- 대시보드 비활성화

### 3. 추가 최적화 항목

#### ECR 최적화
- 이미지 스캔 비활성화
- 라이프사이클 정책: 최근 10개 이미지만 보관

#### ECS 최적화
- Fargate Spot 인스턴스 우선 사용 (이미 적용됨)
- CPU/Memory 최소 설정 (256 CPU, 512 Memory)

## 적용 단계

### Step 1: RDS 스케줄링 적용
```bash
cd terraform
terraform plan
terraform apply
```

### Step 2: CloudWatch 로그 정리
```bash
# 기존 로그 그룹 확인
aws logs describe-log-groups --region ap-northeast-2

# 불필요한 로그 그룹 삭제
aws logs delete-log-group --log-group-name "/aws/lambda/old-function"
```

### Step 3: 비용 모니터링
```bash
# 비용 확인
aws ce get-cost-and-usage \
  --time-period Start=2024-12-01,End=2024-12-31 \
  --granularity MONTHLY \
  --metrics BlendedCost
```

## 주의사항

### NAT Gateway 확인 필요
- VPC 비용 $27.72의 원인 파악 필요
- NAT Gateway 사용 중이라면 제거 고려

### ALB vs NLB
- **ALB → NLB 변경 시**: ~$8-10/월 절약
- **포기 기능**: admin 서브도메인 라우팅, SSL 종료
- **권장**: 현재 admin.honbabnono.com 라우팅 사용 중이므로 ALB 유지

## 예상 결과

### 비용 변화:
- **현재**: $91.76/월
- **최적화 후**: $50-60/월  
- **절약률**: 35-45%

### 월별 예상 절약:
- RDS 스케줄링: $15-20
- CloudWatch 최적화: $10-12  
- 기타 최적화: $5-8
- **총 절약**: $30-40/월

## 모니터링

### 비용 알림 설정
1. AWS Budgets에서 월 $70 예산 설정
2. 80% 도달 시 알림
3. 주간 비용 리포트 활성화

### 정기 검토
- 월 1회 비용 분석
- 불필요한 리소스 정리
- 사용량 패턴 분석