import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ViewStyle,
  ImageStyle,
  Platform,
} from 'react-native';
import { COLORS } from '../styles/colors';
import { getAvatarColor, getInitials } from '../utils/avatarColor';

// 기본 프로필 이미지 컴포넌트 — 컬러 이니셜 아바타
const DefaultProfileImage: React.FC<{ size?: number; name?: string }> = ({ size = 40, name = '' }) => {
  const bgColor = getAvatarColor(name);
  const initial = getInitials(name);
  const fontSize = Math.round(size * 0.4);

  return (
    <View
      style={[
        styles.defaultImage,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
          shadowColor: '#111111',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 2,
        }
      ]}
    >
      <Text style={{ fontSize, fontWeight: '700', color: '#FFFFFF' }}>
        {initial}
      </Text>
    </View>
  );
};

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
  const [imageLoaded, setImageLoaded] = useState(false);

  if (!profileImage || imageError) {
    return <DefaultProfileImage size={size} name={name} />;
  }

  const imageUrl = profileImage.startsWith('http')
    ? `${profileImage}?t=${Date.now()}`
    : `http://localhost:3001${profileImage}?t=${Date.now()}`;

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      {/* Show initials avatar as placeholder while image loads */}
      {!imageLoaded && (
        <View style={{ position: 'absolute', top: 0, left: 0, width: size, height: size, zIndex: 1 }}>
          <DefaultProfileImage size={size} name={name} />
        </View>
      )}
      {Platform.OS === 'web' ? (
        <img
          src={imageUrl}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            objectFit: 'cover',
            opacity: imageLoaded ? 1 : 0,
            transition: 'opacity 300ms ease',
          }}
          alt={name}
        />
      ) : (
        <Image
          source={{ uri: imageUrl }}
          style={[
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: COLORS.neutral.grey100,
              opacity: imageLoaded ? 1 : 0,
            },
            style as ImageStyle
          ]}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  defaultImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileImage;