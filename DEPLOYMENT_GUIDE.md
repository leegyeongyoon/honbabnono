# 혼밥시러 배포 가이드

## 🚀 빠른 시작

### 1. 사전 준비
```bash
# 필수 도구 설치
brew install terraform
brew install awscli

# AWS 자격증명 설정
aws configure
```

### 2. 저장소 클론
```bash
git clone https://github.com/leegyeongyoon/honbabnono.git
cd honbabnono
```

### 3. 인프라 배포
```bash
cd terraform
terraform init    # S3 backend 초기화
terraform plan     # 배포 계획 확인
terraform apply    # 인프라 생성
```

### 4. 자동 배포
- `main` 브랜치에 푸시하면 GitHub Actions가 자동 배포

## 📋 상세 배포 프로세스

### Phase 1: 인프라 준비

#### S3 Backend 설정 (이미 완료)
```bash
# S3 버킷 생성 (이미 생성됨)
aws s3 mb s3://honbabnono-terraform-state --region ap-northeast-2

# DynamoDB 테이블 생성 (이미 생성됨) 
aws dynamodb create-table \
  --table-name honbabnono-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### Terraform 초기화
```bash
cd terraform
terraform init
```

### Phase 2: AWS 리소스 생성

#### 리소스 생성 순서
1. **VPC & 네트워킹** (기본 VPC 사용)
2. **보안 그룹** (ALB, ECS)
3. **IAM 역할** (ECS 실행 권한)
4. **ECR 리포지토리** (Docker 이미지 저장)
5. **ECS 클러스터 & 서비스**
6. **ALB & 타겟 그룹**
7. **Route 53 & ACM** (도메인 설정시)

```bash
# 배포 실행
terraform apply -auto-approve
```

### Phase 3: 애플리케이션 배포

#### GitHub Actions 워크플로우
```yaml
# .github/workflows/deploy.yml 자동 실행
1. 코드 체크아웃
2. AWS 자격증명 설정
3. Terraform 인프라 확인/업데이트
4. Docker 이미지 빌드
5. ECR 푸시
6. ECS 서비스 업데이트
7. 배포 완료 확인
```

#### 수동 배포 (필요시)
```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | \
  docker login --username AWS --password-stdin \
  975050251584.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 빌드
docker build -t honbabnono .

# 태깅 및 푸시
ECR_URI=975050251584.dkr.ecr.ap-northeast-2.amazonaws.com/honbabnono-app
docker tag honbabnono:latest $ECR_URI:latest
docker tag honbabnono:latest $ECR_URI:$(git rev-parse --short HEAD)
docker push $ECR_URI:latest
docker push $ECR_URI:$(git rev-parse --short HEAD)

# ECS 서비스 업데이트
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --force-new-deployment
```

## 🔧 환경별 설정

### 개발 환경
```bash
# 로컬 개발 서버
npm start          # React Native Metro
npm run web        # 웹 개발 서버
npm run android    # Android 앱
npm run ios        # iOS 앱
```

### 스테이징 환경 (추가 구성시)
```bash
# terraform/staging.tfvars 생성
environment = "staging"
domain_name = "staging.honbabnono.com"
app_count   = 1

# 스테이징 배포
terraform apply -var-file="staging.tfvars"
```

### 프로덕션 환경
```bash
# terraform/production.tfvars (기본값)
environment = "production"
domain_name = "honbabnono.com"
app_count   = 1
fargate_cpu = "256"
fargate_memory = "512"
```

## 🔍 모니터링 및 로깅

### CloudWatch 로그 확인
```bash
# 실시간 로그 모니터링
aws logs tail /ecs/honbabnono --follow

# 특정 시간대 로그 조회
aws logs filter-log-events \
  --log-group-name /ecs/honbabnono \
  --start-time $(date -d '1 hour ago' +%s)000
```

### ECS 서비스 상태 모니터링
```bash
# 서비스 상태 확인
aws ecs describe-services \
  --cluster honbabnono-cluster \
  --services honbabnono-service

# 실행 중인 태스크 확인
aws ecs list-tasks \
  --cluster honbabnono-cluster \
  --service-name honbabnono-service

