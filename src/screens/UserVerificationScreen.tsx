import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';

const UserVerificationScreen = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    bio: '',
    interests: [] as string[],
    phoneNumber: '',
  });

  const interestOptions = [
    '한식', '중식', '일식', '양식', '카페', '술집',
    '맛집탐방', '요리', '와인', '전통주', '디저트', '건강식'
  ];

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!formData.name || !formData.age) {
        Alert.alert('오류', '이름과 나이를 입력해주세요.');
        return;
      }
    } else if (step === 2) {
      if (formData.interests.length === 0) {
        Alert.alert('오류', '관심사를 하나 이상 선택해주세요.');
        return;
      }
    } else if (step === 3) {
      if (!formData.phoneNumber) {
        Alert.alert('오류', '전화번호를 입력해주세요.');
        return;
      }
    }

    if (step < 4) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    Alert.alert(
      '인증 신청 완료',
      '회원 인증 신청이 완료되었습니다.\n검토 후 24시간 내에 결과를 알려드립니다.',
      [{ text: '확인' }]
    );
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>기본 정보 입력</Text>
      <Text style={styles.stepDescription}>
        안전한 약속을 위해 기본 정보를 입력해주세요
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>이름 *</Text>
        <TextInput
          style={styles.input}
          placeholder="실명을 입력해주세요"
          value={formData.name}
          onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>나이 *</Text>
        <TextInput
          style={styles.input}
          placeholder="만 나이를 입력해주세요"
          value={formData.age}
          onChangeText={(text) => setFormData(prev => ({ ...prev, age: text }))}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>자기소개</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="간단한 자기소개를 작성해주세요 (선택사항)"
          value={formData.bio}
          onChangeText={(text) => setFormData(prev => ({ ...prev, bio: text }))}
          multiline
          numberOfLines={3}
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>관심사 선택</Text>
      <Text style={styles.stepDescription}>
        관심 있는 음식 종류나 취향을 선택해주세요
      </Text>

      <View style={styles.interestGrid}>
        {interestOptions.map((interest) => (
          <TouchableOpacity
            key={interest}
            style={[
              styles.interestItem,
              formData.interests.includes(interest) && styles.selectedInterest
            ]}
            onPress={() => handleInterestToggle(interest)}
          >
            <Text style={[
              styles.interestText,
              formData.interests.includes(interest) && styles.selectedInterestText
            ]}>
              {interest}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.selectedCount}>
        선택된 관심사: {formData.interests.length}개
      </Text>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>전화번호 인증</Text>
      <Text style={styles.stepDescription}>
        안전한 약속을 위해 전화번호 인증이 필요합니다
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>전화번호 *</Text>
        <TextInput
          style={styles.input}
          placeholder="010-1234-5678"
          value={formData.phoneNumber}
          onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
          keyboardType="phone-pad"
        />
      </View>

      <TouchableOpacity style={styles.verifyButton}>
        <Text style={styles.verifyButtonText}>인증번호 발송</Text>
      </TouchableOpacity>

      <View style={styles.safetyNotice}>
        <Text style={styles.safetyTitle}>🛡️ 개인정보 보호</Text>
        <Text style={styles.safetyText}>
          • 전화번호는 인증 목적으로만 사용됩니다{'\n'}
          • 다른 사용자에게 공개되지 않습니다{'\n'}
          • 언제든지 계정 삭제 시 함께 삭제됩니다
        </Text>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>인증 완료</Text>
      <Text style={styles.stepDescription}>
        모든 정보가 입력되었습니다. 최종 확인해주세요.
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>입력된 정보</Text>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>이름:</Text>
          <Text style={styles.summaryValue}>{formData.name}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>나이:</Text>
          <Text style={styles.summaryValue}>{formData.age}세</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>관심사:</Text>
          <Text style={styles.summaryValue}>
            {formData.interests.join(', ')}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>전화번호:</Text>
          <Text style={styles.summaryValue}>{formData.phoneNumber}</Text>
        </View>
      </View>

      <View style={styles.termsNotice}>
        <Text style={styles.termsTitle}>⚖️ 이용 약관 동의</Text>
        <Text style={styles.termsText}>
          • 잇테이블 서비스 이용약관{'\n'}
          • 개인정보처리방침{'\n'}
          • 위치기반서비스 이용약관
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>회원 인증</Text>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4].map((stepNumber) => (
            <View
              key={stepNumber}
              style={[
                styles.progressStep,
                step >= stepNumber && styles.activeProgressStep
              ]}
            />
          ))}
        </View>
        <Text style={styles.progressText}>
          {step}/4 단계
        </Text>
      </View>

      <ScrollView style={styles.content}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {step > 1 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setStep(step - 1)}
          >
            <Text style={styles.backButtonText}>이전</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 1 && styles.fullWidthButton]}
          onPress={handleNextStep}
        >
          <Text style={styles.nextButtonText}>
            {step === 4 ? '인증 신청' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.neutral.background,
  },
  header: {
    backgroundColor: COLORS.neutral.white,
    padding: 20,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 16,
  },
  progressBar: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.neutral.grey300,
    marginHorizontal: 2,
    borderRadius: 2,
  },
  activeProgressStep: {
    backgroundColor: COLORS.primary.main,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 14,
    color: COLORS.text.secondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.neutral.white,
    ...SHADOWS.small,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  interestGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  interestItem: {
    backgroundColor: COLORS.neutral.white,
    borderWidth: 2,
    borderColor: COLORS.neutral.grey300,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...SHADOWS.small,
  },
  selectedInterest: {
    borderColor: COLORS.primary.accent,
    backgroundColor: COLORS.primary.light,
  },
  interestText: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '500',
  },
  selectedInterestText: {
    color: COLORS.primary.dark,
    fontWeight: '700',
  },
  selectedCount: {
    fontSize: 14,
    color: COLORS.text.secondary,
    textAlign: 'center',
  },
  verifyButton: {
    backgroundColor: COLORS.primary.accent,
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  verifyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.neutral.white,
  },
  safetyNotice: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.accent,
  },
  safetyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  safetyText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  summaryCard: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    ...SHADOWS.small,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.text.secondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: COLORS.text.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  termsNotice: {
    backgroundColor: COLORS.secondary.light,
    borderRadius: 8,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary.accent,
  },
  termsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.primary,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 14,
    color: COLORS.text.secondary,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: COLORS.neutral.grey200,
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text.primary,
  },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primary.accent,
    borderRadius: 6,
    padding: 16,
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  fullWidthButton: {
    flex: 1,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text.white,
  },
});

export default UserVerificationScreen;