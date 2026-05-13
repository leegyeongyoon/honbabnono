#!/bin/bash
# v3 자막 + 썸네일 (Apple Loops BGM 적용 전 단계)

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
SRC=/tmp/demo-videos/v2
FONT=/System/Library/Fonts/AppleSDGothicNeo.ttc

# 12장 스토리 + 데모 + 클로징 timing 계산
# s01(6)+s02(6)+s03(6)+s04(6)+s05(6)+s06(9)+s07(7)+s08(7)+s09(7)+s10(9)+s11(7)+s12(7) = 83s
# transition(4) + demo(2.5+22.6+2.5+29.1+2.5+21.3+2.5+30.6=113.6) = 117.6s
# closing 30s
# total: 83+117.6+30 = 230.6s

echo "▶ SRT 자막 생성"
cat > $SRC/eattable-demo-v2.srt <<'EOF'
1
00:00:00,000 --> 00:00:06,000
외식 한 끼, 시작하기까지 얼마나 걸릴까요?

2
00:00:06,000 --> 00:00:12,000
줄 서기·자리 안내 — 8분

3
00:00:12,000 --> 00:00:18,000
메뉴 고민 — 5분

4
00:00:18,000 --> 00:00:24,000
주문·결제 — 5분

5
00:00:24,000 --> 00:00:30,000
음식 나오기 — 12분

6
00:00:30,000 --> 00:00:39,000
총 30분 — 식사를 시작하기까지

7
00:00:39,000 --> 00:00:46,000
잇테이블로 바꾸면 어떨까요?

8
00:00:46,000 --> 00:00:53,000
예약·메뉴·결제 → 0분

9
00:00:53,000 --> 00:01:00,000
음식 대기 → 약 5분

10
00:01:00,000 --> 00:01:09,000
약 25분 절약

11
00:01:09,000 --> 00:01:16,000
잇테이블 — EatTable

12
00:01:16,000 --> 00:01:23,000
멀리서 미리, 가서 바로 먹기만

13
00:01:23,000 --> 00:01:27,000
이렇게 작동합니다

14
00:01:27,000 --> 00:01:29,500
고객 시점

15
00:01:29,500 --> 00:01:52,100
검색 → 메뉴 → 예약 → 결제 → 도착하면 바로 식사

16
00:01:52,100 --> 00:01:54,600
점주 운영 화면

17
00:01:54,600 --> 00:02:23,700
대시보드 · 예약 보드 · 메뉴 관리 · 정산

18
00:02:23,700 --> 00:02:26,200
관리자 검토

19
00:02:26,200 --> 00:02:47,500
사업자 정보·계좌 확인 → 매장 승인

20
00:02:47,500 --> 00:02:50,000
신규 점주 가입

21
00:02:50,000 --> 00:03:20,600
사업자 등록·계좌·서류 → 관리자 승인

22
00:03:20,600 --> 00:03:30,600
멀리서 예약·메뉴·결제, 도착하면 바로 식사

23
00:03:30,600 --> 00:03:40,600
고객엔 시간을, 매장엔 효율을

24
00:03:40,600 --> 00:03:50,600
지금 시작하세요 — eattable.kr
EOF

echo "▶ 자막 burn-in 영상"
$FFMPEG -y -i $SRC/eattable-demo-v2-narrated.mp4 \
  -vf "subtitles=$SRC/eattable-demo-v2.srt:force_style='FontName=AppleSDGothicNeo,FontSize=26,PrimaryColour=&HFFFFFF&,OutlineColour=&H80000000&,BorderStyle=3,Outline=4,Shadow=0,Alignment=2,MarginV=70'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a copy \
  $SRC/eattable-demo-v2-final.mp4 2>&1 | tail -1

echo "▶ 썸네일 (1280x720)"
$FFMPEG -y -f lavfi -i "color=c=0xC4A08A:s=1280x720" \
  -vf "drawtext=fontfile=$FONT:text='잇테이블':fontsize=110:fontcolor=#1a1a1a:x=80:y=80,\
drawtext=fontfile=$FONT:text='한 끼 시작이':fontsize=70:fontcolor=#1a1a1a:x=80:y=270,\
drawtext=fontfile=$FONT:text='25분 빨라집니다':fontsize=82:fontcolor=#E84A5F:x=80:y=370,\
drawtext=fontfile=$FONT:text='예약·메뉴·결제까지 미리, 도착하면 바로':fontsize=34:fontcolor=#3a2a1a:x=80:y=560,\
drawtext=fontfile=$FONT:text='eattable.kr':fontsize=38:fontcolor=#3a2a1a:x=80:y=620" \
  -frames:v 1 $SRC/thumbnail.jpg 2>&1 | tail -1

echo ""
echo "✅ 자막 영상: $SRC/eattable-demo-v2-final.mp4"
echo "✅ 썸네일: $SRC/thumbnail.jpg"
