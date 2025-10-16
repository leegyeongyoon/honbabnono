# Application Load Balancer 보안 그룹 (고유 이름으로 중복 방지)
resource "aws_security_group" "alb" {
  name        = "${local.resource_prefix}-alb-sg"
  description = "Security group for ALB"
  vpc_id      = local.vpc_id

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "${local.resource_prefix}-alb-sg"
    Environment = var.environment
  }
}

# ECS 태스크 보안 그룹 (고유 이름으로 중복 방지)
resource "aws_security_group" "ecs_tasks" {
  name        = "${local.resource_prefix}-ecs-tasks-sg"
  description = "Security group for ECS tasks"
  vpc_id      = local.vpc_id

  lifecycle {
    create_before_destroy = true
    prevent_destroy       = false
  }

  ingress {
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "Allow inbound from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = {
    Name        = "${local.resource_prefix}-ecs-tasks-sg"
    Environment = var.environment
  }
}