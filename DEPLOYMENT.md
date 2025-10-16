# AWS ECS 배포 가이드

이 가이드는 혼밥노노 앱을 AWS ECS에 배포하는 방법을 설명합니다.

## 사전 요구사항

1. **AWS CLI 설치 및 구성**
   ```bash
   # AWS CLI 설치
   curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
   unzip awscliv2.zip
   sudo ./aws/install
   
   # AWS 자격 증명 구성
   aws configure
   ```

2. **Terraform 설치**
   ```bash
   # macOS
   brew install terraform
   
   # Linux
   wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
   unzip terraform_1.6.0_linux_amd64.zip
   sudo mv terraform /usr/local/bin/
   ```

3. **Docker 설치**
   ```bash
   # macOS
   brew install docker
   
   # Linux (Ubuntu)
   sudo apt-get update
   sudo apt-get install docker.io
   ```

## 배포 방법

### 🚀 방법 1: GitHub Actions 자동 배포 (권장)

1. **GitHub Secrets 설정**
   ```
   Repository → Settings → Secrets → Actions
   AWS_ACCESS_KEY_ID: [Your AWS Access Key]
   AWS_SECRET_ACCESS_KEY: [Your AWS Secret Key]
   ```

2. **자동 배포**
   ```bash
   git add .
   git commit -m "deploy: 배포"
   git push origin main  # main 브랜치 푸시 시 자동 배포
   ```

자세한 설정은 [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) 참고

### 🛠️ 방법 2: 수동 배포

#### 1. 환경 설정

```bash
# terraform.tfvars 파일 생성
cd terraform
cp terraform.tfvars.example terraform.tfvars

# 필요에 따라 변수값 수정
vim terraform.tfvars
```

#### 2. Terraform 인프라 배포

```bash
# Terraform 초기화
terraform init

# 배포 계획 확인
terraform plan

# 인프라 배포
terraform apply
```

배포 완료 후 다음 정보들이 출력됩니다:
- `alb_hostname`: 애플리케이션 접근 URL
- `ecr_repository_url`: Docker 이미지 저장소 URL

#### 3. Docker 이미지 빌드 및 푸시

```bash
# ECR 로그인
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin <ECR_REPOSITORY_URL>

# Docker 이미지 빌드
docker build -t honbabnono .

# 태그 지정
docker tag honbabnono:latest <ECR_REPOSITORY_URL>:latest

# ECR에 푸시
docker push <ECR_REPOSITORY_URL>:latest
```

#### 4. ECS 서비스 업데이트

```bash
# ECS 서비스 강제 새 배포
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --force-new-deployment \
  --region ap-northeast-2
```

## 자동화 스크립트

편의를 위해 배포 스크립트를 제공합니다:

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 혼밥노노 배포 시작..."

# 1. Terraform으로 인프라 배포
echo "📦 인프라 배포 중..."
cd terraform
terraform init
terraform apply -auto-approve

# ECR URL 가져오기
ECR_URL=$(terraform output -raw ecr_repository_url)
echo "ECR Repository URL: $ECR_URL"

# 2. Docker 이미지 빌드 및 푸시
echo "🐳 Docker 이미지 빌드 중..."
cd ..
aws ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin $ECR_URL

docker build -t honbabnono .
docker tag honbabnono:latest $ECR_URL:latest
docker push $ECR_URL:latest

# 3. ECS 서비스 업데이트
echo "🔄 ECS 서비스 업데이트 중..."
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --force-new-deployment \
  --region ap-northeast-2

echo "✅ 배포 완료!"
echo "🌐 애플리케이션 URL: http://$(cd terraform && terraform output -raw alb_hostname)"
```

## 모니터링

### CloudWatch 로그 확인
```bash
# ECS 태스크 로그 확인
aws logs describe-log-groups --log-group-name-prefix "/ecs/honbabnono"

# 실시간 로그 스트림 확인
aws logs tail /ecs/honbabnono --follow
```

### ECS 서비스 상태 확인
```bash
# 클러스터 정보 확인
aws ecs describe-clusters --clusters honbabnono-cluster

# 서비스 상태 확인
aws ecs describe-services --cluster honbabnono-cluster --services honbabnono-service

# 실행 중인 태스크 확인
aws ecs list-tasks --cluster honbabnono-cluster --service-name honbabnono-service
```

## 트러블슈팅

### 일반적인 문제들

1. **태스크가 시작되지 않는 경우**
   - ECR에 이미지가 올바르게 푸시되었는지 확인
   - 태스크 정의에서 이미지 URL이 올바른지 확인
   - IAM 역할 권한 확인

2. **로드 밸런서에서 503 오류가 발생하는 경우**
   - 보안 그룹 설정 확인
   - 헬스 체크 설정 확인
   - 애플리케이션이 올바른 포트에서 실행되는지 확인

3. **메모리 부족 오류**
   - `terraform/variables.tf`에서 `fargate_memory` 값 증가
   - `terraform apply`로 변경사항 적용

### 로그 분석
```bash
# CloudWatch Insights를 사용한 로그 분석
aws logs start-query \
  --log-group-name "/ecs/honbabnono" \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'fields @timestamp, @message | sort @timestamp desc | limit 100'
```

## 스케일링

### 수동 스케일링
```bash
# 인스턴스 수 변경
aws ecs update-service \
  --cluster honbabnono-cluster \
  --service honbabnono-service \
  --desired-count 3
```

### 자동 스케일링 (선택사항)
Auto Scaling 설정은 별도로 구성할 수 있습니다. 필요시 추가 Terraform 리소스를 만들어 설정하세요.

## 정리

리소스를 삭제하려면:
```bash
cd terraform
terraform destroy
```

⚠️ **주의**: 이 명령어는 모든 AWS 리소스를 삭제합니다. 데이터 백업을 먼저 수행하세요.

## 비용 최적화 팁

1. **Fargate Spot 사용**: 비용 절약을 위해 Spot 인스턴스 사용
2. **적절한 리소스 할당**: CPU/메모리를 필요한 만큼만 할당
3. **로그 보존 기간 설정**: CloudWatch 로그의 보존 기간을 적절히 설정
4. **미사용 리소스 정리**: 정기적으로 미사용 ECR 이미지와 로그 정리

## 보안 고려사항

1. **HTTPS 설정**: SSL 인증서를 추가하여 HTTPS 활성화
2. **환경 변수**: 민감한 정보는 AWS Secrets Manager 사용
3. **네트워크 보안**: VPC와 서브넷을 적절히 구성
4. **IAM 권한**: 최소 권한 원칙 적용

## 추가 기능

### SSL/TLS 인증서 추가
AWS Certificate Manager를 사용하여 HTTPS를 활성화할 수 있습니다.

### 데이터베이스 연결
RDS나 다른 데이터베이스 서비스와 연결이 필요한 경우 별도 설정이 필요합니다.

### CI/CD 파이프라인
GitHub Actions나 AWS CodePipeline을 사용하여 자동 배포 파이프라인을 구성할 수 있습니다.