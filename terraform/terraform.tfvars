# 환경별 설정값 예시 (비용 최적화)
# 실제 사용시 terraform.tfvars로 복사하여 사용하세요

aws_region     = "ap-northeast-2"
app_name       = "honbabnono"
environment    = "production"
fargate_cpu    = "256"    # 최소 CPU (비용 절감)
fargate_memory = "512"    # 최소 메모리 (비용 절감)
app_count      = 1        # 단일 인스턴스 (비용 절감)

# 도메인 설정
domain_name = "honbabnono.com"

# Route 53 호스팅 존 설정
use_existing_hosted_zone = false  # true면 기존 호스팅 존 사용, false면 새로 생성