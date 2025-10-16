# 🚀 GitHub Actions 자동 배포 가이드

GitHub Actions를 사용하여 코드 변경 시 자동으로 AWS ECS에 배포하는 방법을 설명합니다.

## 🎯 워크플로우 구성

### 1. 메인 배포 워크플로우 (`deploy.yml`)
- **트리거**: `main` 브랜치에 push 시 자동 실행
- **기능**: 
  - 인프라 자동 생성 (없는 경우)
  - Docker 이미지 빌드 및 ECR 푸시
  - ECS 서비스 업데이트
  - 배포 완료 알림

### 2. 인프라 삭제 워크플로우 (`destroy.yml`)
- **트리거**: 수동 실행만 가능
- **기능**: 
  - 안전한 인프라 삭제
  - 비용 절감을 위한 완전 정리

### 3. 비용 모니터링 워크플로우 (`cost-check.yml`)
- **트리거**: 매주 월요일 자동 실행
- **기능**: 
  - AWS 비용 자동 체크
  - 목표 비용 초과 시 알림

## ⚙️ 설정 방법

### 1. GitHub Secrets 설정

Repository → Settings → Secrets and variables → Actions에서 다음 secrets 추가:

```
AWS_ACCESS_KEY_ID: [Your AWS Access Key]
AWS_SECRET_ACCESS_KEY: [Your AWS Secret Key]
```

### 2. AWS IAM 사용자 생성

AWS 콘솔에서 새 IAM 사용자 생성 후 다음 정책 연결:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ecs:*",
                "ecr:*",
                "ec2:*",
                "elasticloadbalancing:*",
                "iam:*",
                "logs:*",
                "application-autoscaling:*",
                "ce:GetCostAndUsage"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Terraform State 백엔드 설정 (선택사항)

원격 상태 관리를 위해 S3 백엔드 설정:

```hcl
# terraform/main.tf에 추가
terraform {
  backend "s3" {
    bucket = "honbabnono-terraform-state"
    key    = "terraform.tfstate"
    region = "ap-northeast-2"
  }
}
```

## 🔄 사용법

### 자동 배포
```bash
# main 브랜치에 코드 푸시하면 자동 배포
git add .
git commit -m "feat: 새로운 기능 추가"
git push origin main
```

### 수동 배포
1. GitHub Repository → Actions 탭
2. "Deploy to AWS ECS" 워크플로우 선택
3. "Run workflow" 버튼 클릭

### 인프라 삭제
1. GitHub Repository → Actions 탭
2. "Destroy AWS Infrastructure" 워크플로우 선택
3. "Run workflow" 클릭 후 "DESTROY" 입력

### 비용 확인
1. GitHub Repository → Actions 탭
2. "Check AWS Costs" 워크플로우 실행 결과 확인

## 📊 워크플로우 상태 확인

### 실행 중인 워크플로우 확인
```bash
# GitHub CLI 사용
gh workflow list
gh run list --workflow=deploy.yml
```

### 로그 확인
```bash
# 최근 실행 로그 확인
gh run view --log
```

## ⚠️ 주의사항

### 1. 비용 관리
- 자동 배포로 인한 의도치 않은 비용 발생 주의
- 정기적으로 비용 모니터링 워크플로우 확인

### 2. 보안
- AWS 자격증명을 GitHub Secrets에만 저장
- IAM 사용자 권한을 최소한으로 제한

### 3. 브랜치 전략
```bash
# 개발용 브랜치에서 작업
git checkout -b feature/new-feature
git push origin feature/new-feature

# PR 생성 후 main에 머지하여 배포
```

## 🛠️ 트러블슈팅

### 1. 배포 실패 시
```yaml
# 워크플로우에서 디버그 모드 활성화
- name: Debug
  run: |
    aws sts get-caller-identity
    terraform version
```

### 2. 권한 오류 시
- IAM 사용자 권한 재확인
- AWS 자격증명 유효성 검사

### 3. Terraform 상태 충돌 시
```bash
# 로컬에서 상태 확인
terraform show
terraform state list
```

## 🔧 커스터마이징

### 1. 배포 조건 변경
```yaml
# 특정 태그에서만 배포
on:
  push:
    tags:
      - 'v*'
```

### 2. 환경별 배포
```yaml
# 환경별 변수 설정
env:
  ENVIRONMENT: ${{ github.ref == 'refs/heads/main' && 'production' || 'staging' }}
```

### 3. 슬랙 알림 추가
```yaml
- name: Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## 📈 고급 기능

### 1. 롤백 기능
```yaml
- name: Rollback on failure
  if: failure()
  run: |
    # 이전 태스크 정의로 롤백
    aws ecs update-service --task-definition previous-revision
```

### 2. 헬스 체크
```yaml
- name: Health check
  run: |
    curl -f http://$ALB_HOSTNAME/health || exit 1
```

### 3. 성능 테스트
```yaml
- name: Load test
  run: |
    # Artillery 또는 다른 도구로 부하 테스트
    npx artillery quick --count 10 --num 2 http://$ALB_HOSTNAME
```

## 💡 최적화 팁

### 1. 캐시 활용
```yaml
- name: Cache Docker layers
  uses: actions/cache@v3
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
```

### 2. 병렬 실행
```yaml
strategy:
  matrix:
    environment: [staging, production]
```

### 3. 조건부 실행
```yaml
- name: Deploy to production
  if: github.ref == 'refs/heads/main'
```

---

**🎯 결과**: 이제 코드를 main 브랜치에 푸시하면 자동으로 AWS ECS에 배포되며, 비용도 자동으로 모니터링됩니다!