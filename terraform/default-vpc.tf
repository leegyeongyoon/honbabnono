# 기본 VPC 생성 (없는 경우)
# AWS 계정에 기본 VPC가 없는 경우 자동으로 생성

resource "aws_default_vpc" "default" {
  tags = {
    Name        = "Default VPC"
    Environment = var.environment
  }
}

# 기본 서브넷들 확인 및 생성
data "aws_availability_zones" "all" {
  state = "available"
}

resource "aws_default_subnet" "default" {
  count             = min(3, length(data.aws_availability_zones.all.names))
  availability_zone = data.aws_availability_zones.all.names[count.index]

  tags = {
    Name        = "Default subnet for ${data.aws_availability_zones.all.names[count.index]}"
    Environment = var.environment
  }
}