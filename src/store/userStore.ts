import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import storage from '../utils/storage';

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  provider: string;
  isVerified: boolean;
  gender?: string;
  babAlScore: number; // 밥알지수 (0-100)
  meetupsHosted: number;
  meetupsJoined: number;
  rating: number; // 평점 (1-5)
  createdAt: string;
  neighborhood?: {
    district: string;
    neighborhood: string;
    latitude?: number;
    longitude?: number;
    radius?: number; // 검색 반경 (미터)
  };
}

interface UserState {
  // State
  user: User | null;
  isLoggedIn: boolean;
  token: string | null;
  
  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  updateBabAlScore: (score: number) => void;
  updateUserStats: (stats: Partial<Pick<User, 'meetupsHosted' | 'meetupsJoined' | 'rating'>>) => void;
  updateNeighborhood: (district: string, neighborhood: string, latitude?: number, longitude?: number, radius?: number) => void;
  updateProfile: (profileData: { name?: string; profileImage?: string; bio?: string }) => void;
  
  // API Actions
  fetchUserProfile: () => Promise<void>;
  calculateBabAlScore: () => number;
}

// 밥알지수 계산 로직
const calculateBabAlFromStats = (user: User): number => {
  if (!user) {return 0;}
  
  // 기본 점수 (20점)
  let score = 20;
  
  // 모임 참여 점수 (최대 30점)
  score += Math.min(user.meetupsJoined * 2, 30);
  
  // 모임 주최 점수 (최대 25점)
  score += Math.min(user.meetupsHosted * 5, 25);
  
  // 평점 점수 (최대 25점)
  score += Math.min((user.rating - 1) * 6.25, 25);
  
  return Math.min(Math.round(score), 100);
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isLoggedIn: false,
      token: null,
      
      // Actions
      setUser: async (user: User) => {
        set({ user, isLoggedIn: true });
        
        // storage에도 저장
        try {
          await storage.setObject('user', user);
        } catch (error) {
          // silently handle error
        }
      },
      
      setToken: (token: string) => set({ token }),
      
      login: async (user: User, token: string) => {
        const babAlScore = calculateBabAlFromStats(user);
        const updatedUser = { ...user, babAlScore };

        // 즉시 로그인 상태 설정 (API 호출 전에)
        set({
          user: updatedUser,
          token,
          isLoggedIn: true
        });

        // 토큰을 storage에 저장
        try {
          await storage.setItem('token', token);
          await storage.setObject('user', updatedUser);
        } catch (error) {
          // silently handle error
        }

        // DB에서 실제 밥알지수 가져오기 (비동기, 논블로킹)
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/user/rice-index`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });

          if (response.ok) {
            const riceData = await response.json();
            if (riceData.riceIndex !== undefined) {
              set((state) => ({
                user: state.user ? { ...state.user, babAlScore: riceData.riceIndex } : null
              }));
            }
          }
        } catch (error) {
          // silently handle error - use calculated value
        }
      },
      
      logout: async () => {
        set({ 
          user: null, 
          token: null, 
          isLoggedIn: false 
        });
        
        // storage에서 제거 (브라우저/React Native 호환성)
        try {
          await storage.removeItem('token');
          await storage.removeItem('user');
        } catch (error) {
          // silently handle error
        }
      },
      
      updateBabAlScore: (score: number) => set((state) => ({
        user: state.user ? { ...state.user, babAlScore: score } : null
      })),
      
      updateUserStats: (stats) => set((state) => {
        if (!state.user) {return state;}
        
        const updatedUser = { ...state.user, ...stats };
        const newBabAlScore = calculateBabAlFromStats(updatedUser);
        
        return {
          user: { ...updatedUser, babAlScore: newBabAlScore }
        };
      }),

      updateNeighborhood: (district, neighborhood, latitude?, longitude?, radius?) => set((state) => ({
        user: state.user ? {
          ...state.user,
          neighborhood: { district, neighborhood, latitude, longitude, radius }
        } : null
      })),

      updateProfile: (profileData) => set((state) => ({
        user: state.user ? { 
          ...state.user, 
          ...profileData
        } : null
      })),
      
      calculateBabAlScore: () => {
        const { user } = get();
        return user ? calculateBabAlFromStats(user) : 0;
      },
      
      fetchUserProfile: async () => {
        const { token } = get();
        if (!token) {return;}
        
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
          
          // 프로필 정보와 밥알지수를 동시에 가져오기
          const [profileResponse, riceIndexResponse] = await Promise.all([
            fetch(`${apiUrl}/auth/profile`, {
              headers: { 'Authorization': `Bearer ${token}` },
            }),
            fetch(`${apiUrl}/user/rice-index`, {
              headers: { 'Authorization': `Bearer ${token}` },
            })
          ]);
          
          if (profileResponse.ok) {
            const profileJson = await profileResponse.json();
            const userData = profileJson.data || profileJson;
            let babAlScore = calculateBabAlFromStats(userData); // 기본값

            // DB에서 가져온 밥알지수가 있으면 우선 사용
            if (riceIndexResponse.ok) {
              const riceData = await riceIndexResponse.json();
              if (riceData.riceIndex !== undefined) {
                babAlScore = riceData.riceIndex;
              }
            }

            const updatedUser = { ...userData, babAlScore };
            set({ user: updatedUser });
          }
        } catch (error) {
          // silently handle error
        }
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => {
        // React Native의 AsyncStorage 또는 웹의 localStorage 사용
        if (typeof window !== 'undefined' && window.localStorage) {
          return localStorage;
        }
        // React Native용 AsyncStorage 사용
        return AsyncStorage;
      }),
    }
  )
);