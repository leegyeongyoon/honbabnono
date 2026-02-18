import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { COLORS, SHADOWS } from '../styles/colors';
import { locationService } from '../services/locationService';

interface AddressResult {
  type: 'place' | 'address';
  placeName: string;
  categoryName?: string;
  addressName: string;
  roadAddressName?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  placeUrl?: string;
  fullAddress: string;
  district: string;
  neighborhood: string;
}

interface AddressPickerProps {
  value?: string;
  onAddressSelect: (address: string, location?: { latitude: number; longitude: number }) => void;
  placeholder?: string;
  style?: any;
}

const AddressPicker: React.FC<AddressPickerProps> = ({
  value = '',
  onAddressSelect,
  placeholder = "예) 홍대입구역 9번 출구, 부산 서면",
  style,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState(value);

  // 디바운싱을 위한 타이머
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null);

  const searchAddress = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/search/address?query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.documents || []);
      setShowResults((data.documents || []).length > 0);
    } catch (_error) {
      setSearchResults([]);
      setShowResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // 디바운싱된 검색
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    
    // 이전 타이머 취소
    if (searchTimer) {
      clearTimeout(searchTimer);
    }

    // 새 타이머 설정 (500ms 후 검색)
    const timer = setTimeout(() => {
      searchAddress(text);
    }, 500);
    
    setSearchTimer(timer);
  };

  const handleAddressSelect = (result: AddressResult) => {
    const displayAddress = result.type === 'place' ? result.placeName : result.fullAddress;
    setSelectedAddress(displayAddress);
    setSearchQuery('');
    setShowResults(false);
    onAddressSelect(displayAddress, {
      latitude: result.latitude,
      longitude: result.longitude,
    });
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (searchTimer) {
        clearTimeout(searchTimer);
      }
    };
  }, [searchTimer]);

  const renderSearchResult = ({ item }: { item: AddressResult }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleAddressSelect(item)}
    >
      <Text style={styles.resultAddress}>
        {item.type === 'place' ? item.placeName : item.fullAddress}
      </Text>
      {item.categoryName && item.type === 'place' && (
        <Text style={styles.resultCategory}>{item.categoryName}</Text>
      )}
      <Text style={styles.resultDistrict}>
        {item.fullAddress}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          value={selectedAddress}
          onChangeText={(text) => {
            setSelectedAddress(text);
            handleSearchChange(text);
          }}
          onFocus={() => {
            if (searchQuery) {
              setShowResults(true);
            }
          }}
        />
        {isSearching && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={COLORS.primary.main} />
          </View>
        )}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item, index) => `${item.latitude}-${item.longitude}-${index}`}
            renderItem={renderSearchResult}
            style={styles.resultsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.primary.light,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: COLORS.neutral.white,
    color: COLORS.text.primary,
    ...SHADOWS.small,
  },
  loadingIndicator: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: COLORS.neutral.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.neutral.grey200,
    maxHeight: 200,
    zIndex: 1001,
    ...SHADOWS.medium,
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral.grey100,
  },
  resultAddress: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text.primary,
    marginBottom: 4,
  },
  resultDistrict: {
    fontSize: 14,
    color: COLORS.text.secondary,
  },
  resultCategory: {
    fontSize: 12,
    color: COLORS.primary.accent,
    marginBottom: 2,
    fontWeight: '500',
  },
});

export default AddressPicker;