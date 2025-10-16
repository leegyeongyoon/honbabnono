#!/bin/bash

# 기존 AWS 리소스 정리 스크립트
set -e

echo "🧹 기존 AWS 리소스 정리 시작..."

AWS_REGION="ap-northeast-2"
APP_NAME="honbabnono"

# 1. ECS 서비스 스케일 다운 및 삭제
echo "📦 ECS 서비스 정리 중..."
aws ecs update-service \
  --cluster $APP_NAME-cluster \
  --service $APP_NAME-service \
  --desired-count 0 \
  --region $AWS_REGION || echo "ECS 서비스가 없거나 이미 중지됨"

aws ecs wait services-stable \
  --cluster $APP_NAME-cluster \
  --services $APP_NAME-service \
  --region $AWS_REGION || echo "대기 중 오류 발생"

aws ecs delete-service \
  --cluster $APP_NAME-cluster \
  --service $APP_NAME-service \
  --region $AWS_REGION || echo "ECS 서비스 삭제 실패"

# 2. ECS 태스크 정의 비활성화
echo "📋 ECS 태스크 정의 비활성화 중..."
TASK_DEFINITIONS=$(aws ecs list-task-definitions \
  --family-prefix $APP_NAME-task \
  --status ACTIVE \
  --region $AWS_REGION \
  --query 'taskDefinitionArns' \
  --output text || echo "")

for task_def in $TASK_DEFINITIONS; do
  if [[ ! -z "$task_def" ]]; then
    aws ecs deregister-task-definition \
      --task-definition $task_def \
      --region $AWS_REGION || echo "태스크 정의 비활성화 실패: $task_def"
  fi
done

# 3. ECS 클러스터 삭제
echo "🗂️ ECS 클러스터 삭제 중..."
aws ecs delete-cluster \
  --cluster $APP_NAME-cluster \
  --region $AWS_REGION || echo "ECS 클러스터 삭제 실패"

# 4. ALB 및 Target Group 삭제
echo "⚖️ Load Balancer 삭제 중..."
ALB_ARN=$(aws elbv2 describe-load-balancers \
  --names $APP_NAME-alb \
  --region $AWS_REGION \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text 2>/dev/null || echo "None")

if [[ "$ALB_ARN" != "None" && "$ALB_ARN" != "" ]]; then
  aws elbv2 delete-load-balancer \
    --load-balancer-arn $ALB_ARN \
    --region $AWS_REGION || echo "ALB 삭제 실패"
fi

TG_ARN=$(aws elbv2 describe-target-groups \
  --names $APP_NAME-tg \
  --region $AWS_REGION \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "None")

if [[ "$TG_ARN" != "None" && "$TG_ARN" != "" ]]; then
  aws elbv2 delete-target-group \
    --target-group-arn $TG_ARN \
    --region $AWS_REGION || echo "Target Group 삭제 실패"
fi

# 5. 보안 그룹 삭제
echo "🔒 보안 그룹 삭제 중..."
aws ec2 delete-security-group \
  --group-name $APP_NAME-alb-sg \
  --region $AWS_REGION || echo "ALB 보안 그룹 삭제 실패"

aws ec2 delete-security-group \
  --group-name $APP_NAME-ecs-tasks-sg \
  --region $AWS_REGION || echo "ECS 보안 그룹 삭제 실패"

# 6. IAM 역할 삭제
echo "👤 IAM 역할 삭제 중..."
aws iam detach-role-policy \
  --role-name $APP_NAME-ecs-task-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy || echo "정책 분리 실패"

aws iam delete-role \
  --role-name $APP_NAME-ecs-task-execution-role || echo "실행 역할 삭제 실패"

aws iam delete-role \
  --role-name $APP_NAME-ecs-task-role || echo "태스크 역할 삭제 실패"

# 7. ECR 리포지토리 삭제 (이미지 포함)
echo "📦 ECR 리포지토리 삭제 중..."
aws ecr delete-repository \
  --repository-name $APP_NAME-app \
  --force \
  --region $AWS_REGION || echo "ECR 리포지토리 삭제 실패"

echo "✅ 리소스 정리 완료!"
echo "💡 5분 정도 기다린 후 다시 배포하세요."