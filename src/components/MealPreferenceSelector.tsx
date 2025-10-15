import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { 
  MealPreferences, 
  MealPreference, 
  MEAL_PREFERENCES, 
  getMealPreferencesByCategory 
} from '../types/mealPreferences';

interface MealPreferenceSelectorProps {
  selectedPreferences: MealPreferences;
  onPreferencesChange: (preferences: MealPreferences) => void;
  title?: string;
  compact?: boolean;
}

const MealPreferenceSelector: React.FC<MealPreferenceSelectorProps> = ({
  selectedPreferences,
  onPreferencesChange,
  title = "식사 성향",
  compact = false
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('dietary');

  const categories = [
    { id: 'dietary', name: '식이제한', emoji: '🥗' },
    { id: 'style', name: '식사스타일', emoji: '🍽️' },
    { id: 'restriction', name: '금기사항', emoji: '🚫' },
    { id: 'atmosphere', name: '분위기', emoji: '✨' },
  ];

  const handlePreferenceToggle = (category: keyof MealPreferences, preferenceId: string) => {
    const currentPrefs = selectedPreferences[category] || [];
    const newPrefs = currentPrefs.includes(preferenceId)
      ? currentPrefs.filter(id => id !== preferenceId)
      : [...currentPrefs, preferenceId];

    onPreferencesChange({
      ...selectedPreferences,
      [category]: newPrefs,
    });
  };

  const isSelected = (category: keyof MealPreferences, preferenceId: string) => {
    return selectedPreferences[category]?.includes(preferenceId) || false;
  };

  const renderPreferenceChip = (preference: MealPreference, category: keyof MealPreferences) => {
    const selected = isSelected(category, preference.id);
    
    return (
      <TouchableOpacity
        key={preference.id}
        style={[
          styles.preferenceChip,
          selected && styles.selectedChip,
          compact && styles.compactChip
        ]}
        onPress={() => handlePreferenceToggle(category, preference.id)}
      >
        <Text style={styles.preferenceEmoji}>{preference.emoji}</Text>
        <Text style={[
          styles.preferenceName,
          selected && styles.selectedText,
          compact && styles.compactText
        ]}>
          {preference.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderCategoryContent = () => {
    const categoryPreferences = getMealPreferencesByCategory(activeCategory);
    
    return (
      <View style={styles.preferencesGrid}>
        {categoryPreferences.map(preference => 
          renderPreferenceChip(preference, activeCategory as keyof MealPreferences)
        )}
      </View>
    );
  };

  if (compact) {
    // 컴팩트 모드: 선택된 항목들만 간단히 표시
    const allSelected = [
      ...selectedPreferences.dietary || [],
      ...selectedPreferences.style || [],
      ...selectedPreferences.restriction || [],
      ...selectedPreferences.atmosphere || []
    ];

    if (allSelected.length === 0) {
      return (
        <View style={styles.compactContainer}>
          <Text style={styles.compactTitle}>식사성향 미설정</Text>
        </View>
      );
    }

    return (
      <View style={styles.compactContainer}>
        <Text style={styles.compactTitle}>식사성향</Text>
        <View style={styles.compactChipsContainer}>
          {allSelected.slice(0, 3).map(prefId => {
            const preference = MEAL_PREFERENCES.find(p => p.id === prefId);
            return preference ? (
              <View key={prefId} style={styles.compactDisplayChip}>
                <Text style={styles.compactChipText}>
                  {preference.emoji} {preference.name}
                </Text>
              </View>
            ) : null;
          })}
          {allSelected.length > 3 && (
            <View style={styles.compactDisplayChip}>
              <Text style={styles.compactChipText}>+{allSelected.length - 3}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      {/* 카테고리 탭 */}
      <View style={styles.categoryTabs}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryTab,
              activeCategory === category.id && styles.activeCategoryTab
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={styles.categoryEmoji}>{category.emoji}</Text>
            <Text style={[
              styles.categoryName,
              activeCategory === category.id && styles.activeCategoryName
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 선택 영역 */}
      <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
        {renderCategoryContent()}
      </ScrollView>

      {/* 선택된 항목 요약 */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryTitle}>선택된 성향</Text>
        <View style={styles.summaryChips}>
          {Object.entries(selectedPreferences).map(([category, preferenceIds]) =>
            preferenceIds.map(prefId => {
              const preference = MEAL_PREFERENCES.find(p => p.id === prefId);
              return preference ? (
                <View key={prefId} style={styles.summaryChip}>
                  <Text style={styles.summaryChipText}>
                    {preference.emoji} {preference.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => handlePreferenceToggle(category as keyof MealPreferences, prefId)}
                  >
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                </View>
              ) : null;
            })
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  categoryTabs: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 8,
    padding: 4,
  },
  categoryTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  activeCategoryTab: {
    backgroundColor: COLORS.primary.main,
  },
  categoryEmoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  categoryName: {
    fontSize: 12,
    color: COLORS.text.secondary,
  },
  activeCategoryName: {
    color: COLORS.text.white,
    fontWeight: '600',
  },
  contentArea: {
    maxHeight: 200,
    marginBottom: 16,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preferenceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.grey100,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedChip: {
    backgroundColor: COLORS.primary.light,
    borderColor: COLORS.primary.main,
  },
  compactChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  preferenceEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  preferenceName: {
    fontSize: 14,
    color: COLORS.text.primary,
  },
  selectedText: {
    color: COLORS.primary.dark,
    fontWeight: '600',
  },
  compactText: {
    fontSize: 12,
  },
  summarySection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral.grey200,
    paddingTop: 12,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  summaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary.light,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  summaryChipText: {
    fontSize: 12,
    color: COLORS.text.primary,
    marginRight: 4,
  },
  removeButton: {
    fontSize: 16,
    color: COLORS.text.secondary,
    fontWeight: 'bold',
  },
  // 컴팩트 모드 스타일
  compactContainer: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 12,
    ...SHADOWS.small,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 6,
  },
  compactChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  compactDisplayChip: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  compactChipText: {
    fontSize: 11,
    color: COLORS.text.primary,
  },
});

export default MealPreferenceSelector;