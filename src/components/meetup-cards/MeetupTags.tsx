import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../styles/colors';
import { BORDER_RADIUS } from '../../styles/spacing';
import { getCategoryByName } from '../../constants/categories';
import type { Meetup, TagSize, UrgencyInfo } from './types';
import { getUrgencyInfo } from './types';

interface MeetupTagsProps {
  meetup: Meetup;
  size: TagSize;
  maxTags: number;
}

interface TagDef {
  key: string;
  label: string;
  style: object;
  textStyle: object;
}

const GENDER_EXCLUDE = ['무관', '상관없음', '혼성'];
const AGE_EXCLUDE = ['무관', '상관없음'];

const buildTags = (meetup: Meetup, size: TagSize): TagDef[] => {
  const s = SIZE_MAP[size];
  const tags: TagDef[] = [];

  // 1. 카테고리
  const cat = getCategoryByName(meetup.category);
  tags.push({
    key: 'category',
    label: meetup.category,
    style: {
      ...s.container,
      backgroundColor: cat?.color ?? COLORS.primary.main,
    },
    textStyle: { ...s.text, color: COLORS.text.white, fontWeight: '600' as const },
  });

  // 2. 긴급
  const urgency: UrgencyInfo | null =
    meetup.status === 'recruiting'
      ? getUrgencyInfo(meetup.date, meetup.time, meetup.currentParticipants, meetup.maxParticipants)
      : null;
  if (urgency) {
    tags.push({
      key: 'urgency',
      label: urgency.label,
      style: { ...s.container, backgroundColor: urgency.color },
      textStyle: { ...s.text, color: COLORS.text.white, fontWeight: '700' as const },
    });
  }

  // 3. 성별
  if (meetup.genderPreference && !GENDER_EXCLUDE.includes(meetup.genderPreference)) {
    tags.push({
      key: 'gender',
      label: meetup.genderPreference,
      style: {
        ...s.container,
        backgroundColor: '#FFF0F5',
        borderWidth: 1,
        borderColor: 'rgba(219,112,147,0.15)',
      },
      textStyle: { ...s.text, color: '#C7254E', fontWeight: '500' as const },
    });
  }

  // 4. 나이
  if (meetup.ageRange && !AGE_EXCLUDE.includes(meetup.ageRange)) {
    tags.push({
      key: 'age',
      label: meetup.ageRange,
      style: {
        ...s.container,
        backgroundColor: COLORS.functional.infoLight,
        borderWidth: 1,
        borderColor: 'rgba(17,17,17,0.06)',
      },
      textStyle: { ...s.text, color: COLORS.functional.info, fontWeight: '500' as const },
    });
  }

  // 5. 가격
  if (meetup.priceRange) {
    tags.push({
      key: 'price',
      label: meetup.priceRange,
      style: {
        ...s.container,
        backgroundColor: COLORS.neutral.light,
        borderWidth: 1,
        borderColor: COLORS.neutral.grey100,
      },
      textStyle: { ...s.text, color: COLORS.text.secondary, fontWeight: '500' as const },
    });
  }

  // 6. 보증금
  if (meetup.promiseDepositAmount) {
    tags.push({
      key: 'deposit',
      label: `보증금 ${meetup.promiseDepositAmount.toLocaleString()}원`,
      style: {
        ...s.container,
        backgroundColor: COLORS.functional.successLight,
        borderWidth: 1,
        borderColor: 'rgba(61, 139, 94, 0.1)',
      },
      textStyle: { ...s.text, color: COLORS.special.deposit, fontWeight: '600' as const },
    });
  }

  return tags;
};

const SIZE_MAP = {
  sm: {
    container: {
      minHeight: 18,
      paddingHorizontal: 5,
      paddingVertical: 1,
      borderRadius: BORDER_RADIUS.sm,
      justifyContent: 'center' as const,
    },
    text: { fontSize: 9 },
    gap: 3,
  },
  md: {
    container: {
      minHeight: 24,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: BORDER_RADIUS.sm,
      justifyContent: 'center' as const,
    },
    text: { fontSize: 11 },
    gap: 4,
  },
};

const MeetupTags: React.FC<MeetupTagsProps> = ({ meetup, size, maxTags }) => {
  const allTags = buildTags(meetup, size);
  const visible = allTags.slice(0, maxTags);
  const overflow = allTags.length - maxTags;

  return (
    <View style={[baseStyles.row, { gap: SIZE_MAP[size].gap }]}>
      {visible.map((tag) => (
        <View key={tag.key} style={tag.style}>
          <Text style={tag.textStyle}>{tag.label}</Text>
        </View>
      ))}
      {overflow > 0 && (
        <View style={[SIZE_MAP[size].container, baseStyles.overflowTag]}>
          <Text style={[SIZE_MAP[size].text, baseStyles.overflowText]}>+{overflow}</Text>
        </View>
      )}
    </View>
  );
};

const baseStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  overflowTag: {
    backgroundColor: COLORS.neutral.grey100,
  },
  overflowText: {
    color: COLORS.text.tertiary,
    fontWeight: '600',
  },
});

export default MeetupTags;
