import React, { useState } from 'react';
import { COLORS } from '../styles/colors';

// 기본 프로필 이미지 컴포넌트
const DefaultProfileImage: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <div 
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #F5F5DC 0%, #E6E6DC 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      border: '2px solid #EEEEEE',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    }}
  >
    <span style={{
      fontSize: size * 0.4,
      color: '#8B4513'
    }}>🍚</span>
  </div>
);

interface ProfileImageProps {
  profileImage?: string | null;
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const ProfileImage: React.FC<ProfileImageProps> = ({
  profileImage,
  name,
  size = 40,
  className,
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
    <img
      src={imageUrl}
      alt={`${name} 프로필`}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: COLORS.neutral.light,
        objectFit: 'cover',
        display: 'block',
        ...style
      }}
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

export default ProfileImage;