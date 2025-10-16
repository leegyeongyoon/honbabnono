# 혼밥시러 인프라 구축 가이드

## 📋 개요
React Native Expo 앱을 AWS ECS Fargate + ALB로 배포하는 완전 자동화된 인프라입니다.

## 🏗️ 아키텍처

```
Internet → Route 53 → ALB (HTTPS) → ECS Fargate → ECR
                ↓
            ACM SSL Certificate
                ↓
            CloudWatch Logs
```

## 🚀 주요 구성 요소

### 1. **Terraform Infrastructure as Code**
- **State 관리**: S3 Backend (`honbabnono-terraform-state`)
- **State 잠금**: DynamoDB (`honbabnono-terraform-locks`)
- **비용 최적화**: 프리티어 범위 내 설정

### 2. **AWS 리소스**

#### ECS (Elastic Container Service)
- **클러스터**: `honbabnono-cluster`
- **서비스**: `honbabnono-service` 
- **태스크 정의**: `honbabnono-task`
- **컴퓨팅**: Fargate Spot (비용 절감)
- **스펙**: 0.25 vCPU, 0.5GB RAM

#### ALB (Application Load Balancer)
- **이름**: `honbabnono-alb`
- **리스너**: 
  - HTTP (80) → HTTPS (443) 리다이렉트
  - HTTPS (443) → ECS 서비스
- **타겟 그룹**: `honbabnono-tg`

#### ECR (Elastic Container Registry)
- **리포지토리**: `honbabnono-app`
- **이미지 관리**: 최근 10개 이미지 유지

#### Route 53 + ACM
- **도메인**: `honbabnono.com`
- **SSL 인증서**: 자동 발급/갱신
- **DNS 레코드**: A 레코드 (ALB 별칭)

#### CloudWatch
- **로그 그룹**: `/ecs/honbabnono`
- **보관 기간**: 1일 (비용 최소화)
- **월 비용**: 약 $0.2

## 📦 배포 파이프라인

### GitHub Actions 워크플로우
1. **코드 체크아웃**
2. **Terraform 초기화** (S3 backend)
3. **인프라 배포** (`terraform apply`)
4. **Docker 이미지 빌드**
5. **ECR 푸시**
6. **ECS 서비스 업데이트**
7. **배포 완료 확인**

### 트리거
- `main` 브랜치 푸시시 자동 배포
- 수동 실행 가능 (`workflow_dispatch`)

## 🔧 환경 설정

### 개발 환경 (`.env`)
```bash
NODE_ENV=development
PORT=3000
REACT_APP_API_URL=http://localhost:3001
```

### 프로덕션 환경 (`.env.production`)
```bash
NODE_ENV=production
PORT=80
REACT_APP_API_URL=https://honbabnono.com
FRONTEND_URL=https://honbabnono.com
KAKAO_REDIRECT_URI=https://honbabnono.com/auth/kakao/callback
```

## 💰 비용 구조 (월 예상)

| 서비스 | 리소스 | 예상 비용 |
|--------|--------|-----------|
| ECS Fargate | 0.25 vCPU, 0.5GB | ~$5-10 |
| ALB | 기본 요금 | ~$16 |
| Route 53 | 호스팅 존 | $0.50 |
| ACM | SSL 인증서 | 무료 |
| CloudWatch | 로그 (1일) | ~$0.20 |
| ECR | 이미지 저장 | ~$0.10 |
| **총 예상** | | **~$22-27** |

### 비용 절감 설정
- Fargate Spot 인스턴스 사용
- 최소 스펙 (0.25 vCPU, 0.5GB)
- CloudWatch 로그 1일 보관
- ECR 이미지 10개 제한

## 🔐 보안 설정

### IAM 역할
- **ECS Task Execution Role**: ECR 이미지 풀 권한
- **ECS Task Role**: 애플리케이션 실행 권한

### 네트워크 보안
- **ALB Security Group**: HTTP(80), HTTPS(443) 허용
- **ECS Security Group**: ALB에서만 접근 허용
- **VPC**: 기본 VPC 사용 (퍼블릭 서브넷)

### SSL/TLS
- **ACM 인증서**: 자동 발급 및 갱신
- **HTTPS 강제**: HTTP → HTTPS 리다이렉트
- **보안 정책**: ELBSecurityPolicy-2016-08

## 📊 모니터링

### CloudWatch 로그
```bash
# 로그 확인
aws logs tail /ecs/honbabnono --follow
```

### ECS 서비스 상태
```bash
# 서비스 상태 확인
aws ecs describe-services --cluster honbabnono-cluster --services honbabnono-service

# 태스크 상태 확인  
aws ecs list-tasks --cluster honbabnono-cluster --service-name honbabnono-service
```

## 🛠️ 유지보수

### 인프라 업데이트
```bash
cd terraform
terraform plan    # 변경사항 확인
terraform apply   # 변경사항 적용
```

### 수동 배포
```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 975050251584.dkr.ecr.ap-northeast-2.amazonaws.com

# 이미지 빌드 및 푸시
docker build -t honbabnono .
docker tag honbabnono:latest 975050251584.dkr.ecr.ap-northeast-2.amazonaws.com/honbabnono-app:latest
docker push 975050251584.dkr.ecr.ap-northeast-2.amazonaws.com/honbabnono-app:latest

# ECS 서비스 업데이트
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --force-new-deployment
```

## 🔄 백업 및 복구

### Terraform State
- **백업**: S3 버전 관리 활성화
- **복구**: S3에서 이전 버전 복원

### 애플리케이션 롤백
```bash
# 이전 태스크 정의로 롤백
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --task-definition honbabnono-task:이전버전
```

## 📞 문제 해결

### 일반적인 문제

#### 1. 컨테이너 시작 실패
```bash
# 로그 확인
aws logs tail /ecs/honbabnono --follow

# 태스크 상세 정보
aws ecs describe-tasks --cluster honbabnono-cluster --tasks [TASK-ID]
```

#### 2. 도메인 접속 불가
- DNS 전파 대기 (최대 48시간)
- Route 53 레코드 확인
- SSL 인증서 상태 확인

#### 3. 배포 실패
- GitHub Actions 로그 확인
- AWS 자격증명 확인
- Terraform 상태 파일 확인

### 긴급 상황 대응

#### 서비스 중단시
```bash
# 서비스 스케일 업
aws ecs update-service --cluster honbabnono-cluster --service honbabnono-service --desired-count 2

# 헬스 체크 확인
aws elbv2 describe-target-health --target-group-arn [TARGET-GROUP-ARN]
```

## 📝 체크리스트

### 배포 전 확인사항
- [ ] 환경변수 설정 확인
- [ ] Docker 이미지 빌드 테스트
- [ ] Terraform plan 검토
- [ ] 도메인 설정 확인

### 배포 후 확인사항
- [ ] 서비스 상태 정상
- [ ] 도메인 접속 확인
- [ ] HTTPS 리다이렉트 동작
- [ ] CloudWatch 로그 수집

---

## 📚 추가 리소스

- [AWS ECS 문서](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GitHub Actions 문서](https://docs.github.com/en/actions)