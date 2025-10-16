# 💰 AWS ECS 비용 최적화 가이드

이 가이드는 혼밥노노 앱의 AWS 비용을 최소화하기 위한 설정과 팁을 제공합니다.

## 🎯 현재 비용 최적화 설정

### 1. Fargate Spot 인스턴스 사용
- **일반 Fargate 대비 최대 70% 비용 절감**
- 중단 가능성이 있지만 웹 애플리케이션에는 적합
- 자동으로 새 인스턴스로 대체됨

### 2. 최소 리소스 할당
```
CPU: 0.25 vCPU (256 CPU units)
메모리: 512 MB
인스턴스 수: 1개
```

### 3. 로그 설정 제거
- CloudWatch 로그 비활성화로 추가 비용 절감
- 필요시 나중에 활성화 가능

## 📊 예상 월별 비용 (서울 리전 기준)

### Fargate Spot 비용
- **CPU**: 0.25 vCPU × $0.04052/시간 × 24시간 × 30일 = **약 $7.3**
- **메모리**: 0.5 GB × $0.004454/시간 × 24시간 × 30일 = **약 $1.6**
- **총 컴퓨팅 비용**: **약 $8.9/월**

### 기타 비용
- **Application Load Balancer**: **약 $16.2/월** (고정)
- **ECR 스토리지**: **약 $0.1/월** (500MB 기준)
- **데이터 전송**: **약 $1/월** (소규모 트래픽 기준)

### **총 예상 비용: 약 $26.2/월 (약 35,000원)**

## 🔧 추가 비용 절감 방법

### 1. 개발/테스트 환경 분리
```bash
# 개발 시에만 실행
terraform apply -var="app_count=1"

# 테스트 완료 후 중지
terraform apply -var="app_count=0"
```

### 2. 스케줄 기반 자동 스케일링
```bash
# 평일 오전 9시에 시작
aws events put-rule --name "start-app" --schedule-expression "cron(0 9 * * MON-FRI)"

# 평일 오후 6시에 중지
aws events put-rule --name "stop-app" --schedule-expression "cron(0 18 * * MON-FRI)"
```

### 3. Reserved Capacity (장기 사용시)
- 1년 약정 시 최대 50% 추가 할인
- 안정적인 워크로드에 적합

## 🚨 비용 모니터링 설정

### 1. AWS Budgets 설정
```bash
# 월 예산 알림 설정 (30달러)
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "honbabnono-monthly",
    "BudgetLimit": {"Amount": "30", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST"
  }'
```

### 2. Cost Explorer 태그 설정
- 모든 리소스에 `Environment: production` 태그 적용
- 비용 추적 및 분석 가능

## ⚠️ 비용 절감 시 주의사항

### Spot 인스턴스 중단
- **발생 빈도**: 매우 낮음 (5% 미만)
- **대응 방법**: 자동으로 새 인스턴스 시작
- **서비스 중단**: 1-2분 정도

### 단일 인스턴스 운영
- **장점**: 비용 최소화
- **단점**: 인스턴스 중단 시 일시적 서비스 중단
- **권장**: 트래픽 증가 시 `app_count` 증가

## 🔄 비용에 따른 스케일링 전략

### Phase 1: 최소 비용 ($26/월)
```hcl
fargate_cpu    = "256"
fargate_memory = "512"
app_count      = 1
```

### Phase 2: 안정성 확보 ($45/월)
```hcl
fargate_cpu    = "256"
fargate_memory = "512"
app_count      = 2  # 고가용성
```

### Phase 3: 성능 향상 ($70/월)
```hcl
fargate_cpu    = "512"
fargate_memory = "1024"
app_count      = 2
```

## 🛠️ 비용 최적화 명령어

### 인스턴스 수 조정
```bash
# 비용 절감: 1개로 감소
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --desired-count 1

# 안정성: 2개로 증가
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --desired-count 2

# 완전 중지 (최대 절약)
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --desired-count 0
```

### 리소스 사용량 모니터링
```bash
# CPU/메모리 사용률 확인
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=honbabnono-service \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Average
```

## 💡 비용 절감 꿀팁

### 1. 무료 SSL 인증서
```bash
# AWS Certificate Manager (무료)
aws acm request-certificate --domain-name yourdomain.com
```

### 2. CloudFront CDN (무료 티어 활용)
- 매월 1TB 무료 데이터 전송
- 글로벌 성능 향상

### 3. Route 53 대신 무료 DNS
- Cloudflare, Namecheap 등 활용
- 월 $0.5 절약

## 📈 비용 대비 성능 최적화

### 메모리 최적화
```dockerfile
# Dockerfile에서 멀티스테이지 빌드로 이미지 크기 최소화
FROM node:20-alpine  # alpine 이미지 사용
```

### 네트워크 최적화
```bash
# gzip 압축 활성화로 데이터 전송량 감소
# nginx.conf에서 gzip on; 설정
```

## 🔍 실제 비용 확인 방법

### AWS Cost Explorer 활용
1. AWS 콘솔 → Cost Explorer
2. 필터: Service = "Amazon Elastic Container Service"
3. 그룹화: Tag (Environment)

### 일별 비용 트래킹
```bash
# 지난 7일 비용 조회
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-08 \
  --granularity DAILY \
  --metrics BlendedCost
```

---

**💰 결론**: 위 설정으로 월 $26 정도의 비용으로 안정적인 웹 애플리케이션 호스팅이 가능합니다. 트래픽이 적다면 더욱 비용을 절감할 수 있습니다.