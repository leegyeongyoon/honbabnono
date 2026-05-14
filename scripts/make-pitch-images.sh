#!/bin/bash
# 잇테이블 멘토링 신청서 첨부용 이미지 6장 생성
# 출력: ~/Desktop/잇테이블-자료/

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc
OUT=~/Desktop/잇테이블-자료
mkdir -p $OUT

# 브랜드 컬러
BG_BEIGE="0xC4A08A"
BG_BEIGE_LIGHT="0xE8D4C2"
BG_DARK="0x1a1a1a"
BG_WARM_DARK="0x2a2018"
ACCENT_RED="#E84A5F"
ACCENT_GREEN="#5BBA6F"
ACCENT_GOLD="#D4A574"

W=1920
H=1080

# ─────────────────────────────────────────────
# Q1: 히어로 카드 — 베이지 배경 + 잇테이블 + 한 줄 소개
# ─────────────────────────────────────────────
echo "[1/6] Q1 히어로"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE:s=${W}x${H}" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=200:fontcolor=#1a1a1a:x=(w-text_w)/2:y=280,\
drawtext=fontfile=$FONT:text='EatTable':fontsize=64:fontcolor=#3a2a1a:x=(w-text_w)/2:y=500,\
drawtext=fontfile=$FONT:text='멀리서 미리 예약·메뉴·결제':fontsize=52:fontcolor=#1a1a1a:x=(w-text_w)/2:y=700,\
drawtext=fontfile=$FONT:text='도착하면 바로 식사':fontsize=52:fontcolor=$ACCENT_RED:x=(w-text_w)/2:y=790,\
drawtext=fontfile=$FONT:text='선주문형 외식 예약 플랫폼':fontsize=36:fontcolor=#3a2a1a:x=(w-text_w)/2:y=920" \
  -frames:v 1 $OUT/Q1-hero.jpg 2>&1 | tail -1

# ─────────────────────────────────────────────
# Q2: 시장 4분할 통계 카드
# ─────────────────────────────────────────────
echo "[2/6] Q2 시장 4분할 통계"
$FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${W}x${H}" \
  -vf "\
drawtext=fontfile=$FONT:text='시장은 이미 디지털로 빠르게 이동 중':fontsize=44:fontcolor=#F4E4D7:x=(w-text_w)/2:y=70,\
drawbox=x=80:y=160:w=850:h=400:color=0x2a2018@1:t=fill,\
drawtext=fontfile=$FONT:text='사이렌오더':fontsize=38:fontcolor=$ACCENT_GOLD:x=120:y=200,\
drawtext=fontfile=$FONT:text='주문 결제 비중':fontsize=28:fontcolor=#999:x=120:y=255,\
drawtext=fontfile=$FONT:text='40%':fontsize=180:fontcolor=#F4E4D7:x=120:y=320,\
drawtext=fontfile=$FONT:text='2019(20%) → 2025(40%)':fontsize=26:fontcolor=#888:x=120:y=510,\
drawbox=x=990:y=160:w=850:h=400:color=0x2a2018@1:t=fill,\
drawtext=fontfile=$FONT:text='캐치테이블':fontsize=38:fontcolor=$ACCENT_GOLD:x=1030:y=200,\
drawtext=fontfile=$FONT:text='월 활성 사용자':fontsize=28:fontcolor=#999:x=1030:y=255,\
drawtext=fontfile=$FONT:text='500만':fontsize=180:fontcolor=#F4E4D7:x=1030:y=320,\
drawtext=fontfile=$FONT:text='2024년 8월 기준':fontsize=26:fontcolor=#888:x=1030:y=510,\
drawbox=x=80:y=580:w=850:h=400:color=0x2a2018@1:t=fill,\
drawtext=fontfile=$FONT:text='티오더 (테이블오더)':fontsize=38:fontcolor=$ACCENT_GOLD:x=120:y=620,\
drawtext=fontfile=$FONT:text='누적 결제액':fontsize=28:fontcolor=#999:x=120:y=675,\
drawtext=fontfile=$FONT:text='10조원':fontsize=180:fontcolor=#F4E4D7:x=120:y=740,\
drawtext=fontfile=$FONT:text='시장 점유율 60% 이상':fontsize=26:fontcolor=#888:x=120:y=930,\
drawbox=x=990:y=580:w=850:h=400:color=0x2a2018@1:t=fill,\
drawtext=fontfile=$FONT:text='예약·웨이팅 앱':fontsize=38:fontcolor=$ACCENT_GOLD:x=1030:y=620,\
drawtext=fontfile=$FONT:text='3년간 사용자 증가':fontsize=28:fontcolor=#999:x=1030:y=675,\
drawtext=fontfile=$FONT:text='+185%':fontsize=180:fontcolor=#F4E4D7:x=1030:y=740,\
drawtext=fontfile=$FONT:text='102만(2022) → 291만(2025)':fontsize=26:fontcolor=#888:x=1030:y=930,\
drawtext=fontfile=$FONT:text='출처: 스타벅스 코리아 · 와이즈앱 · 네이트뉴스 · 전자신문':fontsize=22:fontcolor=#666:x=(w-text_w)/2:y=1030" \
  -frames:v 1 $OUT/Q2-market-stats.jpg 2>&1 | tail -1

