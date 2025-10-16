# VPC 및 네트워킹 리소스
# ⚠️ 기존 VPC/서브넷만 사용 - 새로운 리소스 생성 금지 ⚠️

# 기존 VPC 찾기 (생성하지 않음!)
data "aws_vpcs" "available" {
}

# 첫 번째 사용 가능한 VPC 사용
locals {
  vpc_id = data.aws_vpcs.available.ids[0]
}

# 해당 VPC의 기존 서브넷들만 사용 (생성하지 않음!)
data "aws_subnets" "available" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

# 기존 서브넷만 사용
locals {
  subnet_ids = data.aws_subnets.available.ids
}