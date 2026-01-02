# 리소스 중복 방지 및 검증 설정

# 현재 AWS 계정 정보 확인
data "aws_caller_identity" "current" {}

# 기존 ECS 클러스터 확인 (중복 방지) - 비활성화
# data "aws_ecs_cluster" "existing" {
#   cluster_name = "${local.resource_prefix}-cluster"
#
#   # 에러 무시 (존재하지 않으면 새로 생성)
#   depends_on = []
# }

# 기존 ECR 리포지토리 확인 (중복 방지)
data "aws_ecr_repository" "existing" {
  count = 0 # 일단 비활성화, 필요시 1로 변경
  name  = "${local.resource_prefix}-app"
}

# 리소스 태그 공통 정의
locals {
  common_tags = {
    Project       = var.app_name
    Environment   = var.environment
    ManagedBy     = "terraform"
    CreatedBy     = data.aws_caller_identity.current.user_id
    ResourceGroup = "${var.app_name}-${var.environment}"
  }
}

# 출력 정보 (디버깅용)
output "resource_info" {
  value = {
    account_id      = data.aws_caller_identity.current.account_id
    resource_prefix = local.resource_prefix
  }
  description = "리소스 정보"
}

# Terraform 상태 백엔드 설정 (S3 + DynamoDB)
terraform {
  backend "s3" {
    bucket = "honbabnono-terraform-state"
    key    = "production/terraform.tfstate"
    region = "ap-northeast-2"

    # 상태 잠금을 위한 DynamoDB 테이블
    dynamodb_table = "honbabnono-terraform-locks"
    encrypt        = true
  }
}