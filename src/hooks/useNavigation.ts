import {useNavigation as useRNNavigation} from '@react-navigation/native';
import {BottomTabNavigationProp} from '@react-navigation/bottom-tabs';
import {RootTabParamList} from '../types/navigation';

export type NavigationProp = BottomTabNavigationProp<RootTabParamList>;

export const useNavigation = () => {
  return useRNNavigation<NavigationProp>();
};

export const useTypedNavigation = () => {
  const navigation = useNavigation();
  
  return {
    ...navigation,
    navigateToHome: () => navigation.navigate('Home'),
    navigateToSearch: (params?: RootTabParamList['Search']) => 
      navigation.navigate('Search', params),
    navigateToChat: (params?: RootTabParamList['Chat']) => 
      navigation.navigate('Chat', params),
    navigateToMyPage: () => navigation.navigate('MyPage'),
  };
};