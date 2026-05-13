#!/bin/bash
# v2 마무리: 자막 burn-in + 썸네일 생성 + 데스크탑 복사

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
SRC=/tmp/demo-videos/v2
FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc

echo "▶ SRT 자막 파일 생성"
cat > $SRC/eattable-demo-v2.srt <<'EOF'
1
00:00:00,000 --> 00:00:08,000
이런 경험, 있으셨죠?

2
00:00:08,000 --> 00:00:16,000
30분 — 가게 앞에서 줄 서기

3
00:00:16,000 --> 00:00:24,000
10분 — 자리에서 메뉴 고민

4
00:00:24,000 --> 00:00:32,000
30분 — 주문 후 음식 대기

5
00:00:32,000 --> 00:00:44,000
한 끼 위해, 식사 전에 70분

6
00:00:44,000 --> 00:00:54,000
예약 앱을 써도 자리만 잡혀요

7
00:00:54,000 --> 00:01:04,000
예약·메뉴·결제를 모두 미리?

8
00:01:04,000 --> 00:01:14,000
도착하면 바로 식사가 시작된다면?

9
00:01:14,000 --> 00:01:22,000
잇테이블 — EatTable

10
00:01:22,000 --> 00:01:30,000
멀리서 미리, 가서 바로 먹기만

11
00:01:30,000 --> 00:01:34,000
이렇게 작동합니다

12
00:01:34,000 --> 00:01:36,500
고객 시점

13
00:01:36,500 --> 00:01:44,000
매장 검색 → 메뉴 선택

14
00:01:44,000 --> 00:01:52,000
날짜·시간·인원 → 결제

15
00:01:52,000 --> 00:01:59,100
도착하면 바로 식사 시작

16
00:01:59,100 --> 00:02:01,600
점주 운영 화면

17
00:02:01,600 --> 00:02:10,000
대시보드에서 예약·매출 한눈에

18
00:02:10,000 --> 00:02:20,000
예약 보드 · 메뉴 관리 · 정산

19
00:02:20,000 --> 00:02:30,700
운영에 필요한 모든 정보, 한 곳에

20
00:02:30,700 --> 00:02:33,200
관리자 검토

21
00:02:33,200 --> 00:02:42,000
사업자 정보 · 계좌 확인

22
00:02:42,000 --> 00:02:54,500
클릭 한 번으로 매장 승인

23
00:02:54,500 --> 00:02:57,000
신규 점주 가입

24
00:02:57,000 --> 00:03:08,000
이메일 가입 후 사업자 등록

25
00:03:08,000 --> 00:03:20,000
사업자 번호 · 상호 · 대표자 · 계좌

26
00:03:20,000 --> 00:03:27,600
관리자 승인 → 매장 운영 시작

27
00:03:27,600 --> 00:03:37,600
멀리서 예약·메뉴·결제까지, 한 번에

28
00:03:37,600 --> 00:03:47,600
고객엔 시간을, 매장엔 효율을

29
00:03:47,600 --> 00:03:57,600
지금 시작하세요 — eattable.kr
EOF
echo "✓ SRT: $SRC/eattable-demo-v2.srt"

echo ""
echo "▶ 자막 burn-in 영상 생성"
$FFMPEG -y -i $SRC/eattable-demo-v2-narrated.mp4 \
  -vf "subtitles=$SRC/eattable-demo-v2.srt:force_style='FontName=AppleSDGothicNeo,FontSize=26,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=3,Outline=4,Shadow=0,Alignment=2,MarginV=70'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a copy \
  $SRC/eattable-demo-v2-final.mp4 2>&1 | tail -1

echo "✓ 최종: $SRC/eattable-demo-v2-final.mp4"

echo ""
echo "▶ YouTube 썸네일 생성 (1280x720)"
$FFMPEG -y -f lavfi -i "color=c=0xC4A08A:s=1280x720" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=110:fontcolor=#1a1a1a:x=80:y=80,\
drawtext=fontfile=$FONT:text='멀리서 미리,':fontsize=82:fontcolor=#1a1a1a:x=80:y=290,\
drawtext=fontfile=$FONT:text='가서 바로 먹기만.':fontsize=82:fontcolor=#E84A5F:x=80:y=400,\
drawtext=fontfile=$FONT:text='예약 · 메뉴 · 결제 한 번에':fontsize=40:fontcolor=#3a2a1a:x=80:y=560,\
drawtext=fontfile=$FONT:text='eattable.kr':fontsize=38:fontcolor=#3a2a1a:x=80:y=620" \
  -frames:v 1 \
  $SRC/thumbnail.jpg 2>&1 | tail -1

echo "✓ 썸네일: $SRC/thumbnail.jpg"

echo ""
echo "▶ 데스크탑 복사"
cp $SRC/eattable-demo-v2-final.mp4 ~/Desktop/잇테이블-소개영상-v2-최종.mp4
cp $SRC/eattable-demo-v2-narrated.mp4 ~/Desktop/잇테이블-소개영상-v2-자막없음.mp4
cp $SRC/eattable-demo-v2.srt ~/Desktop/잇테이블-자막-v2.srt
cp $SRC/thumbnail.jpg ~/Desktop/잇테이블-유튜브-썸네일.jpg

echo ""
echo "═══════════════════════════════════════════════"
echo " 데스크탑 산출물"
echo "═══════════════════════════════════════════════"
ls -lh ~/Desktop/잇테이블-*v2* ~/Desktop/잇테이블-자막-v2* ~/Desktop/잇테이블-유튜브-썸네일* 2>/dev/null

echo ""
echo "✅ 모두 완료 — 영상 열기"
open ~/Desktop/잇테이블-소개영상-v2-최종.mp4
