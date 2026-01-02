# 간단한 비용 최적화 요약 및 가이드

# 현재 적용된 비용 최적화 요약
output "cost_optimization_summary" {
  value = {
    applied_optimizations = {
      rds_scheduling = "새벽 3:00-9:30 자동 정지 (6.5시간) - 월 $6-8 절약"
      cloudwatch_logs = "로그 보존기간 1-3일로 단축 - 월 $10-12 절약"  
      ecr_scanning = "이미지 스캔 비활성화 - 월 $2-3 절약"
      ecs_optimization = "Fargate Spot 인스턴스 및 최소 리소스 사용"
    }
    
    manual_optimization_needed = {
      public_ip_cleanup = {
        description = "VPC 비용 $27.72의 원인인 Public IPv4 주소 정리"
        method = "AWS 콘솔 → EC2 → Elastic IP addresses에서 연결되지 않은 IP 해제"
        potential_savings = "월 $15-25 절약 (가장 큰 효과)"
        safety_note = "⚠️ 연결된 IP나 중요한 서비스 IP는 절대 해제하지 마세요"
      }
    }
    
    total_expected_savings = {
      automatic = "월 $20-25 (이미 적용됨)"
      manual = "월 $15-25 (Public IP 정리 시)"
      total = "월 $35-50 (약 40-55% 절감)"
      final_cost = "$40-55/월 (현재 $91.76에서)"
    }
  }
  description = "비용 최적화 완료 및 추가 작업 가이드"
}

# Public IP 정리 가이드
output "public_ip_cleanup_guide" {
  value = {
    step1 = "AWS 콘솔 로그인 → EC2 대시보드"
    step2 = "좌측 메뉴에서 'Elastic IP addresses' 클릭"
    step3 = "각 IP의 'Instance' 또는 'Associated resource' 컬럼 확인"
    step4 = "연결되지 않은 IP (빈 칸인 것들) 선택"
    step5 = "'Actions' → 'Release addresses' 클릭"
    
    safety_checklist = [
      "현재 실행 중인 서비스에 연결된 IP는 건드리지 않기",
      "ALB나 ECS 서비스 관련 IP는 해제 금지",
      "의심스러우면 그냥 두기",
      "하나씩 천천히 확인하고 해제하기"
    ]
    
    verification_command = "해제 후 1-2시간 뒤 서비스 정상 작동 확인"
  }
  description = "Public IP 안전 정리 가이드"
}

# 비용 모니터링 가이드  
output "cost_monitoring" {
  value = {
    aws_cost_explorer = "AWS 콘솔 → Billing → Cost Explorer에서 일별/월별 비용 추적"
    key_metrics = [
      "EC2-Others (Public IP 비용)",
      "RDS (데이터베이스 비용)", 
      "ELB (로드밸런서 비용)",
      "CloudWatch (로깅/모니터링 비용)"
    ]
    
    budget_setup = {
      recommended_budget = "$70/월"
      alert_threshold = "80% 도달 시 알림"
      setup_location = "AWS 콘솔 → Billing → Budgets"
    }
  }
  description = "지속적인 비용 모니터링 가이드"
}