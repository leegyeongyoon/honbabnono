#!/usr/bin/env python3
"""잇테이블 멘토링 신청서 첨부 이미지 6장 생성 — PIL 기반"""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

OUT = Path.home() / "Desktop" / "잇테이블-자료"
OUT.mkdir(exist_ok=True)

FONT_PATH = "/System/Library/Fonts/AppleSDGothicNeo.ttc"

# 컬러
BEIGE = (196, 160, 138)         # #C4A08A
BEIGE_LIGHT = (232, 212, 194)   # #E8D4C2
DARK = (26, 26, 26)             # #1a1a1a
DARK_WARM = (42, 32, 24)        # #2a2018
DARK_CARD = (26, 26, 26)
OFF_WHITE = (244, 228, 215)     # #F4E4D7
RED = (232, 74, 95)             # #E84A5F
GREEN = (91, 186, 111)          # #5BBA6F
GOLD = (212, 165, 116)          # #D4A574
GREY_LIGHT = (153, 153, 153)
GREY_MID = (136, 136, 136)
GREY_DARK = (102, 102, 102)
BROWN_DARK = (58, 42, 26)
WHITE = (255, 255, 255)

W, H = 1920, 1080


def f(size, bold=False):
    """폰트 로딩 (AppleSDGothicNeo는 TTC라 index 사용)"""
    try:
        return ImageFont.truetype(FONT_PATH, size, index=1 if bold else 0)
    except Exception:
        return ImageFont.truetype(FONT_PATH, size)


