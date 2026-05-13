#!/bin/bash
# v2 영상에 한국어 나레이션 입히기 (22 세그먼트)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/v2
NARR=/tmp/demo-videos/v2/narration
mkdir -p $NARR

VOICE="Yuna"
RATE=170

# (target_duration | narration_text)
declare -a SEGMENTS=(
  "8|맛집을 찾아갔는데, 줄이 너무 길었던 적. 누구나 한 번쯤 있으시죠."
  "8|십오 분, 가게 앞에서 줄을 섭니다."
  "8|겨우 자리에 앉아도, 메뉴 고르는 데 또 십 분."
  "8|주문해도, 음식이 나오기까지 또 이십 분."
  "12|한 끼를 위해, 식사 전에 무려 사십오 분. 짧지 않은 시간을 기다림에만 씁니다."
  "10|예약 앱을 써도 자리만 잡힐 뿐, 그 뒤의 흐름은 그대로입니다."
  "10|만약 예약과 메뉴 주문, 결제까지 모두 집에서 미리 끝낼 수 있다면 어떨까요?"
  "10|그리고 매장에 도착하는 순간, 음식이 바로 시작된다면 어떨까요?"
  "8|그래서 우리는, 잇테이블을 만들었습니다."
  "8|멀리서 미리 다 끝내고, 가서 바로 먹기만 하는 외식."
  "4|이렇게 작동합니다."
  "2.5|먼저, 고객 시점입니다."
  "22.6|원하는 매장을 검색하고 메뉴를 선택합니다. 날짜와 시간, 인원을 정해 결제까지 완료하면 예약이 확정됩니다. 도착하면 바로 식사가 시작되어, 줄 없이 곧장 먹을 수 있습니다."
  "2.5|다음은, 점주 운영 화면입니다."
  "29.1|점주 대시보드에서는 오늘의 예약과 매출이 한눈에 들어옵니다. 예약 보드와 메뉴 관리, 정산 내역까지 매장 운영에 필요한 모든 정보를 한 곳에서 처리할 수 있어, 운영이 훨씬 쉬워집니다."
  "2.5|관리자 검토 화면입니다."
  "21.3|관리자는 신규 점주의 사업자 정보와 계좌를 꼼꼼히 확인한 뒤, 클릭 한 번으로 매장을 승인합니다. 승인된 매장은 곧바로 고객에게 노출됩니다."
  "2.5|마지막으로, 신규 점주 가입 흐름입니다."
  "30.6|이메일로 가입한 신규 점주는 사업자 등록 화면에서 정보를 차례로 입력합니다. 사업자 번호, 상호, 대표자, 계좌까지 모두 등록하면 관리자 승인을 거쳐, 매장 운영을 바로 시작할 수 있습니다."
  "10|멀리서 예약과 메뉴, 결제까지 한 번에. 도착하면 바로 먹기만 하면 됩니다."
  "10|고객에겐 시간을, 매장에겐 효율을. 잇테이블은 외식의 새로운 표준을 만들어갑니다."
  "10|지금 잇테이블에서 시작하세요. 이트테이블 점 케이알."
)

# 영상 세그먼트 매핑 (concat.txt 순서와 일치)
NAMES=(s01 s02 s03 s04 s05 s06 s07 s08 s09 s10 transition d1-label d1-video d2-label d2-video d3-label d3-video d4-label d4-video c01 c02 c03)

CONCAT_LIST=$NARR/concat.txt
> $CONCAT_LIST

for i in "${!SEGMENTS[@]}"; do
  IFS='|' read -r target text <<< "${SEGMENTS[$i]}"
  name="${NAMES[$i]}"

  # 실제 영상 듀레이션 측정 (target는 참고용)
  vdur=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/$name.mp4)
  printf "[%02d/22] %-12s (%ss) — %s\n" "$((i+1))" "$name" "$vdur" "${text:0:50}..."

  # TTS 생성
  say -v "$VOICE" -r $RATE "$text" -o "$NARR/$name.aiff"
  $FFMPEG -y -i "$NARR/$name.aiff" -ar 44100 -ac 2 "$NARR/$name-raw.wav" 2>/dev/null

  audio_dur=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$NARR/$name-raw.wav")

  # 영상 길이에 맞춤
  if awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{exit !(a > v)}'; then
    tempo=$(awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{printf "%.3f", a/v}')
    $FFMPEG -y -i "$NARR/$name-raw.wav" -filter:a "atempo=$tempo" -t "$vdur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  else
    pad=$(awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{printf "%.3f", v - a}')
    $FFMPEG -y -i "$NARR/$name-raw.wav" -af "apad=pad_dur=$pad" -t "$vdur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  fi

  echo "file '$NARR/$name.wav'" >> $CONCAT_LIST
done

echo ""
echo "▶ 오디오 concat"
$FFMPEG -y -f concat -safe 0 -i $CONCAT_LIST -c copy "$NARR/narration-full.wav" 2>/dev/null

echo "▶ 영상에 mux"
$FFMPEG -y -i $SRC/eattable-demo-v2-mute.mp4 -i $NARR/narration-full.wav \
  -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest \
  $SRC/eattable-demo-v2-narrated.mp4 2>&1 | tail -1

echo ""
echo "✅ 나레이션 입힌 v2: $SRC/eattable-demo-v2-narrated.mp4"
ls -lh $SRC/eattable-demo-v2-narrated.mp4
$FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/eattable-demo-v2-narrated.mp4 | awk '{printf "총 길이: %s 초 (%d:%02d)\n", $1, int($1/60), int($1%60)}'
