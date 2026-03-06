import React, { useState } from 'react';
import UniversalCreateMeetupWizard from '../components/shared/UniversalCreateMeetupWizard';
// import { DateTimePickerModal } from "react-native-modal-datetime-picker";
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import NativeMapModal from '../components/NativeMapModal';
import { Icon } from '../components/Icon';
import { COLORS } from '../styles/colors';

interface CreateMeetupWizardProps {
  navigation: any;
  user?: any;
  onClose?: () => void;
}

// Native Date Time Picker Component (Temporary placeholder)
const NativeDateTimePicker: React.FC<any> = ({ visible, mode, value, onConfirm, onCancel }) => {
  if (!visible) {return null;}
  
  const handleConfirm = () => {
    const defaultDate = new Date();
    defaultDate.setHours(defaultDate.getHours() + 1); // 1시간 후 기본값
    onConfirm(defaultDate);
  };

  return (
    <View style={styles.datePickerPlaceholder}>
      <Text style={styles.datePickerText}>날짜/시간 선택</Text>
      <Text style={styles.datePickerSubtext}>DateTimePicker 설정 중...</Text>
      <View style={styles.datePickerButtons}>
        <TouchableOpacity style={styles.datePickerButton} onPress={handleConfirm}>
          <Text style={styles.datePickerButtonText}>기본 시간 선택</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.datePickerButton, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.datePickerButtonText}>취소</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Native Map Component - 카카오맵 연동
const NativeMap: React.FC<any> = ({ onLocationSelect, selectedLocation }) => {
  const [showMapModal, setShowMapModal] = useState(false);

  const handleMapLocationSelect = (district: string, neighborhood: string, lat: number, lng: number, address: string) => {
    const locationName = neighborhood ? `${district} ${neighborhood}` : district || address;
    onLocationSelect({
      latitude: lat,
      longitude: lng,
      address: address,
      location: locationName,
    });
    setShowMapModal(false);
  };

  return (
    <View style={styles.mapContainer}>
      {/* 선택된 위치 표시 */}
      {selectedLocation?.address ? (
        <View style={styles.selectedLocationBox}>
          <View style={styles.selectedLocationInfo}>
            <Text style={styles.selectedLocationIcon}>📍</Text>
            <View style={styles.selectedLocationTexts}>
              <Text style={styles.selectedLocationTitle}>
                {selectedLocation.location || selectedLocation.address}
              </Text>
              {selectedLocation.address && (
                <Text style={styles.selectedLocationAddress}>{selectedLocation.address}</Text>
              )}
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeLocationButton}
            onPress={() => setShowMapModal(true)}
          >
            <Text style={styles.changeLocationButtonText}>변경</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.openMapButton}
          onPress={() => setShowMapModal(true)}
        >
          <Icon name="map-pin" size={24} color={COLORS.primary.main} />
          <Text style={styles.openMapButtonText}>지도에서 위치 선택하기</Text>
          <Icon name="chevron-right" size={20} color={COLORS.text.secondary} />
        </TouchableOpacity>
      )}

      {/* 지도 모달 - 모임 생성용 (장소 검색) */}
      <NativeMapModal
        visible={showMapModal}
        onClose={() => setShowMapModal(false)}
        onLocationSelect={handleMapLocationSelect}
        mode="search"
      />
    </View>
  );
};

const CreateMeetupWizard: React.FC<CreateMeetupWizardProps> = ({ navigation, user, onClose }) => {
  return (
    <UniversalCreateMeetupWizard
      navigation={navigation}
      user={user}
      onCancel={onClose}
      NativeDateTimePicker={NativeDateTimePicker}
      NativeMap={NativeMap}
    />
  );
};

const styles = StyleSheet.create({
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.background,
    borderRadius: 8,
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  selectLocationButton: {
    backgroundColor: COLORS.primary.dark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectLocationButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '700',
  },
  datePickerPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.surface.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  datePickerSubtext: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerButton: {
    backgroundColor: COLORS.primary.dark,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: COLORS.functional.error,
  },
  datePickerButtonText: {
    color: COLORS.text.white,
    fontSize: 16,
    fontWeight: '700',
  },
  // 지도 컨테이너 스타일
  mapContainer: {
    flex: 1,
  },
  selectedLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral.background,
    borderWidth: 1,
    borderColor: COLORS.primary.main,
    borderRadius: 6,
    padding: 16,
  },
  selectedLocationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedLocationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  selectedLocationTexts: {
    flex: 1,
  },
  selectedLocationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  selectedLocationAddress: {
    fontSize: 13,
    color: COLORS.text.secondary,
  },
  changeLocationButton: {
    backgroundColor: COLORS.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 12,
  },
  changeLocationButtonText: {
    color: COLORS.text.white,
    fontSize: 14,
    fontWeight: '600',
  },
  openMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.neutral.white,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    borderRadius: 6,
    padding: 16,
  },
  openMapButtonText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text.primary,
    marginLeft: 12,
  },
});

export default CreateMeetupWizard;