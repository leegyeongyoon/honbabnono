#!/bin/bash
# 잇테이블 v2 최종 영상 빌더 (약 4분)
#
# 구조:
#   Part 1 (0:00 ~ 1:30): 스토리 인트로 10장면 — Why we built EatTable
#   Part 2 (1:30 ~ 1:34): 전환 카드 "이렇게 작동합니다"
#   Part 3 (1:34 ~ 3:30): 시연 데모 4시나리오 (고객/점주/관리자/신규점주)
#   Part 4 (3:30 ~ 4:00): 클로징
#
# 산출물: /tmp/demo-videos/combined/eattable-demo-v2.mp4

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos
OUT=$SRC/v2
mkdir -p $OUT

FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc
WIDTH=1920
HEIGHT=1080

# 색상 팔레트 (잇테이블 베이지 시스템)
BG_DARK="0x1a1a1a"
BG_WARM_DARK="0x2a2018"
BG_BEIGE="0xC4A08A"
BG_BEIGE_LIGHT="0xE8D4C2"
ACCENT_RED="#E84A5F"
ACCENT_ORANGE="#FF8C42"
ACCENT_YELLOW="#F4C95D"
ACCENT_BEIGE="#C4A08A"
ACCENT_GOLD="#D4A574"
WHITE="white"
OFF_WHITE="#F4E4D7"

# 카드 1개 생성 함수
# args: duration | bg_hex | main_text | main_size | main_color | sub_text | sub_size | sub_color | output
make_card() {
  local dur=$1 bg=$2 main="$3" main_size=$4 main_color=$5 sub="$6" sub_size=$7 sub_color=$8 out=$9

  local filters="drawtext=fontfile=$FONT:text='$main':fontsize=$main_size:fontcolor=$main_color:x=(w-text_w)/2:y=(h-text_h)/2-30"

  if [ -n "$sub" ]; then
    filters="$filters,drawtext=fontfile=$FONT:text='$sub':fontsize=$sub_size:fontcolor=$sub_color:x=(w-text_w)/2:y=(h-text_h)/2+90"
  fi

  $FFMPEG -y -f lavfi -i "color=c=$bg:s=${WIDTH}x${HEIGHT}:d=$dur" \
    -vf "$filters" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t $dur \
    $out 2>&1 | tail -1
}

# 큰 숫자 강조 카드 (숫자가 매우 크고, 아래 라벨)
make_big_number_card() {
  local dur=$1 bg=$2 number="$3" number_color=$4 label="$5" out=$6

  $FFMPEG -y -f lavfi -i "color=c=$bg:s=${WIDTH}x${HEIGHT}:d=$dur" \
    -vf "drawtext=fontfile=$FONT:text='$number':fontsize=320:fontcolor=$number_color:x=(w-text_w)/2:y=(h-text_h)/2-100,\
drawtext=fontfile=$FONT:text='$label':fontsize=48:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2+200" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t $dur \
    $out 2>&1 | tail -1
}

echo "═══════════════════════════════════════════════"
echo " Part 1: 스토리 인트로 10장면 (90초)"
echo "═══════════════════════════════════════════════"

echo "[1/10] 후크 - 이런 경험"
make_card 8 $BG_DARK "이런 경험, 있으셨죠?" 96 $WHITE "" 0 "" $OUT/s01.mp4

echo "[2/10] 문제1 - 30분 줄 서기"
make_big_number_card 8 $BG_DARK "30분" $ACCENT_RED "줄 서서 대기" $OUT/s02.mp4

echo "[3/10] 문제2 - 10분 메뉴"
make_big_number_card 8 $BG_DARK "10분" $ACCENT_ORANGE "자리에 앉아 메뉴 고민" $OUT/s03.mp4

echo "[4/10] 문제3 - 30분 음식 대기"
make_big_number_card 8 $BG_DARK "30분" $ACCENT_YELLOW "주문 후 음식 대기" $OUT/s04.mp4

echo "[5/10] 인사이트 - 총 70분"
make_big_number_card 12 $BG_WARM_DARK "70분" $ACCENT_GOLD "식사를 시작하기까지 걸리는 시간" $OUT/s05.mp4

echo "[6/10] 갭 - 예약해도"
make_card 10 $BG_WARM_DARK "예약하면 자리는 잡혀요" 80 $OFF_WHITE "하지만, 그 뒤로는?" 44 $ACCENT_BEIGE $OUT/s06.mp4

echo "[7/10] 아이디어 - 예약·메뉴·결제 모두 미리"
make_card 10 $BG_WARM_DARK "예약, 메뉴 주문, 결제" 80 $OFF_WHITE "집에서 미리, 한 번에 끝낼 수 있다면?" 40 $ACCENT_BEIGE $OUT/s07.mp4

echo "[8/10] 비전 - 가서 먹기만"
make_card 10 $BG_BEIGE "가서, 먹기만 하면 된다면?" 80 "#1a1a1a" "도착 즉시 시작되는 식사" 44 "#3a2a1a" $OUT/s08.mp4

echo "[9/10] 브랜드 reveal"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE:s=${WIDTH}x${HEIGHT}:d=8" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=180:fontcolor=#1a1a1a:x=(w-text_w)/2:y=(h-text_h)/2-60,\
drawtext=fontfile=$FONT:text='EatTable':fontsize=56:fontcolor=#3a2a1a:x=(w-text_w)/2:y=(h-text_h)/2+100" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 8 \
  $OUT/s09.mp4 2>&1 | tail -1

