#!/bin/bash
# v2 영상에 한국어 나레이션 입히기 (22 세그먼트)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/v2
NARR=/tmp/demo-videos/v2/narration
mkdir -p $NARR

VOICE="Yuna"
RATE=180

# (target_duration | narration_text)
# SSML pause: [[slnc N]] — N ms 무음 (자연스러운 호흡)
# 정중한 합쇼체 + 시 honorific + 적절한 호흡으로 인조감 완화
declare -a SEGMENTS=(
  "6|맛집을 찾아갔는데, [[slnc 150]] 줄이 너무 길었던 경험. [[slnc 200]] 있으셨을 거예요."
  "6|[[slnc 100]] 십오 분, [[slnc 150]] 가게 앞에서 줄을 서고."
  "6|자리에 앉아도, [[slnc 150]] 메뉴 고르는 데 [[slnc 100]] 또 십 분."
  "6|주문을 마쳐도, [[slnc 150]] 음식이 나오기까지 [[slnc 100]] 다시 이십 분."
  "10|식사 한 끼를 위해, [[slnc 200]] 식사 전에 무려 [[slnc 100]] 사십오 분. [[slnc 250]] 짧지 않은 시간입니다."
  "7|예약 앱을 써도 [[slnc 150]] 자리만 잡힐 뿐, [[slnc 150]] 그 뒤는 여전히 그대로입니다."
  "7|만약 [[slnc 150]] 예약, 메뉴, 결제까지 [[slnc 100]] 모두 미리 끝낼 수 있다면 [[slnc 200]] 어떨까요."
  "7|그리고 도착하는 순간, [[slnc 150]] 음식이 바로 시작된다면 [[slnc 200]] 어떨까요."
  "7|그래서 저희는, [[slnc 200]] 잇테이블을 만들었습니다."
  "7|멀리서 미리 다 끝내고, [[slnc 150]] 가서 바로 식사하시는 외식."
  "4|이렇게 작동합니다."
  "2.5|먼저, [[slnc 150]] 고객 시점입니다."
  "22.6|원하시는 매장을 검색하고 [[slnc 200]] 메뉴를 선택하십니다. [[slnc 250]] 날짜와 시간, 인원을 정한 뒤 [[slnc 150]] 결제까지 완료하시면 [[slnc 150]] 예약이 확정됩니다. [[slnc 300]] 도착하시면 바로 식사가 시작되어, [[slnc 200]] 줄 없이 곧장 드실 수 있습니다."
  "2.5|다음은, [[slnc 150]] 점주 운영 화면입니다."
  "29.1|점주 대시보드에서는 [[slnc 200]] 오늘의 예약과 매출이 [[slnc 150]] 한눈에 들어옵니다. [[slnc 250]] 예약 보드와 메뉴 관리, [[slnc 150]] 정산 내역까지 [[slnc 150]] 매장 운영에 필요한 모든 정보를 [[slnc 200]] 한 곳에서 처리하실 수 있어, [[slnc 250]] 운영이 한결 수월해집니다."
  "2.5|관리자 검토 화면입니다."
  "21.3|관리자는 [[slnc 200]] 신규 점주의 사업자 정보와 계좌를 [[slnc 200]] 꼼꼼히 확인한 뒤, [[slnc 250]] 클릭 한 번으로 매장을 승인합니다. [[slnc 300]] 승인된 매장은 곧바로 고객에게 노출됩니다."
  "2.5|마지막으로, [[slnc 150]] 신규 점주 가입 흐름입니다."
  "30.6|이메일로 가입하신 신규 점주께서는 [[slnc 200]] 사업자 등록 화면에서 [[slnc 200]] 정보를 차례로 입력하십니다. [[slnc 250]] 사업자 번호, 상호, 대표자, [[slnc 150]] 계좌 정보까지 모두 등록하시면 [[slnc 250]] 관리자 승인을 거쳐 [[slnc 200]] 매장 운영을 바로 시작하실 수 있습니다."
  "10|멀리서 예약과 메뉴, [[slnc 150]] 결제까지 한 번에. [[slnc 300]] 도착하시면 바로 [[slnc 150]] 드시기만 하면 됩니다."
  "10|고객에게는 시간을, [[slnc 200]] 매장에게는 효율을. [[slnc 300]] 잇테이블이 만들어가는 [[slnc 200]] 새로운 외식의 기준입니다."
  "10|지금, [[slnc 250]] 잇테이블에서 시작해 보세요. [[slnc 300]] 이트테이블 점 케이알."
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
