#!/bin/bash
# 잇테이블 v3 영상 빌더 — 30분 분해 + 25분 절약 가설
#
# 구조:
#   Part 1 (0:00 ~ 1:22): 스토리 12장면 — 30분 단계별 분해 → 25분 절약
#   Part 2 (1:22 ~ 1:26): 전환 카드
#   Part 3 (1:26 ~ 3:22): 시연 데모 4시나리오
#   Part 4 (3:22 ~ 3:52): 클로징

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos
OUT=$SRC/v2
mkdir -p $OUT

FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc
WIDTH=1920
HEIGHT=1080

BG_DARK="0x1a1a1a"
BG_WARM_DARK="0x2a2018"
BG_BEIGE="0xC4A08A"
ACCENT_RED="#E84A5F"
ACCENT_ORANGE="#FF8C42"
ACCENT_YELLOW="#F4C95D"
ACCENT_BEIGE="#C4A08A"
ACCENT_GOLD="#D4A574"
ACCENT_GREEN="#5BBA6F"
WHITE="white"
OFF_WHITE="#F4E4D7"

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

# 큰 숫자 + 라벨 (단계 카드)
make_step_card() {
  local dur=$1 bg=$2 step_num="$3" step_label="$4" minutes="$5" min_color=$6 out=$7
  $FFMPEG -y -f lavfi -i "color=c=$bg:s=${WIDTH}x${HEIGHT}:d=$dur" \
    -vf "drawtext=fontfile=$FONT:text='$step_num':fontsize=44:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2-260,\
drawtext=fontfile=$FONT:text='$step_label':fontsize=80:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-160,\
drawtext=fontfile=$FONT:text='$minutes':fontsize=240:fontcolor=$min_color:x=(w-text_w)/2:y=(h-text_h)/2+50" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t $dur \
    $out 2>&1 | tail -1
}

echo "═══════════════════════════════════════════════"
echo " Part 1: 스토리 12장면 (82초)"
echo "═══════════════════════════════════════════════"

echo "[1/12] 후크"
make_card 6 $BG_DARK "외식 한 끼, 시작하기까지" 84 $WHITE "얼마나 걸릴까요?" 48 $ACCENT_BEIGE $OUT/s01.mp4

echo "[2/12] 단계 ① 줄 서기 8분"
make_step_card 6 $BG_DARK "STEP 1" "줄 서기 · 자리 안내" "8분" $ACCENT_YELLOW $OUT/s02.mp4

echo "[3/12] 단계 ② 메뉴 고민 5분"
make_step_card 6 $BG_DARK "STEP 2" "메뉴 고민" "5분" $ACCENT_ORANGE $OUT/s03.mp4

echo "[4/12] 단계 ③ 주문/결제 5분"
make_step_card 6 $BG_DARK "STEP 3" "주문 · 결제" "5분" $ACCENT_ORANGE $OUT/s04.mp4

echo "[5/12] 단계 ④ 음식 대기 12분"
make_step_card 6 $BG_DARK "STEP 4" "음식 나오기" "12분" $ACCENT_RED $OUT/s05.mp4

echo "[6/12] 인사이트 - 합계 30분"
$FFMPEG -y -f lavfi -i "color=c=$BG_WARM_DARK:s=${WIDTH}x${HEIGHT}:d=9" \
  -vf "drawtext=fontfile=$FONT:text='총':fontsize=56:fontcolor=$OFF_WHITE:x=(w-text_w)/2:y=(h-text_h)/2-280,\
drawtext=fontfile=$FONT:text='30분':fontsize=320:fontcolor=$ACCENT_GOLD:x=(w-text_w)/2:y=(h-text_h)/2-50,\
drawtext=fontfile=$FONT:text='식사를 시작하기까지':fontsize=48:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2+220" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 9 \
  $OUT/s06.mp4 2>&1 | tail -1

echo "[7/12] 전환 가설"
make_card 7 $BG_WARM_DARK "잇테이블로 바꾸면?" 80 $OFF_WHITE "단계별 시간을 줄여봅니다" 40 $ACCENT_BEIGE $OUT/s07.mp4

echo "[8/12] 절약 ① 예약·메뉴·결제 0분"
$FFMPEG -y -f lavfi -i "color=c=$BG_WARM_DARK:s=${WIDTH}x${HEIGHT}:d=7" \
  -vf "drawtext=fontfile=$FONT:text='예약 · 메뉴 · 결제':fontsize=68:fontcolor=$OFF_WHITE:x=(w-text_w)/2:y=(h-text_h)/2-170,\
drawtext=fontfile=$FONT:text='집에서 미리, 모두 끝':fontsize=40:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2-60,\
drawtext=fontfile=$FONT:text='→  0분':fontsize=200:fontcolor=$ACCENT_GREEN:x=(w-text_w)/2:y=(h-text_h)/2+120" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 7 \
  $OUT/s08.mp4 2>&1 | tail -1

echo "[9/12] 절약 ② 음식 대기 5분"
$FFMPEG -y -f lavfi -i "color=c=$BG_WARM_DARK:s=${WIDTH}x${HEIGHT}:d=7" \
  -vf "drawtext=fontfile=$FONT:text='음식 대기':fontsize=68:fontcolor=$OFF_WHITE:x=(w-text_w)/2:y=(h-text_h)/2-170,\
drawtext=fontfile=$FONT:text='도착 시간에 맞춰 조리 시작':fontsize=40:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2-60,\
drawtext=fontfile=$FONT:text='→  약 5분':fontsize=170:fontcolor=$ACCENT_GREEN:x=(w-text_w)/2:y=(h-text_h)/2+130" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 7 \
  $OUT/s09.mp4 2>&1 | tail -1

