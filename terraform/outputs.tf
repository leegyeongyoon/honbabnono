# 출력값 정의
output "alb_hostname" {
  description = "Application Load Balancer hostname"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Application Load Balancer zone ID"
  value       = aws_lb.main.zone_id
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name"
  value       = aws_ecs_service.main.name
}

output "domain_name" {
  description = "Domain name (if configured)"
  value       = var.domain_name != "" ? var.domain_name : "Not configured"
}

output "application_url" {
  description = "Application URL"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : "http://${aws_lb.main.dns_name}"
}

output "ssl_certificate_arn" {
  description = "SSL certificate ARN (if domain configured)"
  value       = var.domain_name != "" ? data.aws_acm_certificate.existing[0].arn : "Not configured"
}

output "hosted_zone_id" {
  description = "Route 53 hosted zone ID (if domain configured)"
  value       = var.domain_name != "" ? local.hosted_zone_id : "Not configured"
}

output "nameservers" {
  description = "Route 53 nameservers (configure these in your domain registrar)"
  value       = var.domain_name != "" ? data.aws_route53_zone.existing[0].name_servers : []
}

output "domain_setup_instructions" {
  description = "Instructions for domain setup"
  value = var.domain_name != "" ? "Domain is already configured and managed" : "No domain configured"
}