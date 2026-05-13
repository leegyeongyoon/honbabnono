#!/bin/bash
# 통합 영상용 SRT 자막 + 자막 burn-in 영상 생성
#
# 사용:
#   bash scripts/make-subtitles.sh

set -e

FFMPEG="$HOME/.local/bin/ffmpeg-full"
SRC=/tmp/demo-videos/combined
OUT=$SRC

# 세그먼트별 (start_sec | end_sec | subtitle_text)
cat > $OUT/eattable-demo.srt <<'EOF'
1
00:00:00,000 --> 00:00:03,000
잇테이블 — 메뉴까지 미리 예약하는 새로운 외식

2
00:00:03,000 --> 00:00:05,000
고객의 예약 흐름

3
00:00:05,000 --> 00:00:13,000
원하는 매장을 검색하고, 메뉴를 미리 선택합니다

4
00:00:13,000 --> 00:00:22,000
날짜와 시간, 인원을 정하고 결제까지 완료하면 예약 확정

5
00:00:22,000 --> 00:00:27,600
도착 시간에 음식이 준비되어 — 줄 서지 않고 바로 식사

6
00:00:27,600 --> 00:00:29,600
점주 운영 화면

7
00:00:29,600 --> 00:00:38,000
점주 대시보드 — 오늘의 예약과 매출을 한눈에

8
00:00:38,000 --> 00:00:48,000
예약 보드와 메뉴 관리, 정산 내역까지 자동화

9
00:00:48,000 --> 00:00:58,700
매장 운영에 필요한 모든 것이 한 화면에

10
00:00:58,700 --> 00:01:00,700
관리자 검토 화면

11
00:01:00,700 --> 00:01:10,000
관리자는 신규 점주의 사업자 정보를 검토하고

12
00:01:10,000 --> 00:01:22,000
사업자 등록증과 계좌를 확인한 뒤 클릭 한 번으로 매장 승인

13
00:01:22,000 --> 00:01:24,000
신규 점주 가입 흐름

14
00:01:24,000 --> 00:01:34,000
이메일로 로그인 후 사업자 등록 화면 진입

15
00:01:34,000 --> 00:01:46,000
사업자 번호, 상호, 대표자명 입력 → 다음 단계

16
00:01:46,000 --> 00:01:54,500
은행 계좌 정보까지 입력하면 관리자 승인 대기

17
00:01:54,500 --> 00:02:00,000
지금, 잇테이블에서 시작하세요 — eattable.kr
EOF

echo "✓ SRT 생성: $OUT/eattable-demo.srt"

# 자막 burn-in 버전 만들기 (한글 폰트 강제)
FONT="/System/Library/Fonts/AppleSDGothicNeo.ttc"

echo "▶ 자막 burn-in 영상 생성 (subtitles filter)"
$FFMPEG -y -i $OUT/eattable-demo-narrated.mp4 \
  -vf "subtitles=$OUT/eattable-demo.srt:force_style='FontName=AppleSDGothicNeo,FontSize=24,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,BorderStyle=3,Outline=2,Shadow=0,Alignment=2,MarginV=60'" \
  -c:v libx264 -preset medium -crf 22 -pix_fmt yuv420p \
  -c:a copy \
  $OUT/eattable-demo-final.mp4 2>&1 | tail -1

echo ""
echo "✅ 최종 영상 (나레이션 + 자막): $OUT/eattable-demo-final.mp4"
ls -lh $OUT/eattable-demo-final.mp4
