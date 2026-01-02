# 추가 비용 최적화 설정

# CloudWatch 대시보드 제거 (불필요한 비용)
# resource "aws_cloudwatch_dashboard" "main" {
#   dashboard_name = "${var.app_name}-dashboard"
# }

# CloudWatch 알람 최소화 (필수만 유지)
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.app_name}-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300"  # 5분 간격으로 확장
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "This metric monitors ecs cpu utilization"
  alarm_actions       = []  # SNS 알림 제거로 비용 절감

  dimensions = {
    ServiceName = aws_ecs_service.main.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name        = "${var.app_name}-high-cpu-alarm"
    Environment = var.environment
  }
}

# ECS 서비스 스케일링 정책 (필요시에만 확장)
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 2  # 최대 2개 인스턴스로 제한
  min_capacity       = 1  # 최소 1개 유지
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "ecs_scale_up" {
  name               = "${var.app_name}-scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = 70.0  # 70% CPU 사용률에서 스케일링
    scale_in_cooldown  = 300   # 스케일 다운 쿨다운 5분
    scale_out_cooldown = 300   # 스케일 업 쿨다운 5분
  }
}

# ECR 이미지 스캔 비활성화는 main.tf에서 이미 설정됨
# ECR 리포지토리 정책 (필요시에만)
resource "aws_ecr_repository_policy" "app_policy" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    Version = "2008-10-17"
    Statement = [
      {
        Sid       = "AllowPull"
        Effect    = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action = [
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:GetAuthorizationToken"
        ]
      }
    ]
  })
}

# AWS 계정 ID는 resource-validation.tf에 이미 선언됨

# S3 버킷 라이프사이클 정책 (로그 및 임시 파일 정리)
resource "aws_s3_bucket" "logs" {
  bucket        = "${var.app_name}-logs-${random_id.bucket_suffix.hex}"
  force_destroy = true

  tags = {
    Name        = "${var.app_name}-logs"
    Environment = var.environment
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "logs_lifecycle" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "delete_old_logs"
    status = "Enabled"
    
    filter {
      prefix = ""
    }

    expiration {
      days = 7  # 7일 후 자동 삭제
    }

    noncurrent_version_expiration {
      noncurrent_days = 1  # 이전 버전 1일 후 삭제
    }
  }
}

resource "aws_s3_bucket_public_access_block" "logs_pab" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# VPC Flow Logs 비활성화 (개발환경에서는 불필요)
# resource "aws_flow_log" "vpc_flow_log" {
#   iam_role_arn    = aws_iam_role.flow_log_role.arn
#   log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
#   traffic_type    = "ALL"
#   vpc_id          = local.vpc_id
# }

# CloudTrail 비활성화 (개발환경에서는 불필요)
# resource "aws_cloudtrail" "main" {
#   name                          = "${var.app_name}-cloudtrail"
#   s3_bucket_name               = aws_s3_bucket.cloudtrail.bucket
# }