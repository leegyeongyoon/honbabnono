import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { Icon } from './Icon';

interface FilterDropdownProps {
  visible: boolean;
  onClose: () => void;
  selectedGender: string;
  selectedAge: string;
  onGenderChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onReset: () => void;
}

const GENDER_OPTIONS = [
  { label: '전체', value: '' },
  { label: '남성', value: '남성' },
  { label: '여성', value: '여성' },
];

const AGE_OPTIONS = [
  { label: '전체', value: '' },
  { label: '20대', value: '20대' },
  { label: '30대', value: '30대' },
  { label: '40대', value: '40대' },
  { label: '50대+', value: '50대' },
];

const FilterDropdown: React.FC<FilterDropdownProps> = ({
  visible,
  onClose,
  selectedGender,
  selectedAge,
  onGenderChange,
  onAgeChange,
  onReset,
}) => {
  const handleApply = () => {
    onClose();
  };

  const handleReset = () => {
    onReset();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {/* Drag Handle */}
          <View style={styles.dragHandleWrapper}>
            <View style={styles.dragHandle} />
          </View>

          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>필터</Text>
            <TouchableOpacity
              onPress={onClose}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="x" size={20} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {/* Gender Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>성별</Text>
            <View style={styles.chipRow}>
              {GENDER_OPTIONS.map((opt) => {
                const isActive = selectedGender === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => onGenderChange(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Age Section */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>나이</Text>
            <View style={styles.chipRow}>
              {AGE_OPTIONS.map((opt) => {
                const isActive = selectedAge === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, isActive && styles.chipActive]}
                    onPress={() => onAgeChange(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Bottom Actions */}
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={styles.resetText}>초기화</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleApply}
              activeOpacity={0.7}
            >
              <Text style={styles.applyText}>적용</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingBottom: 34,
    ...SHADOWS.large,
  },
  dragHandleWrapper: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.neutral.grey200,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    letterSpacing: -0.2,
  },
  section: {
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.secondary,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    height: 40,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS.pill,
    backgroundColor: COLORS.neutral.grey100,
  },
  chipActive: {
    backgroundColor: COLORS.primary.main,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text.secondary,
  },
  chipTextActive: {
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.screen.horizontal,
    paddingTop: 28,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text.tertiary,
  },
  applyButton: {
    backgroundColor: COLORS.primary.main,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: 12,
    paddingHorizontal: 40,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.cta,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.neutral.white,
  },
});

export default FilterDropdown;
