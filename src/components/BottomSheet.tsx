import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Modal,
  Dimensions,
  PanResponder,
  Platform,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { SPACING, BORDER_RADIUS } from '../styles/spacing';
import { TYPOGRAPHY } from '../styles/typography';

const { height: screenHeight } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  snapPoints?: number[];
  initialSnap?: number;
  enableDragHandle?: boolean;
  enableBackdropDismiss?: boolean;
  title?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  snapPoints = [0.5],
  initialSnap = 0,
  enableDragHandle = true,
  enableBackdropDismiss = true,
  title,
  headerRight,
  children,
}) => {
  const translateY = useRef(new Animated.Value(screenHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const currentSnapIndex = useRef(initialSnap);

  const getSnapPosition = (index: number) => {
    const fraction = snapPoints[index] ?? snapPoints[0];
    return screenHeight * (1 - fraction);
  };

  useEffect(() => {
    if (visible) {
      translateY.setValue(screenHeight);
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: getSnapPosition(initialSnap),
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      currentSnapIndex.current = initialSnap;
    }
  }, [visible]);

  const animateClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const snapToIndex = (index: number) => {
    currentSnapIndex.current = index;
    Animated.spring(translateY, {
      toValue: getSnapPosition(index),
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const currentPos = getSnapPosition(currentSnapIndex.current);
        const newY = currentPos + gestureState.dy;
        const minY = getSnapPosition(snapPoints.length - 1);
        if (newY >= minY) {
          translateY.setValue(newY);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentPos = getSnapPosition(currentSnapIndex.current);
        const finalPos = currentPos + gestureState.dy;
        const dismissThreshold = screenHeight * 0.75;

        if (finalPos > dismissThreshold || gestureState.vy > 1.5) {
          animateClose();
          return;
        }

        let closestIndex = 0;
        let closestDistance = Math.abs(finalPos - getSnapPosition(0));

        for (let i = 1; i < snapPoints.length; i++) {
          const distance = Math.abs(finalPos - getSnapPosition(i));
          if (distance < closestDistance) {
            closestDistance = distance;
            closestIndex = i;
          }
        }

        snapToIndex(closestIndex);
      },
    })
  ).current;

  if (!visible) {
    return null;
  }

  const sheetContent = (
    <>
      <TouchableWithoutFeedback
        onPress={enableBackdropDismiss ? animateClose : undefined}
      >
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.contentContainer,
          { transform: [{ translateY }] },
        ]}
        {...(Platform.OS !== 'web' ? panResponder.panHandlers : {})}
        {...(Platform.OS === 'web'
          ? {
              onTouchStart: panResponder.panHandlers.onStartShouldSetResponder
                ? undefined
                : undefined,
            }
          : {})}
      >
        {enableDragHandle && (
          <View
            style={styles.dragHandleContainer}
            {...(Platform.OS === 'web' ? panResponder.panHandlers : {})}
          >
            <View style={styles.dragHandle} />
          </View>
        )}

        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            {headerRight && (
              <View style={styles.headerRight}>{headerRight}</View>
            )}
          </View>
        )}

        <View style={styles.body}>{children}</View>
      </Animated.View>
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOverlay}>
        {sheetContent}
      </View>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="none">
      <View style={styles.modalContainer}>{sheetContent}</View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  webOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  contentContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: screenHeight,
    backgroundColor: COLORS.neutral.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.large,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.neutral.grey200,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  title: {
    ...TYPOGRAPHY.heading.h3,
    textAlign: 'center',
  },
  headerRight: {
    position: 'absolute',
    right: SPACING.xl,
  },
  body: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
});

export default BottomSheet;
