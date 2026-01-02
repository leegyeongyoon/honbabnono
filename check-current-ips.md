# 현재 Public IP 사용 현황 확인 가이드

## 1. 수동으로 현재 상황 확인

### AWS CLI로 확인
```bash
# 1. 모든 Elastic IP 조회
aws ec2 describe-addresses --region ap-northeast-2

# 2. 현재 실행 중인 EC2 인스턴스 확인  
aws ec2 describe-instances --filters "Name=instance-state-name,Values=running" --region ap-northeast-2

# 3. ECS 클러스터 및 서비스 확인
aws ecs describe-clusters --clusters honbabnono-cluster --region ap-northeast-2
aws ecs describe-services --cluster honbabnono-cluster --services honbabnono-service --region ap-northeast-2

# 4. Load Balancer 확인
aws elbv2 describe-load-balancers --region ap-northeast-2

# 5. RDS 인스턴스 확인
aws rds describe-db-instances --region ap-northeast-2
```

## 2. AWS 콘솔에서 확인

### EC2 대시보드
1. **EC2 → Elastic IP addresses**
   - 각 IP의 연결 상태 확인
   - "Associated" 여부 체크
   - 연결되지 않은 IP = 불필요한 비용

2. **EC2 → Instances**
   - 현재 실행 중인 인스턴스
   - 각 인스턴스의 Public IP 할당 상태

3. **EC2 → Load Balancers**
   - ALB/NLB의 Public IP 사용 현황

### ECS 대시보드
1. **ECS → Clusters → honbabnono-cluster**
   - 실행 중인 태스크들의 Public IP 설정
   - `assign_public_ip` 설정 확인

## 3. 예상되는 IP 사용 패턴

### 정상적인 사용 (유지해야 함)
- **ALB**: AWS 관리 Public IP (자동 할당)
- **ECS 태스크**: 동적 Public IP (임시 할당)
- **RDS**: Public 접근 허용 시 AWS 관리 IP

### 불필요할 가능성이 높은 것들
- **연결되지 않은 Elastic IP** ⭐️ (가장 가능성 높음)
- **삭제된 EC2 인스턴스의 남은 IP**
- **테스트용으로 생성 후 방치된 IP**
- **NAT Instance용 IP** (현재 NAT Gateway 없음)

## 4. 안전한 정리 순서

1. **확인**: 연결되지 않은 Elastic IP 식별
2. **검증**: 해당 IP가 정말 불필요한지 3번 확인
3. **백업**: IP 주소와 용도 기록
4. **해제**: AWS 콘솔에서 "Release addresses"
5. **모니터링**: 1-2일 후 서비스 정상 작동 확인

## 5. 주의사항 ⚠️

### 절대 해제하면 안 되는 것들
- 현재 연결된 모든 Elastic IP
- 프로덕션 서비스에 할당된 IP
- 도메인에 연결된 고정 IP

### 의심스러울 때는 그냥 두기
- 용도가 불분명한 IP
- 장애 대비용일 가능성이 있는 IP
- 특별한 설정이 필요한 IP

## 6. Terraform 출력으로 확인
terraform apply 후 다음 명령어로 상세 분석 확인:
```bash
cd terraform
terraform output detailed_public_ip_usage
terraform output safe_cleanup_recommendations
```