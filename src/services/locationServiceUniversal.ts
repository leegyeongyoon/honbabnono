// Universal Location Service
import { Platform } from 'react-native';

// Dynamic import based on platform
const getLocationService = () => {
  if (Platform.OS === 'web') {
    // For web, use the browser-based location service
    return require('./locationService').default;
  } else {
    // For native platforms, use the React Native location service
    return require('./locationServiceNative').default;
  }
};

// Export the appropriate service based on platform
const locationService = getLocationService();
export default locationService;
export { locationService };