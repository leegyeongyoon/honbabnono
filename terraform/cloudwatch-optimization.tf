# CloudWatch 로그 및 메트릭 최적화

# 기존 CloudWatch 로그 그룹들 정리
# 1. ECS 로그 그룹 (이미 main.tf에 있음 - 1일 보존)
# 2. Lambda 로그 그룹들 추가

# Lambda 함수들의 로그 그룹 (자동 생성 방지 및 수동 관리)
resource "aws_cloudwatch_log_group" "lambda_stop_rds" {
  name              = "/aws/lambda/honbabnono-stop-rds"
  retention_in_days = 3 # Lambda 로그는 3일만 보관

  tags = {
    Name        = "honbabnono-lambda-stop-rds-logs"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_group" "lambda_start_rds" {
  name              = "/aws/lambda/honbabnono-start-rds"
  retention_in_days = 3 # Lambda 로그는 3일만 보관

  tags = {
    Name        = "honbabnono-lambda-start-rds-logs"
    Environment = var.environment
  }
}

# Admin ECS 서비스 로그 그룹은 admin-services.tf에 이미 존재함

# CloudWatch 메트릭 필터 제거 (불필요한 커스텀 메트릭 방지)
# resource "aws_cloudwatch_log_metric_filter" "error_count" {
#   name           = "ErrorCount"
#   log_group_name = aws_cloudwatch_log_group.app.name
#   pattern        = "ERROR"
#   
#   metric_transformation {
#     name      = "ErrorCount"
#     namespace = "Honbabnono/Application"
#     value     = "1"
#   }
# }

# CloudWatch 대시보드 제거 (비용 절감)
# resource "aws_cloudwatch_dashboard" "main" {
#   dashboard_name = "honbabnono-dashboard"
# }

# 필수 알람만 유지 - CPU 사용률
resource "aws_cloudwatch_metric_alarm" "ecs_high_cpu" {
  alarm_name          = "honbabnono-ecs-high-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "3" # 3번 연속 초과시 알람
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = "300" # 5분 간격
  statistic           = "Average"
  threshold           = "80" # CPU 80% 초과시
  alarm_description   = "ECS CPU utilization is too high"

  # SNS 알림 제거 (비용 절감)
  alarm_actions = []
  ok_actions    = []

  dimensions = {
    ServiceName = aws_ecs_service.main.name
    ClusterName = aws_ecs_cluster.main.name
  }

  tags = {
    Name        = "honbabnono-ecs-high-cpu"
    Environment = var.environment
  }
}

# RDS 연결 실패 알람 (중요한 것만 유지)
resource "aws_cloudwatch_metric_alarm" "rds_connection_failures" {
  alarm_name          = "honbabnono-rds-connection-failures"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "0"
  alarm_description   = "RDS database connections failed"
  treat_missing_data  = "notBreaching"

  alarm_actions = []
  ok_actions    = []

  dimensions = {
    DBInstanceIdentifier = data.aws_db_instance.main.identifier
  }

  tags = {
    Name        = "honbabnono-rds-connections"
    Environment = var.environment
  }
}

# 불필요한 메트릭 알람들 주석 처리
# resource "aws_cloudwatch_metric_alarm" "memory_utilization" {
#   alarm_name          = "honbabnono-memory-high"
#   comparison_operator = "GreaterThanThreshold"
#   evaluation_periods  = "2"
#   metric_name         = "MemoryUtilization"
#   namespace           = "AWS/ECS"
#   period              = "120"
#   statistic           = "Average"
#   threshold           = "85"
# }

# CloudWatch Insights 쿼리들 제거 (비용 절감)
# resource "aws_cloudwatch_query_definition" "error_analysis" {
#   name = "Error Analysis"
#   log_group_names = [
#     aws_cloudwatch_log_group.app.name
#   ]
#   query_string = "fields @timestamp, @message | filter @message like /ERROR/"
# }

# X-Ray 트레이싱 비활성화 (필요하지 않은 경우)
# resource "aws_xray_sampling_rule" "main" {
#   rule_name      = "honbabnono-sampling"
#   priority       = 9000
#   version        = 1
#   reservoir_size = 1
#   fixed_rate     = 0.1
#   url_path       = "*"
#   host           = "*"
#   http_method    = "*"
#   service_type   = "*"
#   service_name   = "*"
#   resource_arn   = "*"
# }

# CloudWatch Logs 구독 필터 제거 (Kinesis나 Lambda로 스트리밍하지 않음)
# resource "aws_cloudwatch_log_subscription_filter" "kinesis_logs_filter" {
#   name            = "kinesis_logs_filter"
#   log_group_name  = aws_cloudwatch_log_group.app.name
#   filter_pattern  = ""
#   destination_arn = "arn:aws:kinesis:region:account:stream/stream-name"
# }

# VPC Flow Logs 비활성화 (불필요한 로그)
# resource "aws_flow_log" "vpc_flow_log" {
#   iam_role_arn    = aws_iam_role.flow_log.arn
#   log_destination = aws_cloudwatch_log_group.vpc_flow_log.arn
#   traffic_type    = "ALL"
#   vpc_id          = local.vpc_id
# }

# CloudTrail 로그 비활성화 (개발환경에서는 불필요)
# resource "aws_cloudtrail" "main" {
#   name                          = "honbabnono-cloudtrail"
#   s3_bucket_name               = aws_s3_bucket.cloudtrail.bucket
#   include_global_service_events = false
# }