echo "[10/10] 핵심 가치 제안"
make_card 8 $BG_BEIGE "멀리서 미리 다 끝내고" 68 "#1a1a1a" "가서 바로 먹기만" 56 "#3a2a1a" $OUT/s10.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 2: 시연 전환 카드 (4초)"
echo "═══════════════════════════════════════════════"
make_card 4 $BG_WARM_DARK "이렇게 작동합니다" 80 $OFF_WHITE "고객 · 점주 · 관리자 시점" 40 $ACCENT_BEIGE $OUT/transition.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 3: 시연 데모 4시나리오"
echo "═══════════════════════════════════════════════"

normalize() {
  local input="$1"
  local out="$2"
  $FFMPEG -y -i "$input" \
    -vf "scale=$WIDTH:$HEIGHT:force_original_aspect_ratio=decrease,pad=$WIDTH:$HEIGHT:(ow-iw)/2:(oh-ih)/2:color=$BG_DARK,setsar=1,fps=30" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
    -an "$out" 2>&1 | tail -1
}

# 시나리오 라벨 카드 + 정규화된 영상 페어
make_section() {
  local label_text="$1"
  local sub_text="$2"
  local src_mp4="$3"
  local label_out="$4"
  local video_out="$5"

  $FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${WIDTH}x${HEIGHT}:d=2.5" \
    -vf "drawtext=fontfile=$FONT:text='$label_text':fontsize=100:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-40,\
drawtext=fontfile=$FONT:text='$sub_text':fontsize=40:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2+80" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 2.5 \
    $label_out 2>&1 | tail -1

  normalize "$src_mp4" "$video_out"
}

echo "[1/4] 고객"
make_section "고객" "검색 → 메뉴 → 예약 → 결제" \
  $SRC/customer-reservation/customer-reservation.mp4 \
  $OUT/d1-label.mp4 $OUT/d1-video.mp4

echo "[2/4] 점주"
make_section "점주" "예약 보드 · 메뉴 관리 · 정산" \
  $SRC/merchant-pos/merchant-pos.mp4 \
  $OUT/d2-label.mp4 $OUT/d2-video.mp4

echo "[3/4] 관리자"
make_section "관리자" "점주 검토 · 매장 승인" \
  $SRC/admin-approval/admin-approval.mp4 \
  $OUT/d3-label.mp4 $OUT/d3-video.mp4

echo "[4/4] 신규 점주"
make_section "신규 점주" "가입 → 사업자 등록" \
  $SRC/merchant-onboarding/merchant-onboarding.mp4 \
  $OUT/d4-label.mp4 $OUT/d4-video.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 4: 클로징 (30초)"
echo "═══════════════════════════════════════════════"
echo "[1/3] 핵심 메시지"
make_card 10 $BG_WARM_DARK "멀리서, 예약·주문·결제까지" 64 $OFF_WHITE "도착하면 바로 먹기만" 52 $ACCENT_BEIGE $OUT/c01.mp4

echo "[2/3] 가치 요약"
make_card 10 $BG_BEIGE "고객에겐 시간을, 매장에겐 효율을" 56 "#1a1a1a" "잇테이블이 만드는 새로운 외식" 36 "#3a2a1a" $OUT/c02.mp4

echo "[3/3] CTA"
$FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${WIDTH}x${HEIGHT}:d=10" \
  -vf "drawtext=fontfile=$FONT:text='지금 시작하세요':fontsize=72:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-100,\
drawtext=fontfile=$FONT:text='eattable.kr':fontsize=140:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2+60" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 10 \
  $OUT/c03.mp4 2>&1 | tail -1

echo ""
echo "═══════════════════════════════════════════════"
echo " 최종 concat"
echo "═══════════════════════════════════════════════"
cat > $OUT/concat.txt <<EOF
file '$OUT/s01.mp4'
file '$OUT/s02.mp4'
file '$OUT/s03.mp4'
file '$OUT/s04.mp4'
file '$OUT/s05.mp4'
file '$OUT/s06.mp4'
file '$OUT/s07.mp4'
file '$OUT/s08.mp4'
file '$OUT/s09.mp4'
file '$OUT/s10.mp4'
file '$OUT/transition.mp4'
file '$OUT/d1-label.mp4'
file '$OUT/d1-video.mp4'
file '$OUT/d2-label.mp4'
file '$OUT/d2-video.mp4'
file '$OUT/d3-label.mp4'
file '$OUT/d3-video.mp4'
file '$OUT/d4-label.mp4'
file '$OUT/d4-video.mp4'
file '$OUT/c01.mp4'
file '$OUT/c02.mp4'
file '$OUT/c03.mp4'
EOF

$FFMPEG -y -f concat -safe 0 -i $OUT/concat.txt -c copy $OUT/eattable-demo-v2-mute.mp4 2>&1 | tail -1

DUR=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $OUT/eattable-demo-v2-mute.mp4)
echo ""
echo "✅ v2 무음 영상: $OUT/eattable-demo-v2-mute.mp4"
ls -lh $OUT/eattable-demo-v2-mute.mp4
echo "총 길이: $DUR 초 ($(awk -v d=$DUR 'BEGIN{printf "%d:%02d", int(d/60), int(d%60)}'))"
