import React from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { Icon } from './Icon';
import { COLORS } from '../styles/colors';
import type { IconName } from './SimpleIcon';

interface CategoryIconProps {
  iconName: IconName;
  image?: any;
  size?: number;
  color?: string;
  backgroundColor?: string;
}

const CategoryIcon: React.FC<CategoryIconProps> = ({
  iconName,
  image,
  size = 40,
  color = COLORS.primary.main,
  backgroundColor = COLORS.primary.light,
}) => {
  if (image) {
    const borderRadius = size * 0.24;

    // 웹: file-loader가 문자열 경로 반환 → <img> 태그 직접 사용
    if (Platform.OS === 'web') {
      const src = typeof image === 'string' ? image : (image?.default || image?.uri || image);
      return (
        <div style={{
          width: size,
          height: size,
          borderRadius,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <img
            src={src}
            alt=""
            style={{
              width: size,
              height: size,
              borderRadius,
              objectFit: 'cover',
            }}
          />
        </div>
      );
    }

    // 네이티브: require() 숫자 반환 → Image 컴포넌트
    return (
      <View
        style={[
          styles.container,
          { width: size, height: size, borderRadius, backgroundColor: 'transparent' },
        ]}
      >
        <Image
          source={image}
          style={{ width: size, height: size, borderRadius }}
          resizeMode="cover"
        />
      </View>
    );
  }

  // 폴백: Lucide 아이콘
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2, backgroundColor },
      ]}
    >
      <Icon name={iconName} size={size * 0.5} color={color} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});

export default CategoryIcon;