# ─────────────────────────────────────────────
# Q3-1: 노쇼 통계 카드
# ─────────────────────────────────────────────
echo "[3/6] Q3 노쇼 통계"
$FFMPEG -y -f lavfi -i "color=c=$BG_WARM_DARK:s=${W}x${H}" \
  -vf "\
drawtext=fontfile=$FONT:text='외식업 점주가 마주하는 현실':fontsize=44:fontcolor=#F4E4D7:x=(w-text_w)/2:y=80,\
drawbox=x=120:y=200:w=820:h=720:color=0x1a1a1a@1:t=fill,\
drawtext=fontfile=$FONT:text='노쇼 피해 매장':fontsize=42:fontcolor=#999:x=160:y=240,\
drawtext=fontfile=$FONT:text='65%':fontsize=360:fontcolor=$ACCENT_RED:x=160:y=350,\
drawtext=fontfile=$FONT:text='최근 3년 사이':fontsize=32:fontcolor=#888:x=160:y=780,\
drawtext=fontfile=$FONT:text='외식 점포 10곳 중 6곳 이상':fontsize=32:fontcolor=#F4E4D7:x=160:y=830,\
drawbox=x=980:y=200:w=820:h=720:color=0x1a1a1a@1:t=fill,\
drawtext=fontfile=$FONT:text='1회 노쇼당 손실':fontsize=42:fontcolor=#999:x=1020:y=240,\
drawtext=fontfile=$FONT:text='44만원':fontsize=240:fontcolor=$ACCENT_RED:x=1020:y=370,\
drawtext=fontfile=$FONT:text='평균':fontsize=42:fontcolor=#999:x=1020:y=660,\
drawtext=fontfile=$FONT:text='재료 폐기 + 매출 손실':fontsize=32:fontcolor=#888:x=1020:y=780,\
drawtext=fontfile=$FONT:text='피해 점포는 평균 8.6회':fontsize=32:fontcolor=#F4E4D7:x=1020:y=830,\
drawtext=fontfile=$FONT:text='출처: 중소벤처기업부 · 한국외식업중앙회 (2025.12 · 214개 사업체)':fontsize=24:fontcolor=#666:x=(w-text_w)/2:y=1020" \
  -frames:v 1 $OUT/Q3-noshow-stats.jpg 2>&1 | tail -1

# ─────────────────────────────────────────────
# Q3-2: Before/After 시간 비교
# ─────────────────────────────────────────────
echo "[4/6] Q3 Before/After 시간 비교"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE_LIGHT:s=${W}x${H}" \
  -vf "\
