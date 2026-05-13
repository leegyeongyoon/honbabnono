#!/bin/bash
# v3 영상 마무리:
#   1) 자막없음/자막포함 영상 각각 1.5x 가속
#   2) Apple Loops BGM 타일링 후 믹스 (12% 볼륨, 상업 사용 OK)
#   3) 데스크탑 파일 정리: 자막없음 = 기본 (잇테이블-소개영상.mp4)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/v2

echo "▶ 자막없음 1.5x 가속"
$FFMPEG -y -i $SRC/eattable-demo-v2-narrated.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  $SRC/no-sub-1.5x.mp4 2>&1 | tail -1

echo "▶ 자막 포함 1.5x 가속"
$FFMPEG -y -i $SRC/eattable-demo-v2-final.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  $SRC/sub-1.5x.mp4 2>&1 | tail -1

echo "▶ BGM 트랙 생성 (Apple Loops Chillwave)"
BGM_LOOP="/Library/Audio/Apple Loops/Apple/07 Chillwave/Chill Chords Acoustic Guitar.caf"
DUR=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 $SRC/no-sub-1.5x.mp4)
FADE_OUT_START=$(awk -v d=$DUR 'BEGIN{printf "%.2f", d-2}')

$FFMPEG -y -stream_loop -1 -i "$BGM_LOOP" \
  -t "$DUR" \
  -af "afade=t=in:st=0:d=2,afade=t=out:st=$FADE_OUT_START:d=2,volume=0.12" \
  -ar 44100 -ac 2 \
  $SRC/bgm.wav 2>&1 | tail -1

echo "▶ 자막없음 + BGM 믹스"
$FFMPEG -y -i $SRC/no-sub-1.5x.mp4 -i $SRC/bgm.wav \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k \
  $SRC/no-sub-final.mp4 2>&1 | tail -1

echo "▶ 자막 포함 + BGM 믹스"
$FFMPEG -y -i $SRC/sub-1.5x.mp4 -i $SRC/bgm.wav \
  -filter_complex "[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=0[a]" \
  -map 0:v -map "[a]" \
  -c:v copy -c:a aac -b:a 192k \
  $SRC/sub-final.mp4 2>&1 | tail -1

echo "▶ SRT 자막 timing 1.5x 조정"
python3 -c "
import re
with open('$SRC/eattable-demo-v2.srt') as f:
    c = f.read()
def scale(m):
    h, mn, s, ms = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    total = (h*3600+mn*60+s)*1000+ms
    sc = int(total/1.5)
    return f'{sc//3600000:02d}:{(sc//60000)%60:02d}:{(sc//1000)%60:02d},{sc%1000:03d}'
c = re.sub(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', scale, c)
open('$SRC/eattable-final.srt','w').write(c)
"

echo ""
echo "▶ 데스크탑 정리"
rm -f ~/Desktop/잇테이블-*.mp4 ~/Desktop/잇테이블-*.srt ~/Desktop/잇테이블-*.jpg

echo "▶ 새 파일 배치 (자막없음 = 기본)"
cp $SRC/no-sub-final.mp4 ~/Desktop/잇테이블-소개영상.mp4
cp $SRC/sub-final.mp4    ~/Desktop/잇테이블-소개영상-자막포함.mp4
cp $SRC/eattable-final.srt ~/Desktop/잇테이블-자막.srt
cp $SRC/thumbnail.jpg ~/Desktop/잇테이블-유튜브-썸네일.jpg

echo ""
echo "═══════════════════════════════════════════════"
echo " 데스크탑 (자막없음 = 기본)"
echo "═══════════════════════════════════════════════"
ls -lh ~/Desktop/잇테이블-* 2>&1
FDUR=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ~/Desktop/잇테이블-소개영상.mp4)
echo ""
echo "✅ 최종 길이: $(awk -v d=$FDUR 'BEGIN{printf "%d:%02d", int(d/60), int(d%60)}')"
open ~/Desktop/잇테이블-소개영상.mp4
