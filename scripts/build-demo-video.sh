#!/bin/bash
# 잇테이블 데모 영상 통합 빌더
#
# 4개 시나리오 webm/mp4 → 오프닝/섹션라벨/엔딩 추가 → 1920x1080 mp4 1개로 합침
#
# 사용:
#   bash scripts/build-demo-video.sh

set -e

SRC=/tmp/demo-videos
OUT=$SRC/combined
mkdir -p $OUT

FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc
BG_HEX="0x1a1a1a"
ACCENT="#C4A08A"
WHITE="white"

echo "[1/8] 오프닝 카드 (3초)"
$HOME/.local/bin/ffmpeg-full -y -f lavfi -i "color=c=$BG_HEX:s=1920x1080:d=3" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=160:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-80, \
       drawtext=fontfile=$FONT:text='메뉴까지 미리 예약하는 외식':fontsize=52:fontcolor=$ACCENT:x=(w-text_w)/2:y=(h-text_h)/2+100" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 \
  -t 3 $OUT/00-opening.mp4 2>&1 | tail -1

make_label() {
  local title="$1"
  local sub="$2"
  local file="$3"
  $HOME/.local/bin/ffmpeg-full -y -f lavfi -i "color=c=$BG_HEX:s=1920x1080:d=2" \
    -vf "drawtext=fontfile=$FONT:text='$title':fontsize=96:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-50, \
         drawtext=fontfile=$FONT:text='$sub':fontsize=40:fontcolor=$ACCENT:x=(w-text_w)/2:y=(h-text_h)/2+70" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 \
    -t 2 $file 2>&1 | tail -1
}

echo "[2/8] 섹션 라벨 카드 4개"
make_label "고객" "매장 검색 → 메뉴 → 예약 → 결제" $OUT/10-label-customer.mp4
make_label "점주" "예약 보드 · 메뉴 관리 · 정산" $OUT/30-label-merchant.mp4
make_label "관리자" "점주 검토 · 매장 승인" $OUT/50-label-admin.mp4
make_label "신규 점주" "가입 → 사업자 등록" $OUT/70-label-onboarding.mp4

normalize() {
  local input="$1"
  local out="$2"
  $HOME/.local/bin/ffmpeg-full -y -i "$input" \
    -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=$BG_HEX,setsar=1,fps=30" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
    -an "$out" 2>&1 | tail -1
}

echo "[3/8] 고객 시나리오 정규화 (1920x1080)"
normalize $SRC/customer-reservation/customer-reservation.mp4 $OUT/20-customer.mp4

echo "[4/8] 점주 시나리오 정규화"
normalize $SRC/merchant-pos/merchant-pos.mp4 $OUT/40-merchant.mp4

echo "[5/8] 관리자 시나리오 정규화"
normalize $SRC/admin-approval/admin-approval.mp4 $OUT/60-admin.mp4

echo "[6/8] 신규 점주 시나리오 정규화"
normalize $SRC/merchant-onboarding/merchant-onboarding.mp4 $OUT/80-onboarding.mp4

echo "[7/8] 엔딩 카드 (5초)"
$HOME/.local/bin/ffmpeg-full -y -f lavfi -i "color=c=$BG_HEX:s=1920x1080:d=5" \
  -vf "drawtext=fontfile=$FONT:text='지금 시작하세요':fontsize=80:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-80, \
       drawtext=fontfile=$FONT:text='eattable.kr':fontsize=120:fontcolor=$ACCENT:x=(w-text_w)/2:y=(h-text_h)/2+60" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 \
  -t 5 $OUT/99-ending.mp4 2>&1 | tail -1

echo "[8/8] concat → 통합 mp4"
cat > $OUT/concat.txt <<EOF
file '$OUT/00-opening.mp4'
file '$OUT/10-label-customer.mp4'
file '$OUT/20-customer.mp4'
file '$OUT/30-label-merchant.mp4'
file '$OUT/40-merchant.mp4'
file '$OUT/50-label-admin.mp4'
file '$OUT/60-admin.mp4'
file '$OUT/70-label-onboarding.mp4'
file '$OUT/80-onboarding.mp4'
file '$OUT/99-ending.mp4'
EOF

$HOME/.local/bin/ffmpeg-full -y -f concat -safe 0 -i $OUT/concat.txt -c copy $OUT/eattable-demo-full.mp4 2>&1 | tail -1

echo ""
echo "✅ 통합 영상: $OUT/eattable-demo-full.mp4"
ls -lh $OUT/eattable-demo-full.mp4
$HOME/.local/bin/ffprobe-full -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $OUT/eattable-demo-full.mp4 | awk '{print "총 길이: "$1" 초"}'