def center_text(draw, text, y, size, color, w=W, bold=False):
    font = f(size, bold)
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((w - tw) // 2, y), text, font=font, fill=color)


def text_at(draw, text, x, y, size, color, bold=False):
    draw.text((x, y), text, font=f(size, bold), fill=color)


# ─────────────────────────────────────────────
# Q1: 히어로 카드
# ─────────────────────────────────────────────
def q1_hero():
    img = Image.new("RGB", (W, H), BEIGE)
    d = ImageDraw.Draw(img)
    center_text(d, "잇테이블", 240, 220, DARK, bold=True)
    center_text(d, "EatTable", 490, 64, BROWN_DARK)
    center_text(d, "멀리서 미리 예약·메뉴·결제,", 700, 56, DARK)
    center_text(d, "도착하면 바로 식사.", 780, 56, RED, bold=True)
    center_text(d, "선주문형 외식 예약 플랫폼", 920, 38, BROWN_DARK)
    img.save(OUT / "Q1-hero.jpg", quality=92)
    print("[1/6] Q1-hero.jpg")


# ─────────────────────────────────────────────
# Q2: 시장 4분할 통계
# ─────────────────────────────────────────────
def q2_market_stats():
    img = Image.new("RGB", (W, H), DARK)
    d = ImageDraw.Draw(img)
    center_text(d, "시장은 이미 디지털로 빠르게 이동 중", 70, 44, OFF_WHITE)

    cards = [
        (80, 160, "사이렌오더", "주문 결제 비중", "40%", "2019 (20%) → 2025 (40%)"),
        (990, 160, "캐치테이블", "월 활성 사용자", "500만", "2024년 8월 기준 / 가맹점 1만+"),
        (80, 580, "티오더 (테이블오더)", "누적 결제액", "10조", "시장 점유율 60% 이상"),
        (990, 580, "예약·웨이팅 앱", "3년간 사용자 증가", "+185%", "102만 (2022) → 291만 (2025)"),
    ]
    for x, y, title, sub, big, foot in cards:
        d.rectangle([x, y, x + 850, y + 400], fill=DARK_WARM)
        text_at(d, title, x + 40, y + 30, 40, GOLD, bold=True)
        text_at(d, sub, x + 40, y + 90, 28, GREY_LIGHT)
        text_at(d, big, x + 40, y + 140, 200, OFF_WHITE, bold=True)
        text_at(d, foot, x + 40, y + 350, 24, GREY_MID)

    center_text(d, "출처: 스타벅스 코리아 · 와이즈앱 · 네이트뉴스 · 전자신문 (2025~2026)", 1030, 22, GREY_DARK)
    img.save(OUT / "Q2-market-stats.jpg", quality=92)
    print("[2/6] Q2-market-stats.jpg")


# ─────────────────────────────────────────────
# Q3-1: 노쇼 통계
# ─────────────────────────────────────────────
def q3_noshow_stats():
    img = Image.new("RGB", (W, H), DARK_WARM)
    d = ImageDraw.Draw(img)
    center_text(d, "외식업 점주가 마주하는 현실", 40, 40, OFF_WHITE)

    # 좌측 카드 (기사 본문 임베드)
    news_path = "/tmp/news-screenshots/hankyung-noshow-44.png"
    article_url = "hankyung.com/article/2026010165597"
    card_x, card_y = 50, 120
    card_w, card_h = 1100, 940

    # 카드 배경
    d.rectangle([card_x, card_y, card_x + card_w, card_y + card_h], fill=WHITE)
    # 카드 헤더 (베이지)
    d.rectangle([card_x, card_y, card_x + card_w, card_y + 70], fill=BEIGE)
    text_at(d, "한국경제 · 2026.01.01", card_x + 24, card_y + 20, 28, DARK, bold=True)
    text_at(d, "기사 원문 ↗", card_x + card_w - 180, card_y + 22, 24, BROWN_DARK, bold=True)

    if Path(news_path).exists():
        news = Image.open(news_path)
        # 카드에 충분히 들어갈 높이로 리사이즈 (header 70 + footer 100 = 170 차감)
        avail_h = card_h - 70 - 110  # 헤더 + URL/캡션 영역 확보
        avail_w = card_w - 40

        # 비율에 따라 fit
        ratio_w = avail_w / news.width
        ratio_h = avail_h / news.height
        ratio = min(ratio_w, ratio_h)
        new_w = int(news.width * ratio)
        new_h = int(news.height * ratio)
        resized = news.resize((new_w, new_h), Image.LANCZOS)

        # 중앙 정렬
        px = card_x + (card_w - new_w) // 2
        py = card_y + 80
        img.paste(resized, (px, py))

        # 하단 URL 박스 (회색 배경 + URL)
        url_y = card_y + card_h - 90
        d.rectangle([card_x + 20, url_y, card_x + card_w - 20, url_y + 70], fill=(245, 240, 235))
        text_at(d, "원문 URL", card_x + 36, url_y + 8, 18, GREY_DARK)
        text_at(d, "https://www." + article_url, card_x + 36, url_y + 32, 24, DARK, bold=True)

    else:
        text_at(d, "(news capture missing)", card_x + 50, card_y + 400, 32, GREY_MID)

    # 우측: 핵심 수치 강조 박스 2개
    rx = 1190
    rw = 690
    # 65%
    d.rectangle([rx, 120, rx + rw, 510], fill=DARK)
    text_at(d, "노쇼 피해 매장", rx + 40, 165, 30, GREY_LIGHT)
    text_at(d, "65%", rx + 40, 220, 200, RED, bold=True)
    text_at(d, "외식 점포 10곳 중 6곳 이상", rx + 40, 440, 24, OFF_WHITE)

    # 44만원
    d.rectangle([rx, 540, rx + rw, 930], fill=DARK)
    text_at(d, "1회 노쇼당 평균 손실", rx + 40, 585, 30, GREY_LIGHT)
    text_at(d, "44만원", rx + 40, 650, 150, RED, bold=True)
    text_at(d, "재료 폐기 + 매출 손실 + 기회비용", rx + 40, 860, 24, OFF_WHITE)

    # 우측 하단 추가 통계
    d.rectangle([rx, 950, rx + rw, 1060], fill=DARK)
    text_at(d, "피해 점포 평균 8.6회 / 일식 매장 16.3회", rx + 40, 985, 22, OFF_WHITE)

    center_text(d, "출처: 한국경제 (2026.01.01) · 중소벤처기업부 발표 · 한국외식업중앙회 214개 사업체 조사", 1070, 18, GREY_DARK)
    img.save(OUT / "Q3-noshow-stats.jpg", quality=92)
    print("[3/6] Q3-noshow-stats.jpg (with full article + URL)")


# ─────────────────────────────────────────────
# Q3-2: Before/After 시간 비교
# ─────────────────────────────────────────────
def q3_before_after():
    img = Image.new("RGB", (W, H), BEIGE_LIGHT)
    d = ImageDraw.Draw(img)
    center_text(d, "식사를 시작하기까지 걸리는 시간", 60, 52, DARK, bold=True)

    # 좌 — 지금 (30분)
    d.rectangle([100, 180, 920, 880], fill=WHITE)
    text_at(d, "지금의 외식", 400, 220, 42, GREY_MID)
    text_at(d, "30분", 360, 310, 240, RED, bold=True)
    steps_before = [
        ("줄 서기 · 자리 안내", "8분"),
        ("메뉴 고민", "5분"),
        ("주문 · 결제", "5분"),
        ("음식 나오기", "12분"),
    ]
    for i, (label, mins) in enumerate(steps_before):
        y = 630 + i * 55
        text_at(d, "· " + label, 160, y, 28, BROWN_DARK)
        text_at(d, mins, 750, y, 28, RED, bold=True)

    # 우 — 잇테이블 (5분)
    d.rectangle([1000, 180, 1820, 880], fill=WHITE)
    text_at(d, "잇테이블", 1340, 220, 42, GREEN, bold=True)
    text_at(d, "5분", 1340, 310, 240, GREEN, bold=True)
    steps_after = [
        ("줄 서기 · 자리 안내", "0분"),
        ("메뉴 고민", "0분"),
        ("주문 · 결제", "0분"),
        ("음식 나오기", "약 5분"),
    ]
    for i, (label, mins) in enumerate(steps_after):
        y = 630 + i * 55
        text_at(d, "· " + label, 1060, y, 28, BROWN_DARK)
        text_at(d, mins, 1650, y, 28, GREEN, bold=True)

    center_text(d, "약 25분 절약", 920, 72, RED, bold=True)
    img.save(OUT / "Q3-before-after.jpg", quality=92)
    print("[4/6] Q3-before-after.jpg")


# ─────────────────────────────────────────────
# Q4-1: 프로토타입 콜라주
# ─────────────────────────────────────────────
def q4_prototype_collage():
    img = Image.new("RGB", (W, H), DARK)
    d = ImageDraw.Draw(img)

    sources = {
        "고객": ("/tmp/page-diagnostics/customer/roothome.png", "검색 · 예약 · 메뉴 · 결제"),
        "점주": ("/tmp/page-diagnostics/merchant/root.png", "예약 보드 · 메뉴 · 정산"),
        "관리자": ("/tmp/page-diagnostics/admin/rootdashboard.png", "매장 검토 · 승인"),
    }

    center_text(d, "실제 작동하는 프로토타입", 70, 44, OFF_WHITE)

    x_positions = [120, 720, 1320]
    for i, (label, (path, sub)) in enumerate(sources.items()):
        x = x_positions[i]
        try:
            screen = Image.open(path)
            # 4:3 ratio로 맞춰서 480x640 영역에 fit
            screen.thumbnail((480, 640))
            sw, sh = screen.size
            ox = x + (480 - sw) // 2
            oy = 250 + (640 - sh) // 2
            img.paste(screen, (ox, oy))
        except Exception as e:
            d.rectangle([x, 250, x + 480, 890], outline=GOLD, width=3)
            text_at(d, "(screenshot)", x + 100, 500, 24, GREY_MID)

        # 라벨
        bbox = d.textbbox((0, 0), label, font=f(40, True))
        tw = bbox[2] - bbox[0]
        d.text((x + (480 - tw) // 2, 180), label, font=f(40, True), fill=GOLD)

        # 서브
        bbox2 = d.textbbox((0, 0), sub, font=f(22))
        sw2 = bbox2[2] - bbox2[0]
        d.text((x + (480 - sw2) // 2, 920), sub, font=f(22), fill=GREY_LIGHT)

    center_text(d, "eattable.kr  ·  merchant.eattable.kr  ·  admin.eattable.kr", 1010, 24, GREY_DARK)
    img.save(OUT / "Q4-prototype-collage.jpg", quality=92)
    print("[5/6] Q4-prototype-collage.jpg")


# ─────────────────────────────────────────────
# Q4-2: 시간 절감 타임라인
# ─────────────────────────────────────────────
def q4_time_saving():
    img = Image.new("RGB", (W, H), BEIGE_LIGHT)
    d = ImageDraw.Draw(img)
    center_text(d, "도착부터 식사 시작까지 — 시간 비교", 60, 48, DARK, bold=True)

    # 지금 — 빨강 바
    text_at(d, "지금의 외식", 80, 200, 36, GREY_DARK)
    d.rectangle([80, 270, 1640, 350], fill=RED)
    # 4개 라벨 (8 + 5 + 5 + 12 = 30분, 비율 약 8:5:5:12)
    segs = [(0, 416, "줄·자리 8분"), (416, 260, "메뉴 5분"), (676, 260, "주문·결제 5분"), (936, 624, "음식 12분")]
    for x0, w, lbl in segs:
        bbox = d.textbbox((0, 0), lbl, font=f(24, True))
        text_at(d, lbl, 80 + x0 + (w - (bbox[2]-bbox[0])) // 2, 295, 24, WHITE, bold=True)
    text_at(d, "30분", 1680, 290, 56, RED, bold=True)

    # 잇테이블 — 녹색 바
    text_at(d, "잇테이블 사용", 80, 540, 36, GREEN, bold=True)
    d.rectangle([80, 610, 340, 690], fill=GREEN)
    text_at(d, "음식 약 5분", 130, 635, 24, WHITE, bold=True)
    text_at(d, "5분", 380, 625, 56, GREEN, bold=True)

    text_at(d, "▸ 멀리서 미리 예약·메뉴·결제 완료", 80, 740, 30, BROWN_DARK)
    text_at(d, "▸ 도착 시간에 맞춰 음식이 거의 준비됨", 80, 790, 30, BROWN_DARK)

    center_text(d, "약 25분 절약", 900, 72, RED, bold=True)
    img.save(OUT / "Q4-time-saving.jpg", quality=92)
    print("[6/6] Q4-time-saving.jpg")


# ─────────────────────────────────────────────
# Q3-3: 노쇼 시각화 (예약 카드 + NO SHOW 스탬프)
# ─────────────────────────────────────────────
def q3_noshow_scene():
    img = Image.new("RGB", (W, H), DARK_WARM)
    d = ImageDraw.Draw(img)

    center_text(d, "예약하셨는데, 손님은 오지 않습니다", 80, 44, OFF_WHITE)

    # 예약 카드 (흰색 카드)
    cx, cy, cw, ch = 360, 220, 1200, 640
    # 그림자
    d.rectangle([cx + 12, cy + 12, cx + cw + 12, cy + ch + 12], fill=(0, 0, 0))
    # 카드 본체
    d.rectangle([cx, cy, cx + cw, cy + ch], fill=WHITE)
    # 카드 헤더 띠
    d.rectangle([cx, cy, cx + cw, cy + 80], fill=BEIGE)
    text_at(d, "예약 확정", cx + 40, cy + 22, 36, DARK, bold=True)
    text_at(d, "오늘 19:00", cx + cw - 220, cy + 22, 36, DARK)

    # 카드 본문
    text_at(d, "잇테이블 데모 샤브샤브", cx + 50, cy + 120, 44, DARK, bold=True)
    text_at(d, "강남점 · 4인 테이블", cx + 50, cy + 185, 28, GREY_MID)

    text_at(d, "주문 메뉴", cx + 50, cy + 270, 26, GREY_DARK)
    text_at(d, "· 한우 샤브샤브 코스 (2인) × 2", cx + 50, cy + 320, 30, DARK)
    text_at(d, "· 야채 추가 × 2", cx + 50, cy + 365, 30, DARK)
    text_at(d, "· 칼국수 사리 × 2", cx + 50, cy + 410, 30, DARK)

    text_at(d, "재료 준비 완료", cx + 50, cy + 490, 28, GREEN, bold=True)
    text_at(d, "예약 시간 19:00 도착 대기 중", cx + 50, cy + 530, 26, GREY_MID)

    # NO SHOW 스탬프 (회전 효과는 PIL에서 별도 레이어로)
    stamp = Image.new("RGBA", (700, 200), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stamp)
    # 빨강 outline 박스
    sd.rectangle([10, 10, 690, 190], outline=RED, width=10)
    # NO SHOW 텍스트
    f_stamp = f(120, True)
    bbox = sd.textbbox((0, 0), "NO SHOW", font=f_stamp)
    tw = bbox[2] - bbox[0]
    sd.text(((700 - tw) // 2, 35), "NO SHOW", font=f_stamp, fill=RED)
    # 회전
    rotated = stamp.rotate(-15, expand=True, resample=Image.BICUBIC)
    img.paste(rotated, (1050, 380), rotated)

    # 하단 결과
    center_text(d, "이 한 번으로 평균 44만원이 사라집니다", 920, 36, RED, bold=True)
    center_text(d, "재료 폐기 + 매출 손실 + 다른 손님을 받지 못한 기회비용", 980, 24, GREY_LIGHT)

    img.save(OUT / "Q3-noshow-scene.jpg", quality=92)
    print("[7/7] Q3-noshow-scene.jpg")


if __name__ == "__main__":
    q1_hero()
    q2_market_stats()
    q3_noshow_stats()
    q3_before_after()
    q4_prototype_collage()
    q4_time_saving()
    q3_noshow_scene()
    print(f"\n✓ 7장 생성 완료 → {OUT}")
