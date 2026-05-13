#!/bin/bash
# v3 영상 나레이션 (24 세그먼트)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/v2
NARR=/tmp/demo-videos/v2/narration
mkdir -p $NARR

VOICE="Yuna"
RATE=180

# (target_duration | narration_text)
declare -a SEGMENTS=(
  "6|외식 한 끼를 시작하기까지, [[slnc 150]] 얼마나 걸리는지 [[slnc 100]] 생각해 보신 적 있으세요?"
  "6|먼저, [[slnc 150]] 가게에 들어가기까지 [[slnc 150]] 평균 팔 분."
  "6|자리에 앉아 [[slnc 150]] 메뉴를 고르는 데 [[slnc 100]] 오 분."
  "6|주문하고 [[slnc 150]] 결제하는 데 [[slnc 100]] 오 분."
  "6|음식이 조리되어 [[slnc 150]] 나오기까지 [[slnc 100]] 십이 분."
  "9|한 끼 식사를 시작하기까지 [[slnc 200]] 모두 더하면 무려 [[slnc 150]] 삼십 분. [[slnc 250]] 식사 시간만큼이나 [[slnc 100]] 긴 시간을 기다림에 씁니다."
  "7|만약 이 시간을 [[slnc 150]] 잇테이블로 줄인다면 [[slnc 200]] 어떨까요?"
  "7|예약, 메뉴 선택, 결제는 [[slnc 150]] 집에서 미리 끝낼 수 있어 [[slnc 150]] 매장에서는 영 분."
  "7|음식은 도착 시간에 맞춰 조리되니, [[slnc 150]] 음식 대기도 약 오 분으로 단축됩니다."
  "9|즉, 한 끼 식사 시작이 [[slnc 200]] 약 이십오 분 빨라집니다. [[slnc 300]] 더 이상 줄과 기다림에 시간을 쓰지 않습니다."
  "7|그래서 저희는, [[slnc 250]] 잇테이블을 만들었습니다."
  "7|멀리서 미리 다 끝내고, [[slnc 200]] 가서 바로 식사하시는 [[slnc 150]] 새로운 외식 경험."
  "4|이렇게 작동합니다."
  "2.5|먼저, 고객 시점입니다."
  "22.6|원하시는 매장을 검색하고 [[slnc 150]] 마음에 드는 곳을 선택해 들어가십니다. [[slnc 200]] 메뉴와 매장 정보를 한눈에 확인하시고, [[slnc 200]] 예약하실 날짜와 시간, 인원수를 정하십니다. [[slnc 200]] 미리 메뉴를 골라 결제까지 완료하시면 [[slnc 150]] 예약이 즉시 확정됩니다. [[slnc 200]] 도착 시간에 음식이 준비되어, 줄 없이 바로 드실 수 있습니다."
  "2.5|다음은, 점주 운영 화면입니다."
  "29.1|점주 대시보드에서는 [[slnc 150]] 오늘의 예약과 예상 매출이 [[slnc 150]] 한눈에 들어옵니다. [[slnc 200]] 예약 보드에서는 시간 순서대로 들어온 예약을 [[slnc 150]] 손쉽게 관리하시고, [[slnc 200]] 메뉴 관리 화면에서는 [[slnc 100]] 새 메뉴를 추가하거나 기존 메뉴를 수정하실 수 있습니다. [[slnc 200]] 매장 정보와 정산 내역까지 [[slnc 150]] 운영에 필요한 모든 화면이 [[slnc 150]] 한 곳에 모여, 운영이 한결 수월해집니다."
  "2.5|관리자 검토 화면입니다."
  "21.3|관리자는 [[slnc 150]] 신규로 가입한 점주의 사업자 등록번호와 상호, [[slnc 200]] 대표자 정보, 그리고 정산을 위한 계좌까지 [[slnc 150]] 꼼꼼히 검토합니다. [[slnc 250]] 모든 정보가 확인되면 [[slnc 150]] 클릭 한 번으로 매장을 승인합니다. [[slnc 200]] 승인된 매장은 곧바로 고객 검색 결과에 노출됩니다."
  "2.5|마지막으로, 신규 점주 가입 흐름입니다."
  "30.6|이메일로 가입하신 신규 점주께서는 [[slnc 150]] 사업자 등록 화면에 진입하십니다. [[slnc 200]] 첫 단계에서 사업자 등록번호와 상호명, [[slnc 100]] 대표자 성함을 차례로 입력하시고, [[slnc 200]] 다음 단계에서는 정산에 사용하실 [[slnc 100]] 은행과 계좌번호, 예금주 정보를 등록합니다. [[slnc 200]] 마지막으로 사업자등록증 같은 필수 서류를 첨부하시면 [[slnc 200]] 관리자 검토를 거쳐 매장 운영을 시작하실 수 있습니다."
  "10|멀리서 예약과 메뉴 선택, [[slnc 150]] 결제까지 한 번에 끝내고, [[slnc 200]] 도착하시면 바로 드시기만 하면 됩니다. [[slnc 200]] 줄 서지 않고, 메뉴 고민 없이, 음식을 기다리지 않습니다."
  "10|고객에게는 소중한 시간을, [[slnc 200]] 매장에게는 운영의 효율을 드립니다. [[slnc 250]] 미리 준비된 식사는 더 나은 서비스가 되고, [[slnc 150]] 잇테이블이 만들어가는 외식의 새로운 기준입니다."
  "10|지금 바로 [[slnc 200]] 잇테이블에서 시작해 보세요. [[slnc 250]] 이트테이블 점 케이알에서 [[slnc 150]] 만나뵙겠습니다."
)

