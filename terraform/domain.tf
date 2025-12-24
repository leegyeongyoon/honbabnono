# 도메인 관련 리소스 (선택사항)
# 도메인을 사용하려면 variables.tf에서 domain_name을 설정하세요

# Route 53 호스팅 존 (기존 것 사용하므로 주석 처리)
# resource "aws_route53_zone" "main" {
#   count = var.domain_name != "" ? 1 : 0
#   name  = var.domain_name
#
#   tags = {
#     Name        = "${var.app_name}-hosted-zone"
#     Environment = var.environment
#   }
# }

# 기존 호스팅 존 사용을 위한 데이터 소스
data "aws_route53_zone" "existing" {
  count = var.domain_name != "" ? 1 : 0
  name  = var.domain_name
}

# 실제 사용할 호스팅 존 (기존 것 사용)
locals {
  hosted_zone_id = var.domain_name != "" ? data.aws_route53_zone.existing[0].zone_id : ""
  # 리스너 의존성을 위한 로컬 값
  listeners_ready = [
    aws_lb_listener.https,
    aws_lb_listener.redirect
  ]
}

# SSL 인증서 (기존 것 사용)
data "aws_acm_certificate" "existing" {
  count    = var.domain_name != "" ? 1 : 0
  domain   = var.domain_name
  statuses = ["ISSUED"]
}

# SSL 인증서 DNS 검증 레코드 (이미 존재하므로 주석 처리)
# resource "aws_route53_record" "cert_validation" {
#   count   = var.domain_name != "" ? length(aws_acm_certificate.main[0].domain_validation_options) : 0
#   zone_id = local.hosted_zone_id
#   name    = tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_name
#   type    = tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_type
#   records = [tolist(aws_acm_certificate.main[0].domain_validation_options)[count.index].resource_record_value]
#   ttl     = 60
# }

# SSL 인증서 검증 완료 대기 (이미 존재하므로 주석 처리)
# resource "aws_acm_certificate_validation" "main" {
#   count                   = var.domain_name != "" ? 1 : 0
#   certificate_arn         = aws_acm_certificate.main[0].arn
#   validation_record_fqdns = aws_route53_record.cert_validation[*].fqdn
# 
#   timeouts {
#     create = "5m"
#   }
# }

# ALB에 HTTPS 리스너 추가 (기존 인증서 사용) - 항상 생성
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-2016-08"
  certificate_arn   = "arn:aws:acm:ap-northeast-2:975050251584:certificate/63c3339b-6ef2-482c-8767-970483e80af9"

  # 기본 액션: 메인 앱으로 포워딩
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# HTTPS 리스너 룰: admin 서브도메인을 관리자 대시보드로 라우팅
resource "aws_lb_listener_rule" "admin" {
  listener_arn = aws_lb_listener.https.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.admin.arn
  }

  condition {
    host_header {
      values = ["admin.honbabnono.com"]
    }
  }
}

# HTTP에서 HTTPS로 리다이렉트 - 항상 생성
resource "aws_lb_listener" "redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

# 도메인을 ALB로 연결하는 A 레코드 - 항상 생성
resource "aws_route53_record" "main" {
  zone_id = "Z063704727QK0JIQO9M5I"
  name    = "honbabnono.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = false
  }

  depends_on = [
    aws_lb_listener.https,
    aws_lb_listener.redirect
  ]
}

# www 서브도메인도 메인 도메인으로 리다이렉트 - 항상 생성
resource "aws_route53_record" "www" {
  zone_id = "Z063704727QK0JIQO9M5I"
  name    = "www.honbabnono.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = false
  }

  depends_on = [
    aws_lb_listener.https,
    aws_lb_listener.redirect
  ]
}

# 관리자 서브도메인 레코드 추가
resource "aws_route53_record" "admin" {
  zone_id = "Z063704727QK0JIQO9M5I"
  name    = "admin.honbabnono.com"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = false
  }

  depends_on = [
    aws_lb_listener.https,
    aws_lb_listener.redirect,
    aws_lb_listener_rule.admin
  ]
}