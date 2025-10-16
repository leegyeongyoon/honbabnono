# VPC 및 네트워킹 리소스
# 기본 VPC 사용으로 VPC 한도 문제 해결

# 기본 VPC 찾기
data "aws_vpc" "default" {
  default = true
}

# 기본 VPC가 없으면 생성
resource "aws_default_vpc" "default" {
  tags = {
    Name        = "Default VPC"
    Environment = var.environment
  }
}

# 사용할 VPC ID 결정 (기본 VPC 우선)
locals {
  vpc_id = try(data.aws_vpc.default.id, aws_default_vpc.default.id)
}

# 기본 VPC의 서브넷들 찾기
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

# 가용 영역 데이터
data "aws_availability_zones" "available_azs" {
  state = "available"
}

# 기본 서브넷 생성 (필요한 경우)
resource "aws_default_subnet" "default" {
  count             = min(3, length(data.aws_availability_zones.available_azs.names))
  availability_zone = data.aws_availability_zones.available_azs.names[count.index]

  tags = {
    Name        = "Default subnet for ${data.aws_availability_zones.available_azs.names[count.index]}"
    Environment = var.environment
  }
}

# 사용할 서브넷 ID들 결정
locals {
  subnet_ids = length(data.aws_subnets.default.ids) > 0 ? data.aws_subnets.default.ids : aws_default_subnet.default[*].id
}