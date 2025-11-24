# 🎨 새로운 색상 시스템 가이드

## 제공된 색상 팔레트
```
#F5E8C7 - 연한 크림베이지
#DEBA9D - 따뜻한 베이지  
#9E7777 - 모브 브라운
#6F4C5B - 진한 와인브라운
```

## 🔧 색상 사용법

### 1. 주요 액션 및 버튼
```typescript
// 일반 버튼 (클릭 가능한 주요 액션)
backgroundColor: COLORS.primary.main,  // #DEBA9D

// 강조 버튼 (중요한 액션 - 저장, 확인 등)
backgroundColor: COLORS.primary.dark,  // #9E7777

// 최고 중요도 버튼 (삭제, 결제 등)
backgroundColor: COLORS.primary.accent, // #6F4C5B

// 비활성화된 버튼
backgroundColor: COLORS.secondary.light, // #F8F1E8
```

### 2. 배경 및 카드
```typescript
// 앱 기본 배경
backgroundColor: COLORS.neutral.background, // #F8F1E8

// 카드 배경
backgroundColor: COLORS.neutral.white,      // #FFFFFF
backgroundColor: COLORS.secondary.warm,     // #F2E5D3 (따뜻한 느낌)

// 연한 구분 배경
backgroundColor: COLORS.primary.light,     // #F5E8C7
```

### 3. 텍스트
```typescript
// 주요 제목, 중요한 텍스트
color: COLORS.text.primary,    // #6F4C5B (가장 진한 와인브라운)

// 일반 텍스트, 설명
color: COLORS.text.secondary,  // #9E7777 (모브 브라운)

// 보조 텍스트, 힌트
color: COLORS.text.tertiary,   // #B89A85 (연한 브라운)
```

### 4. 상태별 컬러
```typescript
// 성공 (완료, 성공 메시지)
color: COLORS.functional.success, // #7A9471

// 경고 (주의 메시지)
color: COLORS.functional.warning, // #D4A574

// 에러 (오류 메시지, 삭제)
color: COLORS.functional.error,   // #B85D5D
```

## 🎯 실제 사용 예시

### 버튼 강도별 사용
1. **연한 버튼** (취소, 뒤로가기): `COLORS.secondary.light` (#F8F1E8)
2. **일반 버튼** (저장, 수정): `COLORS.primary.main` (#DEBA9D)  
3. **강조 버튼** (완료, 확인): `COLORS.primary.dark` (#9E7777)
4. **위험 버튼** (삭제, 탈퇴): `COLORS.primary.accent` (#6F4C5B)

### 그라데이션 사용
```typescript
// 부드러운 배경 그라데이션
background: linear-gradient(COLORS.gradient.secondary) 
// #E8CDB0 → #F8F1E8

// 강조 요소 그라데이션  
background: linear-gradient(COLORS.gradient.warm)
// #9E7777 → #DEBA9D

// 헤더나 특별한 요소
background: linear-gradient(COLORS.gradient.sunset)
// #F5E8C7 → #DEBA9D → #9E7777
```

## ✨ 새로운 색감의 특징
- 따뜻하고 부드러운 베이지 톤
- 자연스럽고 편안한 느낌
- 모든 색상이 조화롭게 어우러짐
- 가독성 좋은 텍스트 대비
- 우아하고 세련된 분위기