drawtext=fontfile=$FONT:text='식사 시작까지 걸리는 시간':fontsize=52:fontcolor=#1a1a1a:x=(w-text_w)/2:y=70,\
drawbox=x=100:y=200:w=820:h=720:color=0xFFFFFF@1:t=fill,\
drawtext=fontfile=$FONT:text='지금':fontsize=42:fontcolor=#888:x=440:y=240,\
drawtext=fontfile=$FONT:text='30분':fontsize=240:fontcolor=$ACCENT_RED:x=350:y=320,\
drawtext=fontfile=$FONT:text='줄 서기 · 자리 안내':fontsize=30:fontcolor=#3a2a1a:x=160:y=620,\
drawtext=fontfile=$FONT:text='8분':fontsize=30:fontcolor=$ACCENT_RED:x=750:y=620,\
drawtext=fontfile=$FONT:text='메뉴 고민':fontsize=30:fontcolor=#3a2a1a:x=160:y=680,\
drawtext=fontfile=$FONT:text='5분':fontsize=30:fontcolor=$ACCENT_RED:x=750:y=680,\
drawtext=fontfile=$FONT:text='주문 · 결제':fontsize=30:fontcolor=#3a2a1a:x=160:y=740,\
drawtext=fontfile=$FONT:text='5분':fontsize=30:fontcolor=$ACCENT_RED:x=750:y=740,\
drawtext=fontfile=$FONT:text='음식 나오기':fontsize=30:fontcolor=#3a2a1a:x=160:y=800,\
drawtext=fontfile=$FONT:text='12분':fontsize=30:fontcolor=$ACCENT_RED:x=750:y=800,\
drawbox=x=1000:y=200:w=820:h=720:color=0xFFFFFF@1:t=fill,\
drawtext=fontfile=$FONT:text='잇테이블':fontsize=42:fontcolor=$ACCENT_GREEN:x=1340:y=240,\
drawtext=fontfile=$FONT:text='5분':fontsize=240:fontcolor=$ACCENT_GREEN:x=1300:y=320,\
drawtext=fontfile=$FONT:text='줄 서기 · 자리 안내':fontsize=30:fontcolor=#3a2a1a:x=1060:y=620,\
drawtext=fontfile=$FONT:text='0분':fontsize=30:fontcolor=$ACCENT_GREEN:x=1650:y=620,\
drawtext=fontfile=$FONT:text='메뉴 고민':fontsize=30:fontcolor=#3a2a1a:x=1060:y=680,\
drawtext=fontfile=$FONT:text='0분':fontsize=30:fontcolor=$ACCENT_GREEN:x=1650:y=680,\
drawtext=fontfile=$FONT:text='주문 · 결제':fontsize=30:fontcolor=#3a2a1a:x=1060:y=740,\
drawtext=fontfile=$FONT:text='0분':fontsize=30:fontcolor=$ACCENT_GREEN:x=1650:y=740,\
drawtext=fontfile=$FONT:text='음식 나오기':fontsize=30:fontcolor=#3a2a1a:x=1060:y=800,\
drawtext=fontfile=$FONT:text='약 5분':fontsize=30:fontcolor=$ACCENT_GREEN:x=1650:y=800,\
drawtext=fontfile=$FONT:text='약 25분 절약':fontsize=64:fontcolor=$ACCENT_RED:x=(w-text_w)/2:y=970" \
  -frames:v 1 $OUT/Q3-before-after.jpg 2>&1 | tail -1

# ─────────────────────────────────────────────
# Q4-1: 프로토타입 3분할 콜라주
# ─────────────────────────────────────────────
echo "[5/6] Q4 프로토타입 3분할 콜라주"

# 3가지 스크린샷이 있는지 확인
CUSTOMER_IMG=/tmp/page-diagnostics/customer/roothome.png
MERCHANT_IMG=/tmp/page-diagnostics/merchant/root.png
ADMIN_IMG=/tmp/page-diagnostics/admin/rootdashboard.png

if [ -f "$CUSTOMER_IMG" ] && [ -f "$MERCHANT_IMG" ] && [ -f "$ADMIN_IMG" ]; then
  $FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${W}x${H}" \
    -i "$CUSTOMER_IMG" -i "$MERCHANT_IMG" -i "$ADMIN_IMG" \
    -filter_complex "\
[1:v]scale=440:-1[c];\
[2:v]scale=620:-1[m];\
[3:v]scale=620:-1[a];\
[0:v][c]overlay=120:280[t1];\
[t1][m]overlay=640:280[t2];\
[t2][a]overlay=1280:280[t3]" \
    -map "[t3]" \
    -vf "\
