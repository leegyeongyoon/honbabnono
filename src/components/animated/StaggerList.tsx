import React from 'react';
import { ViewStyle, StyleProp } from 'react-native';
import SlideUp from './SlideUp';
import { ANIMATION } from '../../utils/animations';

interface StaggerListProps {
  staggerDelay?: number;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const StaggerList: React.FC<StaggerListProps> = ({
  staggerDelay = ANIMATION.stagger.listItem,
  children,
  style,
}) => {
  return (
    <>
      {React.Children.map(children, (child, index) => (
        <SlideUp delay={index * staggerDelay} style={style}>
          {child}
        </SlideUp>
      ))}
    </>
  );
};

export default StaggerList;
