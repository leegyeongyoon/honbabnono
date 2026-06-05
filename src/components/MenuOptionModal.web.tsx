import React, { useMemo, useState } from 'react';
import { COLORS, CSS_SHADOWS, TRANSITIONS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { MenuItem, MenuOptionGroup } from '../services/restaurantApiService';
import { CartItemOptionPayload } from '../store/cartStore';

// ============================================================
// MenuOptionModal — 메뉴 옵션 선택 바텀시트
//
// 필수 그룹은 minSelect 이상 선택해야 담기 가능, maxSelect 초과 선택 불가.
// 확정 시 서버 전송용 payload + 표시 라벨 + 추가금 합계를 콜백으로 전달.
// ============================================================

interface Props {
  menu: MenuItem;
  groups: MenuOptionGroup[];
  onConfirm: (result: {
    options: CartItemOptionPayload[];
    optionLabel: string;
    optionsPrice: number;
  }) => void;
  onClose: () => void;
}

const FONT = '"Pretendard Variable", Pretendard, system-ui, -apple-system, sans-serif';

const MenuOptionModal: React.FC<Props> = ({ menu, groups, onConfirm, onClose }) => {
  // groupId → 선택된 item id 집합
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const toggleItem = (group: MenuOptionGroup, itemId: string) => {
    setSelected((prev) => {
      const current = prev[group.id] || [];
      if (current.includes(itemId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== itemId) };
      }
      // 단일 선택 그룹(maxSelect 1)은 교체, 그 외엔 maxSelect까지 추가
      if (group.maxSelect <= 1) {
        return { ...prev, [group.id]: [itemId] };
      }
      if (current.length >= group.maxSelect) return prev;
      return { ...prev, [group.id]: [...current, itemId] };
    });
  };

  // 필수 그룹 충족 여부
  const isValid = useMemo(
    () => groups.every((g) => {
      if (!g.isRequired) return true;
      const need = Math.max(g.minSelect, 1);
      return (selected[g.id] || []).length >= need;
    }),
    [groups, selected],
  );

  const { optionsPrice, optionLabel } = useMemo(() => {
    let price = 0;
    const labels: string[] = [];
    for (const g of groups) {
      for (const itemId of selected[g.id] || []) {
        const item = g.items.find((it) => it.id === itemId);
        if (item) {
          price += item.additionalPrice;
          labels.push(item.name);
        }
      }
    }
    return { optionsPrice: price, optionLabel: labels.join(', ') };
  }, [groups, selected]);

  const handleConfirm = () => {
    if (!isValid) return;
    const options: CartItemOptionPayload[] = Object.entries(selected)
      .filter(([, itemIds]) => itemIds.length > 0)
      .map(([groupId, itemIds]) => ({ group_id: groupId, item_ids: itemIds }));
    onConfirm({ options, optionLabel, optionsPrice });
  };

  const formatPrice = (n: number) => n.toLocaleString('ko-KR');
  const totalUnit = menu.price + optionsPrice;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.sheet} onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div style={s.header}>
          <div style={s.menuName}>{menu.name}</div>
          <div style={s.closeButton} onClick={onClose}>✕</div>
        </div>
        <div style={s.basePrice}>기본 {formatPrice(menu.price)}원</div>

        {/* 옵션 그룹 */}
        <div style={s.groupList}>
          {groups.map((group) => {
            const picked = selected[group.id] || [];
            return (
              <div key={group.id} style={s.group}>
                <div style={s.groupHeader}>
                  <span style={s.groupName}>{group.name}</span>
                  <span style={group.isRequired ? s.requiredBadge : s.optionalBadge}>
                    {group.isRequired
                      ? `필수 ${Math.max(group.minSelect, 1)}개`
                      : `선택${group.maxSelect > 1 ? ` (최대 ${group.maxSelect}개)` : ''}`}
                  </span>
                </div>
                {group.items.map((item) => {
                  const checked = picked.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      style={{ ...s.optionRow, backgroundColor: checked ? COLORS.secondary.light : 'transparent' }}
                      onClick={() => toggleItem(group, item.id)}
                    >
                      <div style={{ ...s.checkbox, ...(checked ? s.checkboxOn : {}) }}>
                        {checked ? '✓' : ''}
                      </div>
                      <span style={s.optionName}>{item.name}</span>
                      <span style={s.optionPrice}>
                        {item.additionalPrice > 0 ? `+${formatPrice(item.additionalPrice)}원` : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* 담기 버튼 */}
        <div
          style={{ ...s.confirmButton, opacity: isValid ? 1 : 0.4, cursor: isValid ? 'pointer' : 'not-allowed' }}
          onClick={handleConfirm}
        >
          {formatPrice(totalUnit)}원 담기
        </div>
        {!isValid && (
          <div style={s.hint}>필수 옵션을 선택해주세요.</div>
        )}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)',
    zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  },
  sheet: {
    width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto',
    backgroundColor: COLORS.surface.primary,
    borderRadius: `${BORDER_RADIUS.xl}px ${BORDER_RADIUS.xl}px 0 0`,
    padding: SPACING.screen.horizontal, boxShadow: CSS_SHADOWS.bottomSheet,
    fontFamily: FONT,
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  menuName: { fontSize: 18, fontWeight: 700, color: COLORS.text.primary },
  closeButton: {
    width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', color: COLORS.text.tertiary, fontSize: 16,
  },
  basePrice: { fontSize: 13, color: COLORS.text.tertiary, marginBottom: SPACING.md },

  groupList: { marginBottom: SPACING.lg },
  group: { marginBottom: SPACING.lg },
  groupHeader: { display: 'flex', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  groupName: { fontSize: 15, fontWeight: 700, color: COLORS.text.primary },
  requiredBadge: {
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.functional.errorLight ?? '#FDECEA', color: COLORS.functional.error,
  },
  optionalBadge: {
    fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.neutral.light, color: COLORS.text.tertiary,
  },
  optionRow: {
    display: 'flex', alignItems: 'center', gap: SPACING.md,
    padding: `${SPACING.sm + 2}px ${SPACING.sm}px`, borderRadius: BORDER_RADIUS.md,
    cursor: 'pointer', transition: TRANSITIONS.fast,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, border: `1.5px solid ${COLORS.neutral.grey200}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, color: COLORS.text.white, flexShrink: 0,
  },
  checkboxOn: { backgroundColor: COLORS.primary.main, borderColor: COLORS.primary.main },
  optionName: { flex: 1, fontSize: 14, color: COLORS.text.primary },
  optionPrice: { fontSize: 13, fontWeight: 600, color: COLORS.text.secondary },

  confirmButton: {
    background: `linear-gradient(135deg, ${COLORS.primary.main} 0%, ${COLORS.primary.gradient} 100%)`,
    borderRadius: BORDER_RADIUS.xxl, padding: '14px 0', textAlign: 'center',
    color: COLORS.text.white, fontSize: 15, fontWeight: 700,
    boxShadow: CSS_SHADOWS.cta, transition: TRANSITIONS.normal,
  },
  hint: { textAlign: 'center', fontSize: 12, color: COLORS.functional.error, marginTop: SPACING.sm },
};

export default MenuOptionModal;
