# RDS 최적화 설정
# 프리티어 유지 및 자동 중지 스케줄링

# RDS 인스턴스 최적화 (기존 것이 있다면 수정 필요)
resource "aws_db_instance" "main" {
  # 프리티어 설정
  allocated_storage     = 20              # 프리티어 최대 20GB
  max_allocated_storage = 20              # 자동 확장 방지
  storage_type          = "gp2"           # 프리티어 지원 스토리지
  engine                = "postgres"
  engine_version        = "13.13"         # 프리티어 지원 버전
  instance_class        = "db.t3.micro"   # 프리티어 인스턴스

  # 데이터베이스 설정
  identifier   = "honbabnono-db"
  db_name      = "honbabnono"
  username     = "postgres"
  password     = "honbabnono"  # 프로덕션에서는 AWS Secrets Manager 사용 권장

  # 비용 최적화 설정
  backup_retention_period   = 1           # 백업 보존 기간 최소화 (1일)
  backup_window            = "03:00-04:00" # 백업 시간 지정
  maintenance_window       = "sun:04:00-sun:05:00" # 유지보수 시간 지정
  auto_minor_version_upgrade = false      # 자동 업그레이드 비활성화
  multi_az                 = false        # Multi-AZ 비활성화 (비용 절감)
  
  # 스냅샷 설정
  final_snapshot_identifier = "honbabnono-final-snapshot"
  skip_final_snapshot      = true         # 삭제 시 스냅샷 생성 안함 (개발환경)
  delete_automated_backups = true         # 자동 백업 삭제

  # 네트워킹
  publicly_accessible = true              # public 접근 허용 (NAT Gateway 비용 절감)
  vpc_security_group_ids = [aws_security_group.rds.id]

  # 성능 모니터링 비활성화 (비용 절감)
  performance_insights_enabled = false
  monitoring_interval         = 0
  
  tags = {
    Name        = "honbabnono-db"
    Environment = "production"
  }
}

# RDS 보안 그룹
resource "aws_security_group" "rds" {
  name_prefix = "honbabnono-rds-"
  vpc_id      = local.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
    cidr_blocks     = ["0.0.0.0/0"]  # 개발 편의성 (프로덕션에서는 제한 권장)
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "honbabnono-rds-sg"
  }
}

# EventBridge 규칙 - 새벽 DB 중지 (비용 절감)
resource "aws_cloudwatch_event_rule" "stop_db_nightly" {
  name                = "stop-honbabnono-db-nightly"
  description         = "Stop RDS instance at 3 AM KST"
  schedule_expression = "cron(0 18 * * ? *)"  # UTC 18:00 = KST 03:00
}

resource "aws_cloudwatch_event_rule" "start_db_morning" {
  name                = "start-honbabnono-db-morning"
  description         = "Start RDS instance at 9:30 AM KST"
  schedule_expression = "cron(30 0 * * ? *)"  # UTC 00:30 = KST 09:30
}

# Lambda 함수를 위한 IAM 역할
resource "aws_iam_role" "lambda_rds_role" {
  name = "honbabnono-lambda-rds-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_rds_policy" {
  name = "honbabnono-lambda-rds-policy"
  role = aws_iam_role.lambda_rds_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "arn:aws:logs:*:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "rds:StopDBInstance",
          "rds:StartDBInstance",
          "rds:DescribeDBInstances"
        ]
        Resource = "*"
      }
    ]
  })
}

# Lambda 함수 - RDS 중지
resource "aws_lambda_function" "stop_rds" {
  filename         = "stop_rds.zip"
  function_name    = "honbabnono-stop-rds"
  role            = aws_iam_role.lambda_rds_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.stop_rds_zip.output_base64sha256
  runtime         = "python3.9"
  timeout         = 60

  environment {
    variables = {
      DB_INSTANCE_IDENTIFIER = aws_db_instance.main.identifier
    }
  }
}

# Lambda 함수 - RDS 시작
resource "aws_lambda_function" "start_rds" {
  filename         = "start_rds.zip"
  function_name    = "honbabnono-start-rds"
  role            = aws_iam_role.lambda_rds_role.arn
  handler         = "index.handler"
  source_code_hash = data.archive_file.start_rds_zip.output_base64sha256
  runtime         = "python3.9"
  timeout         = 60

  environment {
    variables = {
      DB_INSTANCE_IDENTIFIER = aws_db_instance.main.identifier
    }
  }
}

# Lambda 함수 코드 아카이브
data "archive_file" "stop_rds_zip" {
  type        = "zip"
  output_path = "stop_rds.zip"
  source {
    content = <<EOF
import boto3
import os

def handler(event, context):
    rds = boto3.client('rds')
    db_identifier = os.environ['DB_INSTANCE_IDENTIFIER']
    
    try:
        rds.stop_db_instance(DBInstanceIdentifier=db_identifier)
        return {'statusCode': 200, 'body': f'Successfully stopped {db_identifier}'}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'body': f'Error: {str(e)}'}
EOF
    filename = "index.py"
  }
}

data "archive_file" "start_rds_zip" {
  type        = "zip"
  output_path = "start_rds.zip"
  source {
    content = <<EOF
import boto3
import os

def handler(event, context):
    rds = boto3.client('rds')
    db_identifier = os.environ['DB_INSTANCE_IDENTIFIER']
    
    try:
        rds.start_db_instance(DBInstanceIdentifier=db_identifier)
        return {'statusCode': 200, 'body': f'Successfully started {db_identifier}'}
    except Exception as e:
        print(f'Error: {str(e)}')
        return {'statusCode': 500, 'body': f'Error: {str(e)}'}
EOF
    filename = "index.py"
  }
}

# EventBridge 타겟 - Lambda 함수
resource "aws_cloudwatch_event_target" "stop_db_target" {
  rule      = aws_cloudwatch_event_rule.stop_db_nightly.name
  target_id = "StopDBTarget"
  arn       = aws_lambda_function.stop_rds.arn
}

resource "aws_cloudwatch_event_target" "start_db_target" {
  rule      = aws_cloudwatch_event_rule.start_db_morning.name
  target_id = "StartDBTarget"
  arn       = aws_lambda_function.start_rds.arn
}

# Lambda 권한 - EventBridge에서 Lambda 호출 허용
resource "aws_lambda_permission" "allow_eventbridge_stop" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.stop_rds.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.stop_db_nightly.arn
}

resource "aws_lambda_permission" "allow_eventbridge_start" {
  statement_id  = "AllowExecutionFromEventBridge"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.start_rds.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.start_db_morning.arn
}