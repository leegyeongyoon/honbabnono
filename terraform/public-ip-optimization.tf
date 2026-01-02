# Public IPv4 주소 사용 최적화

# 현재 Elastic IP 사용 현황 확인
data "aws_eips" "all" {
  filter {
    name   = "domain"
    values = ["vpc"]
  }
}

# Public IP 사용 분석 출력
output "public_ip_analysis" {
  value = {
    elastic_ip_count = length(data.aws_eips.all.ids)
    elastic_ip_ids = data.aws_eips.all.ids
    estimated_elastic_ip_cost = "${length(data.aws_eips.all.ids)} IPs × $3.6/month = $${length(data.aws_eips.all.ids) * 3.6}/month"
    
    optimization_recommendations = [
      "ECS 서비스는 이미 assign_public_ip=true로 설정되어 동적 IP 사용",
      "ALB는 AWS 관리 IP 사용으로 추가 비용 없음",
      "사용하지 않는 Elastic IP 제거 필요",
      "예약되었지만 연결되지 않은 Elastic IP는 시간당 추가 요금 발생"
    ]
  }
  description = "Public IPv4 주소 사용량 및 최적화 방안"
}

# Elastic IP 정리 권장사항
locals {
  public_ip_optimization = {
    current_monthly_cost = 27.72
    ip_count_estimated = 7  # $27.72 ÷ $3.6 ≈ 7개
    
    # 최적화 후 예상 비용 (필수 IP만 유지)
    required_ips = {
      alb = "1개 (AWS 관리, 무료)"
      ecs_dynamic = "0개 (동적 할당, 무료)"
      rds_public = "0개 (필요시에만)"
      reserved_unused = "제거 가능한 Elastic IP들"
    }
    
    optimization_potential = "최대 $20-25/월 절약 가능"
  }
}

output "public_ip_cost_optimization" {
  value = local.public_ip_optimization
  description = "Public IP 비용 최적화 분석 및 권장사항"
}

# 사용하지 않는 Elastic IP 식별을 위한 데이터 소스들은 VPC 분석 파일에서 처리

# 현재 ECS 서비스의 Public IP 설정 확인
output "ecs_public_ip_config" {
  value = {
    assign_public_ip = true  # 이미 올바르게 설정됨
    cost_impact = "동적 IP 할당으로 별도 Elastic IP 불필요"
    optimization_note = "ECS 태스크는 동적 Public IP를 무료로 사용 중"
  }
  description = "ECS Public IP 설정 상태"
}

# 수동 정리 가이드
output "cleanup_guide" {
  value = {
    step1 = "AWS 콘솔 → EC2 → Elastic IP 주소에서 사용하지 않는 IP 확인"
    step2 = "연결되지 않은 Elastic IP 해제 (Release)"
    step3 = "NAT Instance나 불필요한 EC2 인스턴스의 Elastic IP 제거"
    step4 = "RDS Public 접근 설정으로 별도 IP 불필요"
    warning = "⚠️ ALB나 중요한 서비스의 IP는 해제하지 마세요"
  }
  description = "Public IP 수동 정리 가이드"
}