drawtext=fontfile=$FONT:text='실제 작동하는 프로토타입':fontsize=44:fontcolor=#F4E4D7:x=(w-text_w)/2:y=80,\
drawtext=fontfile=$FONT:text='고객':fontsize=40:fontcolor=$ACCENT_GOLD:x=270:y=200,\
drawtext=fontfile=$FONT:text='검색 · 예약 · 메뉴 · 결제':fontsize=24:fontcolor=#888:x=180:y=850,\
drawtext=fontfile=$FONT:text='점주':fontsize=40:fontcolor=$ACCENT_GOLD:x=900:y=200,\
drawtext=fontfile=$FONT:text='예약 보드 · 메뉴 · 정산':fontsize=24:fontcolor=#888:x=750:y=850,\
drawtext=fontfile=$FONT:text='관리자':fontsize=40:fontcolor=$ACCENT_GOLD:x=1540:y=200,\
drawtext=fontfile=$FONT:text='매장 검토 · 승인':fontsize=24:fontcolor=#888:x=1430:y=850,\
drawtext=fontfile=$FONT:text='eattable.kr  ·  merchant.eattable.kr  ·  admin.eattable.kr':fontsize=24:fontcolor=#666:x=(w-text_w)/2:y=1020" \
    -frames:v 1 $OUT/Q4-prototype-collage.jpg 2>&1 | tail -1
else
  echo "  ⚠ 스크린샷 일부 누락 — 단순 텍스트 카드로 대체"
  $FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${W}x${H}" \
    -vf "drawtext=fontfile=$FONT:text='실제 작동하는 프로토타입':fontsize=48:fontcolor=#F4E4D7:x=(w-text_w)/2:y=200,\
drawtext=fontfile=$FONT:text='eattable.kr / merchant.eattable.kr / admin.eattable.kr':fontsize=32:fontcolor=$ACCENT_GOLD:x=(w-text_w)/2:y=520" \
    -frames:v 1 $OUT/Q4-prototype-collage.jpg 2>&1 | tail -1
fi

# ─────────────────────────────────────────────
# Q4-2: 시간 절감 타임라인
# ─────────────────────────────────────────────
echo "[6/6] Q4 시간 절감 타임라인"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE_LIGHT:s=${W}x${H}" \
  -vf "\
drawtext=fontfile=$FONT:text='도착 시점부터 식사 시작까지':fontsize=48:fontcolor=#1a1a1a:x=(w-text_w)/2:y=70,\
drawtext=fontfile=$FONT:text='지금의 외식':fontsize=36:fontcolor=#666:x=80:y=200,\
drawbox=x=80:y=270:w=1760:h=80:color=0xE84A5F@1:t=fill,\
drawtext=fontfile=$FONT:text='줄·자리 8분':fontsize=26:fontcolor=#FFFFFF:x=200:y=295,\
drawtext=fontfile=$FONT:text='메뉴 5분':fontsize=26:fontcolor=#FFFFFF:x=720:y=295,\
drawtext=fontfile=$FONT:text='주문·결제 5분':fontsize=26:fontcolor=#FFFFFF:x=1050:y=295,\
drawtext=fontfile=$FONT:text='음식 12분':fontsize=26:fontcolor=#FFFFFF:x=1480:y=295,\
drawtext=fontfile=$FONT:text='30분':fontsize=72:fontcolor=$ACCENT_RED:x=1700:y=380,\
drawtext=fontfile=$FONT:text='잇테이블':fontsize=36:fontcolor=$ACCENT_GREEN:x=80:y=580,\
drawbox=x=80:y=650:w=300:h=80:color=0x5BBA6F@1:t=fill,\
drawtext=fontfile=$FONT:text='음식 약 5분':fontsize=26:fontcolor=#FFFFFF:x=140:y=675,\
drawtext=fontfile=$FONT:text='5분':fontsize=72:fontcolor=$ACCENT_GREEN:x=400:y=635,\
drawtext=fontfile=$FONT:text='멀리서 미리 예약·메뉴·결제 완료 → 도착 시 음식이 거의 준비':fontsize=28:fontcolor=#3a2a1a:x=80:y=770,\
drawtext=fontfile=$FONT:text='약 25분 절약':fontsize=72:fontcolor=$ACCENT_RED:x=(w-text_w)/2:y=920" \
  -frames:v 1 $OUT/Q4-time-saving.jpg 2>&1 | tail -1

echo ""
echo "═══════════════════════════════════════════════"
echo " 생성 완료"
echo "═══════════════════════════════════════════════"
ls -lh $OUT/*.jpg
open $OUT