NAMES=(s01 s02 s03 s04 s05 s06 s07 s08 s09 s10 s11 s12 transition d1-label d1-video d2-label d2-video d3-label d3-video d4-label d4-video c01 c02 c03)

CONCAT_LIST=$NARR/concat.txt
> $CONCAT_LIST

for i in "${!SEGMENTS[@]}"; do
  IFS='|' read -r target text <<< "${SEGMENTS[$i]}"
  name="${NAMES[$i]}"
  vdur=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/$name.mp4)
  printf "[%02d/%02d] %-12s (%ss)\n" "$((i+1))" "${#SEGMENTS[@]}" "$name" "$vdur"

  say -v "$VOICE" -r $RATE "$text" -o "$NARR/$name.aiff"
  $FFMPEG -y -i "$NARR/$name.aiff" -ar 44100 -ac 2 "$NARR/$name-raw.wav" 2>/dev/null

  audio_dur=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$NARR/$name-raw.wav")

  if awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{exit !(a > v)}'; then
    # 안전 마진 0.3초 포함하여 atempo (마지막 음절 잘림 방지) + 끝에 silence 추가
    tempo=$(awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{printf "%.3f", a/(v-0.3)}')
    $FFMPEG -y -i "$NARR/$name-raw.wav" -filter:a "atempo=$tempo,apad=pad_dur=1" -t "$vdur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  else
    pad=$(awk -v a="$audio_dur" -v v="$vdur" 'BEGIN{printf "%.3f", v - a}')
    $FFMPEG -y -i "$NARR/$name-raw.wav" -af "apad=pad_dur=$pad" -t "$vdur" -ar 44100 -ac 2 "$NARR/$name.wav" 2>/dev/null
  fi

  echo "file '$NARR/$name.wav'" >> $CONCAT_LIST
done

$FFMPEG -y -f concat -safe 0 -i $CONCAT_LIST -c copy "$NARR/narration-full.wav" 2>/dev/null

$FFMPEG -y -i $SRC/eattable-demo-v2-mute.mp4 -i $NARR/narration-full.wav \
  -c:v copy -c:a aac -b:a 192k -map 0:v:0 -map 1:a:0 -shortest \
  $SRC/eattable-demo-v2-narrated.mp4 2>&1 | tail -1

echo "✅ 나레이션 입힌 v3: $SRC/eattable-demo-v2-narrated.mp4"
ls -lh $SRC/eattable-demo-v2-narrated.mp4
$FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/eattable-demo-v2-narrated.mp4 | awk '{printf "총 길이: %s 초 (%d:%02d)\n", $1, int($1/60), int($1%60)}'