# 태스크 상세 정보
aws ecs describe-tasks \
  --cluster honbabnono-cluster \
  --tasks $(aws ecs list-tasks \
    --cluster honbabnono-cluster \
    --service-name honbabnono-service \
    --query 'taskArns[0]' --output text)
```

### ALB 헬스 체크
```bash
# 타겟 그룹 헬스 상태
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups \
    --names honbabnono-tg \
    --query 'TargetGroups[0].TargetGroupArn' --output text)
```

## 🛠️ 트러블슈팅

### 일반적인 문제 해결

#### 1. 배포 실패
```bash
# GitHub Actions 로그 확인
# https://github.com/leegyeongyoon/honbabnono/actions

# Terraform 상태 확인
terraform show
terraform refresh

# AWS 자격증명 확인
aws sts get-caller-identity
```

#### 2. 컨테이너 시작 실패
```bash
# 로그 확인
aws logs tail /ecs/honbabnono --follow

# 태스크 실패 원인 확인
aws ecs describe-tasks --cluster honbabnono-cluster --tasks [TASK-ID]

# 이미지 확인
aws ecr describe-images --repository-name honbabnono-app
```

#### 3. 도메인 접속 불가
```bash
# DNS 설정 확인
dig honbabnono.com
nslookup honbabnono.com

# Route 53 레코드 확인
aws route53 list-resource-record-sets \
  --hosted-zone-id Z063704727QK0JIQO9M5I

# SSL 인증서 상태 확인
aws acm describe-certificate \
  --certificate-arn arn:aws:acm:ap-northeast-2:975050251584:certificate/26e43f91-c274-4731-b357-b929ee2c0074
```

#### 4. 높은 비용 발생
```bash
# 리소스 사용량 확인
aws ce get-cost-and-usage \
  --time-period Start=2024-01-01,End=2024-01-31 \
  --granularity MONTHLY \
  --metrics BlendedCost

# 불필요한 리소스 정리
terraform destroy  # 전체 삭제 (주의!)
```

### 긴급 상황 대응

#### 서비스 다운
```bash
# 즉시 스케일 업
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --desired-count 2

# 이전 버전으로 롤백
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --task-definition honbabnono-task:이전버전번호
```

#### 완전 재배포
```bash
# 서비스 중지
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --desired-count 0

# 새 태스크 정의로 재시작
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --desired-count 1 \
  --force-new-deployment
```

## 📝 배포 체크리스트

### 배포 전
- [ ] 코드 변경사항 테스트 완료
- [ ] 환경변수 설정 확인
- [ ] Terraform plan 검토
- [ ] 백업 계획 수립

### 배포 중
- [ ] GitHub Actions 진행상황 모니터링
- [ ] CloudWatch 로그 실시간 확인
- [ ] ECS 서비스 상태 확인

### 배포 후
- [ ] 웹사이트 접속 테스트
- [ ] HTTPS 리다이렉트 확인
- [ ] 주요 기능 동작 확인
- [ ] 로그 수집 정상 여부 확인

## 🔄 롤백 절차

### 빠른 롤백
```bash
# 이전 태스크 정의로 즉시 롤백
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --task-definition honbabnono-task:$(expr $(aws ecs describe-services \
    --cluster honbabnono-cluster \
    --services honbabnono-service \
    --query 'services[0].taskDefinition' \
    --output text | cut -d: -f6) - 1)
```

### Git 기반 롤백
```bash
# 이전 커밋으로 되돌리기
git revert HEAD
git push origin main  # 자동 재배포 트리거
```

---

## 📞 지원 및 문의

### 로그 수집 (문제 보고시)
```bash
# 종합 진단 정보 수집
echo "=== ECS Service Status ===" > debug.log
aws ecs describe-services --cluster honbabnono-cluster --services honbabnono-service >> debug.log

echo "=== Recent Logs ===" >> debug.log
aws logs filter-log-events --log-group-name /ecs/honbabnono --start-time $(date -d '1 hour ago' +%s)000 >> debug.log

echo "=== Target Health ===" >> debug.log
aws elbv2 describe-target-health --target-group-arn [TARGET-GROUP-ARN] >> debug.log
```