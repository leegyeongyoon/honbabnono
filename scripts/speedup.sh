#!/bin/bash
# v2 영상을 2배 속도로 압축 (3:36 → 1:48)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
FFPROBE="$HOME/.local/bin/ffprobe-full"
SRC=/tmp/demo-videos/v2

echo "▶ 자막 포함 영상 2배 가속"
$FFMPEG -y -i $SRC/eattable-demo-v2-final.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  $SRC/eattable-demo-v2-final-2x.mp4 2>&1 | tail -1

echo "▶ 자막 없는 영상 2배 가속"
$FFMPEG -y -i $SRC/eattable-demo-v2-narrated.mp4 \
  -filter_complex "[0:v]setpts=PTS/1.5[v];[0:a]atempo=1.5[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  $SRC/eattable-demo-v2-narrated-2x.mp4 2>&1 | tail -1

echo "▶ SRT 자막 timing 절반으로"
python3 -c "
import re
with open('$SRC/eattable-demo-v2.srt') as f:
    content = f.read()

def half_time(m):
    h, mn, s, ms = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))
    total_ms = (h*3600 + mn*60 + s) * 1000 + ms
    scaled = int(total_ms / 1.5)
    return f'{scaled//3600000:02d}:{(scaled//60000)%60:02d}:{(scaled//1000)%60:02d},{scaled%1000:03d}'

content = re.sub(r'(\d{2}):(\d{2}):(\d{2}),(\d{3})', half_time, content)
with open('$SRC/eattable-demo-v2-2x.srt', 'w') as f:
    f.write(content)
print('SRT 변환 완료')
"

echo ""
echo "▶ 기존 데스크탑 파일 정리"
rm -f ~/Desktop/잇테이블-소개영상-v2-*.mp4 ~/Desktop/잇테이블-자막-v2*.srt ~/Desktop/잇테이블-유튜브-썸네일.jpg

echo "▶ 새 파일 데스크탑 복사"
cp $SRC/eattable-demo-v2-final-2x.mp4 ~/Desktop/잇테이블-소개영상-최종.mp4
cp $SRC/eattable-demo-v2-narrated-2x.mp4 ~/Desktop/잇테이블-소개영상-자막없음.mp4
cp $SRC/eattable-demo-v2-2x.srt ~/Desktop/잇테이블-자막.srt
cp $SRC/thumbnail.jpg ~/Desktop/잇테이블-유튜브-썸네일.jpg

echo ""
echo "═══════════════════════════════════════════════"
echo " 데스크탑"
echo "═══════════════════════════════════════════════"
ls -lh ~/Desktop/잇테이블-* 2>&1
DUR=$($FFPROBE -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 ~/Desktop/잇테이블-소개영상-최종.mp4)
echo ""
echo "✅ 최종 길이: $(awk -v d=$DUR 'BEGIN{printf "%d:%02d", int(d/60), int(d%60)}')"
open ~/Desktop/잇테이블-소개영상-최종.mp4
