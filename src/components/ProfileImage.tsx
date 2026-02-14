import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';
import { COLORS } from '../styles/colors';

// 기본 프로필 이미지 컴포넌트
const DefaultProfileImage: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <View 
    style={[
      styles.defaultImage,
      {
        width: size,
        height: size,
        borderRadius: size / 2,
      }
    ]}
  >
    <Text style={{
      fontSize: size * 0.4,
      color: '#8B4513'
    }}>🍚</Text>
  </View>
);

interface ProfileImageProps {
  profileImage?: string | null;
  name: string;
  size?: number;
  style?: ViewStyle | ImageStyle;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
  profileImage,
  name,
  size = 40,
  style
}) => {
  const [imageError, setImageError] = useState(false);

  // 디버깅을 위한 로그
  console.log('🖼️ ProfileImage 렌더링:', {
    name,
    profileImage,
    imageError,
    hasProfileImage: !!profileImage,
    profileImageType: typeof profileImage,
    profileImageLength: profileImage?.length
  });


  if (!profileImage || imageError) {
    console.log('🔄 기본 이미지 사용:', { profileImage, imageError });
    return <DefaultProfileImage size={size} />;
  }

  const imageUrl = profileImage.startsWith('http') 
    ? `${profileImage}?t=${Date.now()}` 
    : `http://localhost:3001${profileImage}?t=${Date.now()}`;
  
  console.log('🎯 실제 이미지 URL:', imageUrl);
  
  return (
    <Image
      source={{ uri: imageUrl }}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.neutral.light,
        },
        style as ImageStyle
      ]}
      resizeMode="cover"
      onLoad={() => {
        console.log('✅ 프로필 이미지 로드 성공:', name, imageUrl);
      }}
      onError={() => {
        console.log('❌ 프로필 이미지 로드 실패:', name, imageUrl);
        setImageError(true);
      }}
    />
  );
};

const styles = StyleSheet.create({
  defaultImage: {
    backgroundColor: COLORS.primary.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.neutral.grey100,
    shadowColor: COLORS.neutral.black,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
});

export default ProfileImage;