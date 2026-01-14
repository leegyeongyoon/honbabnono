import React from 'react';
import UniversalCreateMeetupWizard from '../components/shared/UniversalCreateMeetupWizard';
// import { DateTimePickerModal } from "react-native-modal-datetime-picker";
// import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';

interface CreateMeetupWizardProps {
  navigation: any;
  user?: any;
  onClose?: () => void;
}

// Native Date Time Picker Component (Temporary placeholder)
const NativeDateTimePicker: React.FC<any> = ({ visible, mode, value, onConfirm, onCancel }) => {
  if (!visible) return null;
  
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

// Native Map Component (Temporary placeholder until react-native-maps is properly configured)
const NativeMap: React.FC<any> = ({ onLocationSelect }) => {
  const handleLocationSelect = () => {
    // Default Seoul location
    onLocationSelect({
      latitude: 37.5665,
      longitude: 126.9780,
      address: '서울특별시 중구 을지로 (기본 위치)',
    });
  };

  return (
    <View style={styles.mapPlaceholder}>
      <Text style={styles.mapPlaceholderText}>지도 위치 선택</Text>
      <Text style={styles.mapPlaceholderSubtext}>
        react-native-maps 설정 중...
      </Text>
      <TouchableOpacity 
        style={styles.selectLocationButton}
        onPress={handleLocationSelect}
      >
        <Text style={styles.selectLocationButtonText}>기본 위치 선택</Text>
      </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  selectLocationButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  selectLocationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePickerPlaceholder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  datePickerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  datePickerSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  datePickerButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default CreateMeetupWizard;