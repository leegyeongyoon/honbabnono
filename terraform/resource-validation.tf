# 리소스 중복 방지 및 검증 설정

# 현재 AWS 계정 정보 확인
data "aws_caller_identity" "current" {}

# 기존 ECS 클러스터 확인 (중복 방지)
data "aws_ecs_cluster" "existing" {
  cluster_name = "${local.resource_prefix}-cluster"

  # 에러 무시 (존재하지 않으면 새로 생성)
  depends_on = []
}

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
    UniqueId      = local.unique_suffix
    ResourceGroup = "${var.app_name}-${var.environment}"
    # 중복 방지를 위한 고유 식별자
    DeploymentId = "${var.app_name}-${var.environment}-${local.unique_suffix}"
  }
}

# 출력 정보 (디버깅용)
output "resource_info" {
  value = {
    account_id      = data.aws_caller_identity.current.account_id
    resource_prefix = local.resource_prefix
    unique_suffix   = local.unique_suffix
    deployment_id   = local.common_tags.DeploymentId
  }
  description = "리소스 중복 방지를 위한 정보"
}

# Terraform 상태 백엔드 권장 설정 (주석 처리됨)
# terraform {
#   backend "s3" {
#     bucket = "${var.app_name}-terraform-state"
#     key    = "${var.environment}/terraform.tfstate"
#     region = var.aws_region
#     
#     # 상태 잠금을 위한 DynamoDB 테이블
#     dynamodb_table = "${var.app_name}-terraform-locks"
#     encrypt        = true
#   }
# }