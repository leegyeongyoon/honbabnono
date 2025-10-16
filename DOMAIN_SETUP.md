# 🌐 도메인 연결 가이드 (완전 자동화)

Terraform으로 Route 53 호스팅 존부터 SSL 인증서까지 **모든 것을 자동화**하는 방법을 설명합니다.

## 🎯 완전 자동화되는 것들

### ✅ **100% 자동 구성**:
- 🏗️ **Route 53 호스팅 존** 자동 생성
- 🔒 **SSL 인증서** 자동 발급 (무료)
- 🌐 **DNS 레코드** 자동 생성
- 🔄 **HTTPS 리다이렉트** 자동 설정
- 📱 **www 서브도메인** 자동 연결
- 📋 **네임서버** 자동 출력

## 📋 필요한 것

### 🛒 **단 1가지만 필요**:
- 도메인 구매 (어디서든 상관없음)
  - Namecheap, GoDaddy, 가비아, 후이즈 등

### ❌ **이제 불필요한 것들**:
- ~~Route 53 호스팅 존 수동 생성~~
- ~~DNS 레코드 수동 설정~~
- ~~SSL 인증서 수동 발급~~
- ~~복잡한 AWS 콘솔 작업~~

## 🚀 초간단 설정 방법

### **3단계로 끝!**

#### 1️⃣ **도메인 구매** (어디서든)
- Namecheap: `honbabnono.com` 구매 (~$10/년)
- 가비아: `honbabnono.com` 구매 (~15,000원/년)

#### 2️⃣ **terraform.tfvars 수정**
```hcl
# terraform/terraform.tfvars
domain_name = "honbabnono.com"  # 구매한 도메인으로 변경
```

#### 3️⃣ **배포**
```bash
git add .
git commit -m "feat: 도메인 연결"
git push origin main
```

**끝!** 🎉

## 📋 배포 후 자동으로 나오는 정보

```bash
# GitHub Actions 완료 후 출력:
🌐 Application URL: https://honbabnono.com
🏷️  Domain: honbabnono.com
🔒 SSL Certificate: Automatically configured
🌍 HTTPS redirect: Enabled

📋 Route 53 Nameservers:
ns-123.awsdns-12.com
ns-456.awsdns-45.net
ns-789.awsdns-78.org
ns-012.awsdns-01.co.uk

👆 이 네임서버들을 도메인 등록업체에 설정하세요!
```

## 🔄 도메인 없이 시작하기

도메인이 없어도 바로 시작할 수 있습니다:

```hcl
# terraform.tfvars
domain_name = ""  # 빈 문자열
```

나중에 도메인을 추가하려면:
1. 도메인 구매 후 Route 53 설정
2. `domain_name` 변수 업데이트
3. 재배포

## 📊 비용 정보

### Route 53 비용:
- **호스팅 존**: $0.50/월 per 도메인
- **DNS 쿼리**: 첫 10억 건까지 $0.40 per 백만 건
- **SSL 인증서**: **무료** (AWS ACM)

### 총 추가 비용: **약 $0.6/월** (800원)

## 🛠️ 네임서버 설정 (마지막 단계)

배포 완료 후 출력된 네임서버를 도메인 등록업체에 설정:

### **Namecheap**:
```
1. Domain List → 도메인 선택 → Manage
2. Nameservers → Custom DNS 선택
3. 출력된 4개 네임서버 입력
4. Save Changes
```

### **GoDaddy**:
```
1. 내 제품 → 도메인 관리
2. DNS → 네임서버 변경
3. 사용자 지정으로 변경
4. 출력된 4개 네임서버 입력
```

### **가비아**:
```
1. My가비아 → 도메인 관리
2. 네임서버 설정
3. 사용자 네임서버로 변경
4. 출력된 4개 네임서버 입력
```

### **후이즈**:
```
1. 도메인 관리 → 네임서버 변경
2. 외부 네임서버 사용
3. 출력된 4개 네임서버 입력
```

## 🚀 배포 후 확인

### 1. SSL 인증서 상태 확인
```bash
aws acm list-certificates --certificate-statuses ISSUED
```

### 2. DNS 전파 확인
```bash
# DNS 전파 확인
nslookup honbabnono.com
dig honbabnono.com

# HTTPS 접속 테스트
curl -I https://honbabnono.com
```

### 3. 리다이렉트 테스트
```bash
# HTTP → HTTPS 리다이렉트 확인
curl -I http://honbabnono.com
# → 301 Moved Permanently, Location: https://honbabnono.com

# www → 메인 도메인 확인
curl -I https://www.honbabnono.com
```

## ⚠️ 주의사항

### 1. DNS 전파 시간
- **일반적**: 5-30분
- **최대**: 48시간 (전 세계 전파)

### 2. SSL 인증서 발급 시간
- **자동 검증**: 5-10분
- **수동 개입 필요시**: 최대 72시간

### 3. Route 53 호스팅 존 삭제 시
```bash
# 도메인 사용 중단 시 호스팅 존 삭제로 비용 절약
aws route53 delete-hosted-zone --id /hostedzone/Z123456789
```

## 🔍 트러블슈팅

### 1. SSL 인증서 발급 실패
```bash
# ACM 인증서 상태 확인
aws acm describe-certificate --certificate-arn arn:aws:acm:...

# DNS 검증 레코드 확인
aws route53 list-resource-record-sets --hosted-zone-id Z123456789
```

### 2. 도메인 연결 안됨
```bash
# ALB DNS 이름 확인
aws elbv2 describe-load-balancers --names honbabnono-alb

# Route 53 레코드 확인
aws route53 list-resource-record-sets --hosted-zone-id Z123456789
```

### 3. HTTPS 연결 실패
```bash
# 보안 그룹 443 포트 확인
aws ec2 describe-security-groups --filters "Name=group-name,Values=honbabnono-alb-sg"
```

## 💡 추천 도메인 구매처

### 가성비 좋은 곳:
1. **Namecheap** - 저렴, 좋은 UX
2. **Porkbun** - 매우 저렴
3. **Cloudflare** - 도메인 + CDN 통합

### 한국 서비스:
1. **가비아** - 한국 대표
2. **후이즈** - 저렴
3. **닷네임코리아** - 안정성

## 🎯 완성된 도메인 구조

```
https://honbabnono.com        → 메인 사이트
https://www.honbabnono.com    → 메인으로 리다이렉트
http://honbabnono.com         → HTTPS로 리다이렉트
```

모든 것이 자동으로 설정되어 사용자가 어떤 URL로 접속해도 안전한 HTTPS로 연결됩니다! 🔒