#!/bin/bash

# 혼밥노노 자동 배포 스크립트
set -e

echo "🚀 혼밥노노 ECS 배포 시작..."

# 환경 변수 설정
AWS_REGION="ap-northeast-2"
APP_NAME="honbabnono"

# 1. AWS CLI 설치 확인
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI가 설치되어 있지 않습니다. 설치 후 다시 시도하세요."
    exit 1
fi

# 2. Terraform 설치 확인
if ! command -v terraform &> /dev/null; then
    echo "❌ Terraform이 설치되어 있지 않습니다. 설치 후 다시 시도하세요."
    exit 1
fi

# 3. Docker 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되어 있지 않습니다. 설치 후 다시 시도하세요."
    exit 1
fi

# 4. AWS 자격증명 확인
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS 자격증명이 설정되어 있지 않습니다. 'aws configure'를 실행하세요."
    exit 1
fi

# 5. terraform.tfvars 파일 확인
if [ ! -f "terraform/terraform.tfvars" ]; then
    echo "📝 terraform.tfvars 파일을 생성합니다..."
    cp terraform/terraform.tfvars.example terraform/terraform.tfvars
    echo "⚠️  terraform/terraform.tfvars 파일을 확인하고 필요시 수정하세요."
    read -p "계속하시겠습니까? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 6. Terraform 인프라 배포
echo "📦 Terraform으로 인프라 배포 중..."
cd terraform

terraform init
terraform plan
read -p "인프라를 배포하시겠습니까? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 배포가 취소되었습니다."
    exit 1
fi

terraform apply -auto-approve

# ECR URL 가져오기
ECR_URL=$(terraform output -raw ecr_repository_url)
ALB_HOSTNAME=$(terraform output -raw alb_hostname)

echo "✅ 인프라 배포 완료!"
echo "📍 ECR Repository URL: $ECR_URL"
echo "🌐 ALB Hostname: $ALB_HOSTNAME"

cd ..

# 7. Docker 이미지 빌드 및 푸시
echo "🐳 Docker 이미지 빌드 및 푸시 중..."

# ECR 로그인
echo "🔐 ECR 로그인 중..."
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URL

# Docker 이미지 빌드
echo "🔨 Docker 이미지 빌드 중..."
docker build -t $APP_NAME .

# 태그 지정 및 푸시
echo "📤 ECR에 이미지 푸시 중..."
docker tag $APP_NAME:latest $ECR_URL:latest
docker push $ECR_URL:latest

echo "✅ Docker 이미지 푸시 완료!"

# 8. ECS 서비스 업데이트
echo "🔄 ECS 서비스 업데이트 중..."
aws ecs update-service \
  --cluster $APP_NAME-cluster \
  --service $APP_NAME-service \
  --force-new-deployment \
  --region $AWS_REGION \
  --no-cli-pager

# 9. 배포 상태 확인
echo "⏳ 배포 상태 확인 중..."
echo "ECS 서비스가 업데이트되기까지 몇 분 정도 소요될 수 있습니다..."

# 서비스 안정화 대기
aws ecs wait services-stable \
  --cluster $APP_NAME-cluster \
  --services $APP_NAME-service \
  --region $AWS_REGION

echo ""
echo "🎉 배포 완료!"
echo "🌐 애플리케이션 URL: http://$ALB_HOSTNAME"
echo ""
echo "💰 비용 최적화 정보:"
echo "  - Fargate Spot 사용으로 최대 70% 비용 절감"
echo "  - 예상 월 비용: 약 $26 (35,000원)"
echo "  - 상세 비용 정보: COST_OPTIMIZATION.md 참고"
echo ""
echo "📊 상태 확인 명령어:"
echo "  - ECS 서비스 상태: aws ecs describe-services --cluster $APP_NAME-cluster --services $APP_NAME-service"
echo "  - 태스크 로그: docker logs 명령어로 직접 확인 (CloudWatch 로그 비활성화됨)"
echo ""
echo "🔧 비용 절감 명령어:"
echo "  - 서비스 중지 (비용 $0): aws ecs update-service --cluster $APP_NAME-cluster --service $APP_NAME-service --desired-count 0"
echo "  - 서비스 재시작: aws ecs update-service --cluster $APP_NAME-cluster --service $APP_NAME-service --desired-count 1"
echo "  - 강제 재배포: aws ecs update-service --cluster $APP_NAME-cluster --service $APP_NAME-service --force-new-deployment"
echo ""