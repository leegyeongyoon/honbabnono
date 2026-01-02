# 현재 사용 중인 VPC 및 Public IP 상세 분석

# 1. 현재 사용 중인 VPC 정보
output "current_vpc_info" {
  value = {
    vpc_id = local.vpc_id
    vpc_details = "terraform이 사용하는 VPC"
  }
  description = "현재 Terraform에서 사용 중인 VPC 정보"
}

# 2. VPC 내의 모든 Elastic IP 상세 조회
data "aws_eips" "in_vpc" {
  filter {
    name   = "domain"
    values = ["vpc"]
  }
}

# 3. 현재는 간단한 ID 목록만 제공 (상세 분석은 AWS CLI 권장)

# 4. 현재 실행 중인 ECS 태스크들의 Public IP 사용 현황
data "aws_ecs_service" "current_main" {
  service_name = "${local.resource_prefix}-service"
  cluster_arn  = aws_ecs_cluster.main.arn
}

data "aws_ecs_service" "current_admin" {
  count = 1
  service_name = "${local.resource_prefix}-admin-service"
  cluster_arn  = aws_ecs_cluster.main.arn
}

# 5. Load Balancer의 Public IP 사용 현황
data "aws_lb" "current" {
  arn = aws_lb.main.arn
}

# 6. RDS 인스턴스의 Public IP 설정 확인 (생성 후)
data "aws_db_instance" "current" {
  count = 1
  db_instance_identifier = "honbabnono-db"
  depends_on = [aws_db_instance.main]
}

# 7. 상세 IP 사용 현황 출력
output "detailed_public_ip_usage" {
  value = {
    # VPC 기본 정보
    vpc_id = local.vpc_id
    
    # Elastic IP 기본 정보 (상세 분석은 AWS CLI 사용)
    elastic_ip_ids = data.aws_eips.in_vpc.ids
    elastic_ip_count = length(data.aws_eips.in_vpc.ids)
    note = "상세 IP 정보는 AWS CLI로 확인: aws ec2 describe-addresses --region ap-northeast-2"
    
    # ECS 서비스 Public IP 설정
    ecs_main_service = {
      service_name = "${local.resource_prefix}-service"
      assign_public_ip = true
      note = "동적 Public IP 사용 (Elastic IP 불필요)"
    }
    
    # ALB Public IP 정보
    alb_info = {
      alb_name = aws_lb.main.name
      dns_name = aws_lb.main.dns_name
      scheme = aws_lb.main.scheme
      note = "AWS 관리 Public IP 사용 (별도 Elastic IP 불필요)"
    }
    
    # 비용 분석
    cost_analysis = {
      total_monthly_cost = "$27.72"
      cost_per_ip_per_month = "$3.60"
      estimated_ip_count = "약 7-8개"
      unused_ip_potential_savings = "미사용 IP 개수 × $3.60"
    }
  }
  description = "현재 Public IP 사용 현황 및 비용 분석"
}

# 8. 안전한 정리 권장사항
output "safe_cleanup_recommendations" {
  value = {
    step1_check = "위의 detailed_public_ip_usage 출력에서 'is_attached: false'인 IP들 확인"
    step2_verify = "미사용 IP가 다음 중 해당하는지 확인:"
    verification_checklist = [
      "이전에 삭제된 EC2 인스턴스의 남은 IP인가?",
      "NAT Instance 용도로 생성했지만 현재 미사용인가?",
      "테스트용으로 생성한 후 연결 해제된 IP인가?",
      "백업용이나 장애 대비용으로 예약해둔 IP인가?"
    ]
    step3_action = "확실히 불필요한 IP만 해제"
    
    definitely_keep = [
      "ALB 관련 IP (AWS 자동 관리)",
      "현재 실행 중인 ECS 태스크 IP (동적 할당)",
      "연결된 상태의 모든 Elastic IP"
    ]
    
    safe_to_remove = [
      "association_id가 null인 Elastic IP",
      "삭제된 리소스에 남은 IP",
      "명시적으로 불필요하다고 확인된 IP"
    ]
  }
  description = "안전한 Public IP 정리 가이드"
}

# 9. Public IP 사용 모니터링 (정기적 확인용)
output "monitoring_commands" {
  value = {
    check_elastic_ips = "aws ec2 describe-addresses --region ap-northeast-2"
    check_running_instances = "aws ec2 describe-instances --filters 'Name=instance-state-name,Values=running' --region ap-northeast-2"
    check_ecs_tasks = "aws ecs list-tasks --cluster honbabnono-cluster --region ap-northeast-2"
    cost_monitoring = "AWS Cost Explorer에서 'EC2-Others' 카테고리의 'PublicIP' 비용 추적"
  }
  description = "Public IP 사용량 모니터링 명령어"
}