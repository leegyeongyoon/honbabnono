# Terraform 설정 - 중복 방지 강화
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# AWS Provider 설정
provider "aws" {
  region = var.aws_region
}

# 데이터 소스: 가용 영역
data "aws_availability_zones" "available" {
  state = "available"
}

# 로컬 값으로 간단한 이름 정의
locals {
  resource_prefix = var.app_name
}

# VPC와 서브넷은 default-vpc.tf에서 생성됨

# ECS 클러스터 (고유 이름으로 중복 방지)
resource "aws_ecs_cluster" "main" {
  name = "${local.resource_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  tags = {
    Name        = "${local.resource_prefix}-cluster"
    Environment = var.environment
  }
}

# ECS 클러스터 용량 공급자 (Spot 우선 사용으로 비용 절감)
resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name = aws_ecs_cluster.main.name

  capacity_providers = ["FARGATE_SPOT", "FARGATE"]

  default_capacity_provider_strategy {
    base              = 0
    weight            = 100
    capacity_provider = "FARGATE_SPOT"
  }

  default_capacity_provider_strategy {
    base              = 0
    weight            = 0
    capacity_provider = "FARGATE"
  }
}

# ECR 리포지토리 - 메인 앱 (고유 이름으로 중복 방지)
resource "aws_ecr_repository" "app" {
  name                 = "${local.resource_prefix}-app"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false # 스캔 비활성화로 비용 절감
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  tags = {
    Name        = "${local.resource_prefix}-app"
    Environment = var.environment
  }
}

# ECR 리포지토리 - 관리자 대시보드
resource "aws_ecr_repository" "admin" {
  name                 = "${local.resource_prefix}-admin"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = false # 스캔 비활성화로 비용 절감
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  tags = {
    Name        = "${local.resource_prefix}-admin"
    Environment = var.environment
  }
}

# ECR 라이프사이클 정책 - 메인 앱
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# ECR 라이프사이클 정책 - 관리자 대시보드
resource "aws_ecr_lifecycle_policy" "admin" {
  repository = aws_ecr_repository.admin.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Keep last 10 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCountMoreThan"
          countNumber = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

# Application Load Balancer (고유 이름으로 중복 방지)
resource "aws_lb" "main" {
  name               = "${local.resource_prefix}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = local.subnet_ids

  enable_deletion_protection = false

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  tags = {
    Name        = "${local.resource_prefix}-alb"
    Environment = var.environment
  }
}

# ALB 대상 그룹 (고유 이름으로 중복 방지)
resource "aws_lb_target_group" "app" {
  name        = "${local.resource_prefix}-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 60
    matcher             = "200,301,302"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 30
    unhealthy_threshold = 5
  }

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  tags = {
    Name        = "${local.resource_prefix}-tg"
    Environment = var.environment
  }
}

# ALB 기본 HTTP 리스너 (domain.tf에서 처리하므로 주석 처리)
# resource "aws_lb_listener" "main" {
#   count             = var.domain_name == "" ? 1 : 0
#   load_balancer_arn = aws_lb.main.arn
#   port              = "80"
#   protocol          = "HTTP"
#
#   default_action {
#     type             = "forward"
#     target_group_arn = aws_lb_target_group.app.arn
#   }
# }

# ECS 태스크 정의를 위한 IAM 역할 (고유 이름으로 중복 방지)
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${local.resource_prefix}-ecs-task-execution-role"

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${local.resource_prefix}-ecs-task-execution-role"
    Environment = var.environment
  }
}

# ECS 태스크 실행 역할에 정책 연결
resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS 태스크 역할 (고유 이름으로 중복 방지)
resource "aws_iam_role" "ecs_task_role" {
  name = "${local.resource_prefix}-ecs-task-role"

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${local.resource_prefix}-ecs-task-role"
    Environment = var.environment
  }
}

# CloudWatch 로그 그룹 (비용 최적화)
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${local.resource_prefix}"
  retention_in_days = 1 # 1일만 보관으로 비용 최소화

  tags = {
    Name        = "${local.resource_prefix}-logs"
    Environment = var.environment
  }
}

# ECS 태스크 정의
resource "aws_ecs_task_definition" "app" {
  family                   = "${local.resource_prefix}-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.fargate_cpu
  memory                   = var.fargate_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "${local.resource_prefix}-container"
      image = "${aws_ecr_repository.app.repository_url}:latest"

      portMappings = [
        {
          containerPort = 80
          hostPort      = 80
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "NODE_ENV"
          value = var.environment
        },
        {
          name  = "PORT"
          value = "80"
        },
        {
          name  = "REACT_APP_ENV"
          value = var.environment
        },
        {
          name  = "REACT_APP_API_URL"
          value = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
        },
        {
          name  = "FRONTEND_URL"
          value = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
        }
      ]

      # 최소 로그 설정 (디버깅용)
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${local.resource_prefix}-task"
    Environment = var.environment
  }
}

# ECS 서비스 (Spot 인스턴스 사용으로 비용 절감)
resource "aws_ecs_service" "main" {
  name            = "${local.resource_prefix}-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.app_count

  capacity_provider_strategy {
    capacity_provider = "FARGATE_SPOT"
    weight            = 100
    base              = 0
  }

  network_configuration {
    security_groups  = [aws_security_group.ecs_tasks.id]
    subnets          = local.subnet_ids
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.id
    container_name   = "${local.resource_prefix}-container"
    container_port   = 80
  }

  # 배포 구성 - 더 관대한 설정
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50

  # 헬스 체크 유예 기간 추가 (ALB 사용 시)
  health_check_grace_period_seconds = 300

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy,
    aws_lb_target_group.app,
    aws_lb.main
  ]

  tags = {
    Name        = "${local.resource_prefix}-service"
    Environment = var.environment
  }
}