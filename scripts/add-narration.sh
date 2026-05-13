#!/bin/bash
# 통합 mp4에 한국어 나레이션 입히기 (macOS say TTS)
#
# 사용:
#   bash scripts/add-narration.sh
#
# 결과:
#   /tmp/demo-videos/combined/eattable-demo-narrated.mp4

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/combined
NARR=/tmp/demo-videos/narration
mkdir -p $NARR

VOICE="Yuna"
RATE=175

# 각 세그먼트 (target_duration | narration_text)
declare -a SEGMENTS=(
  "3.0|잇테이블, 메뉴까지 미리 예약하는 새로운 외식."
  "2.0|고객의 예약 흐름입니다."
  "22.6|원하는 매장을 검색하고, 메뉴를 둘러본 뒤 미리 선택합니다. 날짜와 시간, 인원수를 정하고 결제까지 완료하면 예약이 확정됩니다. 매장에 도착할 때 음식이 준비되어 있어, 줄 서지 않고 바로 식사를 시작할 수 있습니다."
  "2.0|점주 운영 화면입니다."
  "29.1|점주 대시보드에서는 오늘의 예약과 매출이 한눈에 들어옵니다. 예약 보드에서는 시간 순서대로 들어온 예약을 관리하고, 메뉴 관리에서는 메뉴를 손쉽게 추가하거나 수정할 수 있습니다. 정산 내역에서는 매출과 수수료가 자동으로 계산되어, 매장 운영이 훨씬 쉬워집니다."
  "2.0|관리자 검토 화면입니다."
  "21.3|관리자는 새로 가입한 점주의 사업자 정보를 검토합니다. 대기 중인 신청을 빠르게 필터링하고, 사업자 등록증과 계좌 정보를 꼼꼼히 확인한 뒤, 클릭 한 번으로 매장을 승인합니다. 승인된 매장은 즉시 고객에게 노출됩니다."
  "2.0|신규 점주 가입 흐름."
  "30.6|신규 점주는 이메일로 간단히 로그인합니다. 사업자 등록 화면에서 사업자 번호와 상호명, 대표자 이름을 차례대로 입력합니다. 다음 단계에서 정산에 사용할 은행과 계좌 정보를 등록합니다. 모든 절차가 완료되면, 관리자 승인을 거쳐 매장 운영을 바로 시작할 수 있습니다."
  "5.0|지금, 잇테이블에서 시작하세요. eattable 점 케이알."
)

NAMES=(00-opening 10-label-customer 20-customer 30-label-merchant 40-merchant 50-label-admin 60-admin 70-label-onboarding 80-onboarding 99-ending)

# 정확한 영상 듀레이션 (build script에서 만든 mp4 기준)
DURS=()
for n in "${NAMES[@]}"; do
  d=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/$n.mp4)
  DURS+=($d)
done

CONCAT_LIST=$NARR/concat.txt
> $CONCAT_LIST

for i in "${!SEGMENTS[@]}"; do
  IFS='|' read -r target text <<< "${SEGMENTS[$i]}"
  name="${NAMES[$i]}"
  dur="${DURS[$i]}"

  echo "[$((i+1))/${#SEGMENTS[@]}] $name — 목표 $dur 초"

  # 1) TTS 생성 (.aiff → wav)
  say -v "$VOICE" -r $RATE "$text" -o "$NARR/$name.aiff"
  $FFMPEG -y -i "$NARR/$name.aiff" -ar 44100 -ac 2 "$NARR/$name-raw.wav" 2>/dev/null

  # 2) 오디오 듀레이션 측정
  audio_dur=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$NARR/$name-raw.wav")

  # 3) 영상 길이에 맞춰 조정
  if awk -v a="$audio_dur" -v v="$dur" 'BEGIN{exit !(a > v)}'; then
    # audio가 더 김 → atempo로 빠르게 (정확히 v초 맞춤)
    tempo=$(awk -v a="$audio_dur" -v v="$dur" 'BEGIN{printf "%.3f", a/v}')
    echo "    audio=$audio_dur 초, video=$dur 초 → atempo=$tempo (빠르게)"
    $FFMPEG -y -i "$NARR/$name-raw.wav" -filter:a "atempo=$tempo" -t "$dur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  else
    # audio가 짧음 → silence padding 추가
    pad=$(awk -v a="$audio_dur" -v v="$dur" 'BEGIN{printf "%.3f", v - a}')
    echo "    audio=$audio_dur 초, video=$dur 초 → silence $pad 초 추가"
    $FFMPEG -y -i "$NARR/$name-raw.wav" -af "apad=pad_dur=$pad" -t "$dur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  fi

  echo "file '$NARR/$name.wav'" >> $CONCAT_LIST
done

echo ""
echo "▶ 오디오 트랙 concat"
$FFMPEG -y -f concat -safe 0 -i $CONCAT_LIST -c copy "$NARR/narration-full.wav" 2>/dev/null

echo "▶ 영상에 나레이션 mux"
$FFMPEG -y -i $SRC/eattable-demo-full.mp4 -i $NARR/narration-full.wav \
  -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest \
  $SRC/eattable-demo-narrated.mp4 2>&1 | tail -1

echo ""
echo "✅ 나레이션 입힌 영상: $SRC/eattable-demo-narrated.mp4"
ls -lh $SRC/eattable-demo-narrated.mp4
$FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/eattable-demo-narrated.mp4 | awk '{print "총 길이: "$1" 초"}'
