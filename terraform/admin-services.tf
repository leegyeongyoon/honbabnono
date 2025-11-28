# 관리자 대시보드용 ALB 대상 그룹
resource "aws_lb_target_group" "admin" {
  name        = "${local.resource_prefix}-admin-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = local.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 60
    matcher             = "200"
    path                = "/health"
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
    Name        = "${local.resource_prefix}-admin-tg"
    Environment = var.environment
  }
}

# 관리자 대시보드용 ECS 태스크 정의
resource "aws_ecs_task_definition" "admin" {
  family                   = "${local.resource_prefix}-admin-task"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "256"
  memory                   = "512"
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "${local.resource_prefix}-admin-container"
      image = "${aws_ecr_repository.admin.repository_url}:latest"

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
          name  = "REACT_APP_API_URL"
          value = var.domain_name != "" ? "https://api.${var.domain_name}" : "http://${aws_lb.main.dns_name}"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.admin.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      essential = true
    }
  ])

  tags = {
    Name        = "${local.resource_prefix}-admin-task"
    Environment = var.environment
  }
}

# 관리자 대시보드용 CloudWatch 로그 그룹
resource "aws_cloudwatch_log_group" "admin" {
  name              = "/ecs/${local.resource_prefix}-admin"
  retention_in_days = 1
  
  tags = {
    Name        = "${local.resource_prefix}-admin-logs"
    Environment = var.environment
  }
}

# 관리자 대시보드용 ECS 서비스
resource "aws_ecs_service" "admin" {
  name            = "${local.resource_prefix}-admin-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.admin.arn
  desired_count   = 1

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
    target_group_arn = aws_lb_target_group.admin.id
    container_name   = "${local.resource_prefix}-admin-container"
    container_port   = 80
  }

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 50
  health_check_grace_period_seconds  = 300

  depends_on = [
    aws_iam_role_policy_attachment.ecs_task_execution_role_policy,
    aws_lb_target_group.admin,
    aws_lb.main
  ]

  tags = {
    Name        = "${local.resource_prefix}-admin-service"
    Environment = var.environment
  }
}