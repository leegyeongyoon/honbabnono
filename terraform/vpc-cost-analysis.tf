# VPC 비용 원인 상세 분석
# $27.72 원인을 찾기 위한 모든 VPC 관련 리소스 조회

# VPC Endpoints 조회 (가장 가능성 높은 원인)
data "aws_vpc_endpoints" "all" {
  filter {
    name   = "vpc-id"
    values = [local.vpc_id]
  }
}

# VPC Endpoints 상세 정보
data "aws_vpc_endpoint" "details" {
  count = length(data.aws_vpc_endpoints.all.ids)
  id    = data.aws_vpc_endpoints.all.ids[count.index]
}

# Network Load Balancers 조회
data "aws_lbs" "nlb" {
  filter {
    name   = "type"
    values = ["network"]
  }
}

# Network Load Balancer 상세 정보
data "aws_lb" "nlb_details" {
  count = length(data.aws_lbs.nlb.arns)
  arn   = data.aws_lbs.nlb.arns[count.index]
}

# Transit Gateway 연결 조회
data "aws_ec2_transit_gateway_vpc_attachments" "all" {}

# Network ACLs 조회 (기본이 아닌 커스텀 ACL)
data "aws_network_acls" "all" {
  vpc_id = local.vpc_id
}

# Route 53 Private Hosted Zones 조회
data "aws_route53_zones" "private" {
  private_zone = true
}

# VPC Peering 연결 조회
data "aws_vpc_peering_connections" "all" {
  filter {
    name   = "requester-vpc-info.vpc-id"
    values = [local.vpc_id]
  }
}

# EIP (Elastic IP) 상세 조회 - 연결되지 않은 것들 찾기
data "aws_eips" "all" {
  filter {
    name   = "domain"
    values = ["vpc"]
  }
}

# VPN Gateway 조회
data "aws_vpn_gateways" "all" {
  filter {
    name   = "state"
    values = ["available"]
  }
}

# Direct Connect Virtual Interfaces 조회
data "aws_dx_virtual_interfaces" "all" {}

# 현재 VPC의 모든 서브넷과 라우팅 테이블 상세 분석
data "aws_route_table" "detailed" {
  count     = length(data.aws_route_tables.all.ids)
  route_table_id = data.aws_route_tables.all.ids[count.index]
}

# VPC 비용 분석 결과 출력
output "vpc_cost_analysis" {
  value = {
    # VPC 기본 정보
    vpc_id = local.vpc_id
    
    # VPC Endpoints (주요 의심 대상)
    vpc_endpoints = {
      count = length(data.aws_vpc_endpoints.all.ids)
      ids   = data.aws_vpc_endpoints.all.ids
      details = [for ep in data.aws_vpc_endpoint.details : {
        id           = ep.id
        service_name = ep.service_name
        vpc_endpoint_type = ep.vpc_endpoint_type
        state        = ep.state
        # Interface Endpoint는 시간당 $0.01 = 월 $7.2
        estimated_monthly_cost = ep.vpc_endpoint_type == "Interface" ? "$7.2" : "$0"
      }]
      total_estimated_cost = "${length([for ep in data.aws_vpc_endpoint.details : ep if ep.vpc_endpoint_type == "Interface"]) * 7.2}"
    }
    
    # Network Load Balancers
    network_load_balancers = {
      count = length(data.aws_lbs.nlb.arns)
      arns  = data.aws_lbs.nlb.arns
      # NLB는 시간당 $0.0225 = 월 $16.2
      estimated_monthly_cost = "${length(data.aws_lbs.nlb.arns) * 16.2}"
    }
    
    # Transit Gateway 연결
    transit_gateway_attachments = {
      count = length(data.aws_ec2_transit_gateway_vpc_attachments.all.ids)
      ids   = data.aws_ec2_transit_gateway_vpc_attachments.all.ids
      # TGW 연결은 시간당 $0.05 = 월 $36
      estimated_monthly_cost = "${length(data.aws_ec2_transit_gateway_vpc_attachments.all.ids) * 36}"
    }
    
    # Route 53 Private Hosted Zones
    private_hosted_zones = {
      count = length(data.aws_route53_zones.private.names)
      names = data.aws_route53_zones.private.names
      # Private Zone은 월 $0.5 + 쿼리 비용
      estimated_monthly_cost = "${length(data.aws_route53_zones.private.names) * 0.5}"
    }
    
    # VPC Peering
    vpc_peering_connections = {
      count = length(data.aws_vpc_peering_connections.all.ids)
      ids   = data.aws_vpc_peering_connections.all.ids
      # Peering 자체는 무료, 데이터 전송만 과금
      estimated_monthly_cost = "Data transfer dependent"
    }
    
    # Elastic IPs 상세
    elastic_ips = {
      total_count = length(data.aws_eips.all.public_ips)
      public_ips  = data.aws_eips.all.public_ips
      # 2024년 2월부터 Public IPv4는 시간당 $0.005 = 월 $3.6
      estimated_monthly_cost = "${length(data.aws_eips.all.public_ips) * 3.6}"
    }
    
    # VPN Gateway
    vpn_gateways = {
      count = length(data.aws_vpn_gateways.all.ids)
      ids   = data.aws_vpn_gateways.all.ids
      # VPN Gateway는 시간당 $0.05 = 월 $36
      estimated_monthly_cost = "${length(data.aws_vpn_gateways.all.ids) * 36}"
    }
    
    # Route Tables 분석
    route_tables = {
      count = length(data.aws_route_tables.all.ids)
      ids   = data.aws_route_tables.all.ids
    }
  }
  description = "VPC 비용 $27.72 원인 상세 분석 결과"
}

# 비용 원인 순위별 정리
output "cost_analysis_summary" {
  value = {
    most_likely_causes = {
      "1_vpc_interface_endpoints" = "각 Interface Endpoint당 월 $7.2 (시간당 $0.01)"
      "2_network_load_balancer"   = "각 NLB당 월 $16.2 (시간당 $0.0225)" 
      "3_transit_gateway"         = "각 TGW 연결당 월 $36 (시간당 $0.05)"
      "4_vpn_gateway"            = "각 VPN Gateway당 월 $36 (시간당 $0.05)"
      "5_public_ipv4_addresses"  = "각 Public IP당 월 $3.6 (시간당 $0.005)"
    }
    
    analysis_note = "위 terraform output을 확인하여 실제 리소스 수와 예상 비용을 계산하세요"
    
    action_required = [
      "1. terraform output으로 실제 리소스 현황 확인",
      "2. 불필요한 VPC Endpoints 제거 검토",
      "3. 사용하지 않는 NLB나 TGW 연결 정리",
      "4. AWS Cost Explorer에서 정확한 서비스별 비용 확인"
    ]
  }
  description = "$27.72 VPC 비용 원인 분석 및 해결 가이드"
}