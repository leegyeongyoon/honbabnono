import React, { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import UniversalAISearchResultScreen from '../components/shared/UniversalAISearchResultScreen';
import { COLORS } from '../styles/colors';

interface AISearchResultScreenProps {
  navigation: any;
  route?: any;
  user?: any;
}

// Animated Text Component for typewriter effect
const AnimatedText: React.FC<{ style: any; children: string }> = ({ style, children }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [children]);

  return (
    <Animated.View style={{ opacity: fadeAnim }}>
      <Text style={style}>{children}</Text>
    </Animated.View>
  );
};

// Gradient Text Component (Native implementation)
const GradientText: React.FC<{ style: any; children: string }> = ({ style, children }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => animate());
    };
    
    animate();
  }, []);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Text style={[style, { color: COLORS.primary.main }]}>{children}</Text>
    </Animated.View>
  );
};

const AISearchResultScreen: React.FC<AISearchResultScreenProps> = ({ 
  navigation, 
  route, 
  user 
}) => {
  // Extract route params
  const initialQuery = route?.params?.query || route?.params?.q || '';
  const autoSearch = route?.params?.autoSearch || false;

  const handleSearchResult = (_results: any) => {
    // Handle search results if needed (analytics, etc.)
  };

  return (
    <UniversalAISearchResultScreen
      navigation={navigation}
      user={user}
      initialQuery={initialQuery}
      autoSearch={autoSearch}
      AnimatedText={AnimatedText}
      GradientText={GradientText}
      onSearchResult={handleSearchResult}
    />
  );
};

export default AISearchResultScreen;