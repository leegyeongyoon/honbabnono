import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS, TRANSITIONS, CSS_SHADOWS } from '../styles/colors';
import { BORDER_RADIUS, SPACING } from '../styles/spacing';
import { FOOD_CATEGORIES } from '../constants/categories';

interface CategoryTabBarProps {
  selectedCategory: string | null;
  onCategoryChange: (category: string | null) => void;
}

const CategoryTabBar: React.FC<CategoryTabBarProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          backgroundColor: COLORS.neutral.white,
          borderBottom: `1px solid ${COLORS.neutral.grey100}`,
          paddingTop: 12,
          paddingBottom: 14,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            overflowX: 'auto',
            paddingLeft: 20,
            paddingRight: 12,
            gap: 6,
            scrollbarWidth: 'none',
          }}
        >
          <WebCategoryItem
            name="전체"
            image={null}
            color={COLORS.primary.main}
            isActive={!selectedCategory}
            onPress={() => onCategoryChange(null)}
          />
          {FOOD_CATEGORIES.map((cat) => (
            <WebCategoryItem
              key={cat.id}
              name={cat.name}
              image={cat.image}
              color={cat.color}
              isActive={selectedCategory === cat.name}
              onPress={() => onCategoryChange(cat.name)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[styles.item, !selectedCategory && styles.itemActive]}
          onPress={() => onCategoryChange(null)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconCircle, { backgroundColor: COLORS.primary.light }]}>
            <Text style={styles.allIcon}>ALL</Text>
          </View>
          <Text style={[styles.label, !selectedCategory && styles.labelActive]}>전체</Text>
        </TouchableOpacity>
        {FOOD_CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.name;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.item, isActive && styles.itemActive]}
              onPress={() => onCategoryChange(cat.name)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: cat.bgColor }]}>
                <Text style={styles.categoryEmoji}>{cat.icon === 'flame' ? '🔥' : '🍽'}</Text>
              </View>
              <Text style={[styles.label, isActive && styles.labelActive]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const WebCategoryItem: React.FC<{
  name: string;
  image: string | null;
  color: string;
  isActive: boolean;
  onPress: () => void;
}> = ({ name, image, color, isActive, onPress }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
        minWidth: 64,
        padding: '4px 6px',
        cursor: 'pointer',
        userSelect: 'none',
        borderRadius: 12,
        transition: `background-color ${TRANSITIONS.fast}`,
        backgroundColor: hovered ? COLORS.neutral.grey50 : 'transparent',
      }}
    >
      {/* Image circle */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isActive
            ? `2.5px solid ${COLORS.primary.main}`
            : `1.5px solid ${COLORS.neutral.grey100}`,
          transition: `border-color ${TRANSITIONS.normal}, transform ${TRANSITIONS.normal}, box-shadow ${TRANSITIONS.normal}`,
          transform: isActive || hovered ? 'scale(1.05)' : 'scale(1)',
          boxShadow: isActive ? CSS_SHADOWS.focused : 'none',
          backgroundColor: COLORS.neutral.grey50,
        }}
      >
        {image ? (
          <img
            src={image}
            alt={name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <span style={{ fontSize: 20, lineHeight: '52px' }}>🍽</span>
        )}
      </div>
      {/* Label */}
      <span
        style={{
          fontSize: 12,
          fontWeight: isActive ? 700 : 500,
          color: isActive ? COLORS.primary.main : COLORS.text.secondary,
          letterSpacing: -0.1,
          whiteSpace: 'nowrap',
          transition: `color ${TRANSITIONS.normal}, font-weight ${TRANSITIONS.normal}`,
        }}
      >
        {name}
      </span>
    </div>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.neutral.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
    paddingVertical: 12,
  },
  scrollContent: {
    paddingLeft: SPACING.screen.horizontal,
    paddingRight: SPACING.md,
    gap: 6,
  },
  item: {
    alignItems: 'center',
    gap: 6,
    minWidth: 64,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  itemActive: {},
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.neutral.grey100,
  },
  allIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary.main,
  },
  categoryEmoji: {
    fontSize: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.text.secondary,
    letterSpacing: -0.1,
  },
  labelActive: {
    fontWeight: '700',
    color: COLORS.primary.main,
  },
});

export default CategoryTabBar;
