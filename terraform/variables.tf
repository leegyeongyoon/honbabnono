# 변수 정의
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-northeast-2"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "honbabnono"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "fargate_cpu" {
  description = "Fargate instance CPU units to provision (1 vCPU = 1024 CPU units)"
  type        = string
  default     = "256" # 최소 CPU로 비용 절감
}

variable "fargate_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  type        = string
  default     = "512" # 최소 메모리로 비용 절감
}

variable "app_count" {
  description = "Number of docker containers to run"
  type        = number
  default     = 1 # 단일 인스턴스로 시작하여 비용 절감
}

variable "domain_name" {
  description = "Domain name for the application (optional). Leave empty to use ALB DNS name only."
  type        = string
  default     = "honbabnono.com"

  validation {
    condition     = var.domain_name == "" || can(regex("^[a-z0-9.-]+\\.[a-z]{2,}$", var.domain_name))
    error_message = "Domain name must be a valid domain format (e.g., example.com) or empty string."
  }
}

variable "use_existing_hosted_zone" {
  description = "Use existing Route 53 hosted zone instead of creating a new one"
  type        = bool
  default     = false
}