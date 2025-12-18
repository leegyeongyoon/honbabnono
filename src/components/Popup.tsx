import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { Icon } from './Icon';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface PopupButton {
  text: string;
  style?: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
}

interface PopupProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  buttons?: PopupButton[];
  showCloseButton?: boolean;
  backdrop?: boolean;
  animation?: 'fade' | 'slide' | 'scale';
}

const Popup: React.FC<PopupProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  buttons,
  showCloseButton = true,
  backdrop = true,
  animation = 'scale'
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.8));
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  useEffect(() => {
    if (visible) {
      showPopup();
    } else {
      hidePopup();
    }
  }, [visible]);

  const showPopup = () => {
    switch (animation) {
      case 'scale':
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        break;
      case 'slide':
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
        break;
      default:
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
    }
  };

  const hidePopup = () => {
    switch (animation) {
      case 'scale':
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        break;
      case 'slide':
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: screenHeight,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
        break;
      default:
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
    }
  };

  const getTypeStyle = () => {
    switch (type) {
      case 'success':
        return {
          iconName: 'check-circle' as const,
          iconColor: COLORS.functional.success,
          titleColor: COLORS.functional.success,
        };
      case 'error':
        return {
          iconName: 'x-circle' as const,
          iconColor: COLORS.functional.error,
          titleColor: COLORS.functional.error,
        };
      case 'warning':
        return {
          iconName: 'alert-triangle' as const,
          iconColor: COLORS.functional.warning,
          titleColor: COLORS.functional.warning,
        };
      case 'info':
        return {
          iconName: 'info' as const,
          iconColor: COLORS.primary.main,
          titleColor: COLORS.primary.main,
        };
    }
  };

  const typeStyle = getTypeStyle();

  const getButtonStyle = (buttonType: string) => {
    switch (buttonType) {
      case 'primary':
        return {
          backgroundColor: COLORS.primary.main,
          textColor: COLORS.text.white,
        };
      case 'danger':
        return {
          backgroundColor: COLORS.functional.error,
          textColor: COLORS.text.white,
        };
      case 'secondary':
      default:
        return {
          backgroundColor: COLORS.neutral.grey200,
          textColor: COLORS.text.primary,
        };
    }
  };

  const defaultButtons: PopupButton[] = [
    {
      text: '확인',
      style: 'primary',
      onPress: onClose,
    },
  ];

  const popupButtons = buttons || defaultButtons;

  const getPopupTransform = () => {
    switch (animation) {
      case 'scale':
        return [{ scale: scaleAnim }];
      case 'slide':
        return [{ translateY: slideAnim }];
      default:
        return [];
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none">
      <TouchableWithoutFeedback onPress={backdrop ? onClose : undefined}>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback>
            <Animated.View 
              style={[
                styles.popup,
                {
                  transform: getPopupTransform()
                }
              ]}
            >
              {/* 헤더 */}
              <View style={styles.header}>
                <View style={styles.iconContainer}>
                  <Icon 
                    name={typeStyle.iconName} 
                    size={32} 
                    color={typeStyle.iconColor} 
                  />
                </View>
                
                {showCloseButton && (
                  <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                    <Icon name="x" size={20} color={COLORS.text.secondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* 내용 */}
              <View style={styles.content}>
                {title && (
                  <Text style={[styles.title, { color: typeStyle.titleColor }]}>
                    {title}
                  </Text>
                )}
                <Text style={styles.message}>{message}</Text>
              </View>

              {/* 버튼들 */}
              <View style={styles.buttonContainer}>
                {popupButtons.map((button, index) => {
                  const buttonStyle = getButtonStyle(button.style || 'secondary');
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        { backgroundColor: buttonStyle.backgroundColor },
                        popupButtons.length === 1 && styles.singleButton,
                        index === 0 && popupButtons.length > 1 && styles.firstButton,
                        index === popupButtons.length - 1 && popupButtons.length > 1 && styles.lastButton,
                      ]}
                      onPress={button.onPress}
                    >
                      <Text style={[styles.buttonText, { color: buttonStyle.textColor }]}>
                        {button.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: COLORS.neutral.white,
    borderRadius: 16,
    width: '100%',
    maxWidth: 320,
    ...SHADOWS.large,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 10,
  },
  iconContainer: {
    flex: 1,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.neutral.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: COLORS.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  singleButton: {
    flex: 1,
  },
  firstButton: {
    marginRight: 6,
  },
  lastButton: {
    marginLeft: 6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Popup;