import React from 'react';
import UniversalKakaoMap from './UniversalKakaoMap';

interface KakaoMapPickerProps {
  visible: boolean;
  onClose: () => void;
  onLocationSelect: (location: {
    address: string;
    roadAddress: string;
    latitude: number;
    longitude: number;
    placeName?: string;
  }) => void;
  initialLocation?: {
    latitude: number;
    longitude: number;
  };
}

const KakaoMapPicker: React.FC<KakaoMapPickerProps> = ({
  visible,
  onClose,
  onLocationSelect,
  initialLocation = { latitude: 37.5665, longitude: 126.9780 } // 서울 시청 기본값
}) => {
  return (
    <UniversalKakaoMap
      visible={visible}
      onClose={onClose}
      onLocationSelect={onLocationSelect}
      initialLocation={initialLocation}
    />
  );
};


export default KakaoMapPicker;