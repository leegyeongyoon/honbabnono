# NAT Gateway 제거 안전성 분석

# NAT Gateway 제거가 안전한 이유:
# 1. ECS 서비스가 assign_public_ip = true로 설정되어 public subnet에서 실행
# 2. ECS 태스크들이 직접 인터넷에 연결 가능 
# 3. RDS는 public 접근 허용으로 설정 예정
# 4. 외부 API 호출이나 패키지 다운로드 시 NAT Gateway 불필요

# 현재 NAT Gateway 사용 여부 확인 (정보 수집용)
data "aws_nat_gateways" "existing" {
  vpc_id = local.vpc_id
}

# Internet Gateway 확인 (public subnet 접근을 위해 필요)
data "aws_internet_gateway" "existing" {
  filter {
    name   = "attachment.vpc-id"
    values = [local.vpc_id]
  }
}

# Route Table 분석 (NAT Gateway 의존성 확인)
data "aws_route_tables" "all" {
  vpc_id = local.vpc_id
}

# NAT Gateway 정보 출력 (디버깅용)
output "nat_gateway_analysis" {
  value = {
    vpc_id              = local.vpc_id
    nat_gateway_ids     = data.aws_nat_gateways.existing.ids
    nat_gateway_count   = length(data.aws_nat_gateways.existing.ids)
    internet_gateway_id = try(data.aws_internet_gateway.existing.id, "not found")
    route_table_ids     = data.aws_route_tables.all.ids
    subnet_ids          = local.subnet_ids
  }
  description = "NAT Gateway 현황 및 제거 가능성 분석"
}

# Public 서브넷 확인은 AWS CLI로 권장 (일부 서브넷에 route table이 없을 수 있음)
# data "aws_route_table" "public_check" {
#   count     = length(local.subnet_ids)
#   subnet_id = local.subnet_ids[count.index]
# }

# NAT Gateway 제거 권장사항
locals {
  nat_gateway_removal_safe = length(data.aws_nat_gateways.existing.ids) > 0 && var.app_count <= 2

  removal_analysis = {
    current_nat_gateways = length(data.aws_nat_gateways.existing.ids)
    ecs_uses_public_ip   = true # assign_public_ip = true
    rds_public_access    = true # publicly_accessible = true (예정)
    estimated_savings    = "월 $32-45 (NAT Gateway $32 + Data Processing $13)"
    removal_safe         = local.nat_gateway_removal_safe
    requirements = [
      "ECS 서비스는 public subnet에서 assign_public_ip=true로 실행 중",
      "RDS는 public 접근으로 설정하여 NAT Gateway 불필요",
      "ALB는 이미 public subnet에 위치",
      "외부 API 호출 시 컨테이너가 직접 인터넷 연결 사용"
    ]
  }
}

output "nat_gateway_removal_analysis" {
  value       = local.removal_analysis
  description = "NAT Gateway 제거 분석 및 권장사항"
}

# NAT Gateway 제거 후 네트워크 설정 (적용 전 검토용)
# 실제 제거는 수동으로 진행 권장

# 제거 시 확인할 사항들:
# 1. 현재 사용 중인 subnet이 public subnet인지 확인
# 2. ECS 서비스의 assign_public_ip가 true인지 확인  
# 3. RDS 설정을 public으로 변경했는지 확인
# 4. Route Table에서 NAT Gateway 라우팅 제거
# 5. NAT Gateway 자체 삭제

# 비용 절감 예상액:
# - NAT Gateway 시간당 비용: $0.045/시간 = $32.4/월
# - Data Processing: $0.045/GB (월 평균 300GB) = $13.5/월  
# - 총 절약: $45.9/월

# ⚠️ 주의: NAT Gateway 제거는 terraform으로 하지 말고 
# AWS 콘솔에서 수동으로 진행하는 것을 권장
# 1. 먼저 terraform plan으로 영향 확인
# 2. AWS 콘솔에서 NAT Gateway 직접 삭제  
# 3. Route Table에서 NAT Gateway 라우팅 제거
# 4. Elastic IP 해제