echo "[10/12] 임팩트 - 25분 절약"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE:s=${WIDTH}x${HEIGHT}:d=9" \
  -vf "drawtext=fontfile=$FONT:text='약':fontsize=72:fontcolor=#3a2a1a:x=(w-text_w)/2:y=(h-text_h)/2-280,\
drawtext=fontfile=$FONT:text='25분':fontsize=340:fontcolor=#1a1a1a:x=(w-text_w)/2:y=(h-text_h)/2-30,\
drawtext=fontfile=$FONT:text='절약':fontsize=64:fontcolor=$ACCENT_RED:x=(w-text_w)/2:y=(h-text_h)/2+220" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 9 \
  $OUT/s10.mp4 2>&1 | tail -1

echo "[11/12] 브랜드 reveal"
$FFMPEG -y -f lavfi -i "color=c=$BG_BEIGE:s=${WIDTH}x${HEIGHT}:d=7" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=180:fontcolor=#1a1a1a:x=(w-text_w)/2:y=(h-text_h)/2-60,\
drawtext=fontfile=$FONT:text='EatTable':fontsize=56:fontcolor=#3a2a1a:x=(w-text_w)/2:y=(h-text_h)/2+100" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 7 \
  $OUT/s11.mp4 2>&1 | tail -1

echo "[12/12] 가치 제안"
make_card 7 $BG_BEIGE "멀리서 미리 다 끝내고" 68 "#1a1a1a" "가서 바로 먹기만" 56 "#3a2a1a" $OUT/s12.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 2: 전환 카드 (4초)"
echo "═══════════════════════════════════════════════"
make_card 4 $BG_WARM_DARK "이렇게 작동합니다" 80 $OFF_WHITE "고객 · 점주 · 관리자 시점" 40 $ACCENT_BEIGE $OUT/transition.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 3: 시연 데모"
echo "═══════════════════════════════════════════════"

normalize() {
  $FFMPEG -y -i "$1" \
    -vf "scale=$WIDTH:$HEIGHT:force_original_aspect_ratio=decrease,pad=$WIDTH:$HEIGHT:(ow-iw)/2:(oh-ih)/2:color=$BG_DARK,setsar=1,fps=30" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
    -an "$2" 2>&1 | tail -1
}

make_section() {
  local label="$1" sub="$2" src_mp4="$3" label_out="$4" video_out="$5"
  $FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${WIDTH}x${HEIGHT}:d=2.5" \
    -vf "drawtext=fontfile=$FONT:text='$label':fontsize=100:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-40,\
drawtext=fontfile=$FONT:text='$sub':fontsize=40:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2+80" \
    -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 2.5 \
    $label_out 2>&1 | tail -1
  normalize "$src_mp4" "$video_out"
}

make_section "고객" "검색 → 메뉴 → 예약 → 결제" $SRC/customer-reservation/customer-reservation.mp4 $OUT/d1-label.mp4 $OUT/d1-video.mp4
make_section "점주" "예약 보드 · 메뉴 관리 · 정산" $SRC/merchant-pos/merchant-pos.mp4 $OUT/d2-label.mp4 $OUT/d2-video.mp4
make_section "관리자" "점주 검토 · 매장 승인" $SRC/admin-approval/admin-approval.mp4 $OUT/d3-label.mp4 $OUT/d3-video.mp4
make_section "신규 점주" "가입 → 사업자 등록" $SRC/merchant-onboarding/merchant-onboarding.mp4 $OUT/d4-label.mp4 $OUT/d4-video.mp4

echo ""
echo "═══════════════════════════════════════════════"
echo " Part 4: 클로징 (30초)"
echo "═══════════════════════════════════════════════"
make_card 10 $BG_WARM_DARK "멀리서, 예약·메뉴·결제까지" 64 $OFF_WHITE "도착하면 바로 먹기만" 52 $ACCENT_BEIGE $OUT/c01.mp4
make_card 10 $BG_BEIGE "고객엔 시간을, 매장엔 효율을" 56 "#1a1a1a" "잇테이블이 만드는 새로운 외식" 36 "#3a2a1a" $OUT/c02.mp4
$FFMPEG -y -f lavfi -i "color=c=$BG_DARK:s=${WIDTH}x${HEIGHT}:d=10" \
  -vf "drawtext=fontfile=$FONT:text='지금 시작하세요':fontsize=72:fontcolor=$WHITE:x=(w-text_w)/2:y=(h-text_h)/2-100,\
drawtext=fontfile=$FONT:text='eattable.kr':fontsize=140:fontcolor=$ACCENT_BEIGE:x=(w-text_w)/2:y=(h-text_h)/2+60" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 -t 10 $OUT/c03.mp4 2>&1 | tail -1

echo ""
echo "═══════════════════════════════════════════════"
echo " 최종 concat (재인코딩 — 영상 글리치 방지)"
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
file '$OUT/s11.mp4'
file '$OUT/s12.mp4'
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

# 재인코딩 concat (-c copy 대신 libx264) — 키프레임/PTS 정렬로 글리치 제거
$FFMPEG -y -f concat -safe 0 -i $OUT/concat.txt \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p -r 30 \
  $OUT/eattable-demo-v2-mute.mp4 2>&1 | tail -1

DUR=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $OUT/eattable-demo-v2-mute.mp4)
echo ""
echo "✅ v2 무음 영상: $OUT/eattable-demo-v2-mute.mp4"
ls -lh $OUT/eattable-demo-v2-mute.mp4
echo "총 길이: $(awk -v d=$DUR 'BEGIN{printf "%d:%02d", int(d/60), int(d%60)}')"
