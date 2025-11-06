import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  profileImage?: string;
  provider: string;
  isVerified: boolean;
  babAlScore: number; // 밥알지수 (0-100)
  meetupsHosted: number;
  meetupsJoined: number;
  rating: number; // 평점 (1-5)
  createdAt: string;
  neighborhood?: {
    district: string;
    neighborhood: string;
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
  logout: () => void;
  updateBabAlScore: (score: number) => void;
  updateUserStats: (stats: Partial<Pick<User, 'meetupsHosted' | 'meetupsJoined' | 'rating'>>) => void;
  updateNeighborhood: (district: string, neighborhood: string) => void;
  
  // API Actions
  fetchUserProfile: () => Promise<void>;
  calculateBabAlScore: () => number;
}

// 밥알지수 계산 로직
const calculateBabAlFromStats = (user: User): number => {
  if (!user) return 0;
  
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
      setUser: (user: User) => set({ user, isLoggedIn: true }),
      
      setToken: (token: string) => set({ token }),
      
      login: async (user: User, token: string) => {
        let babAlScore = calculateBabAlFromStats(user); // 기본값
        
        // DB에서 실제 밥알지수 가져오기 시도
        try {
          const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
          const response = await fetch(`${apiUrl}/user/rice-index`, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          
          if (response.ok) {
            const riceData = await response.json();
            if (riceData.success && riceData.riceIndex) {
              babAlScore = riceData.riceIndex;
            }
          }
        } catch (error) {
          console.warn('밥알지수 조회 실패, 계산값 사용:', error);
        }
        
        const updatedUser = { ...user, babAlScore };
        
        set({ 
          user: updatedUser, 
          token, 
          isLoggedIn: true 
        });
        
        // 토큰을 localStorage에도 저장 (브라우저 호환성)
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      },
      
      logout: () => {
        set({ 
          user: null, 
          token: null, 
          isLoggedIn: false 
        });
        
        // localStorage에서도 제거
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      },
      
      updateBabAlScore: (score: number) => set((state) => ({
        user: state.user ? { ...state.user, babAlScore: score } : null
      })),
      
      updateUserStats: (stats) => set((state) => {
        if (!state.user) return state;
        
        const updatedUser = { ...state.user, ...stats };
        const newBabAlScore = calculateBabAlFromStats(updatedUser);
        
        return {
          user: { ...updatedUser, babAlScore: newBabAlScore }
        };
      }),

      updateNeighborhood: (district, neighborhood) => set((state) => ({
        user: state.user ? { 
          ...state.user, 
          neighborhood: { district, neighborhood } 
        } : null
      })),
      
      calculateBabAlScore: () => {
        const { user } = get();
        return user ? calculateBabAlFromStats(user) : 0;
      },
      
      fetchUserProfile: async () => {
        const { token } = get();
        if (!token) return;
        
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
            const userData = await profileResponse.json();
            let babAlScore = calculateBabAlFromStats(userData); // 기본값
            
            // DB에서 가져온 밥알지수가 있으면 우선 사용
            if (riceIndexResponse.ok) {
              const riceData = await riceIndexResponse.json();
              if (riceData.success && riceData.riceIndex) {
                babAlScore = riceData.riceIndex;
              }
            }
            
            const updatedUser = { ...userData, babAlScore };
            set({ user: updatedUser });
          }
        } catch (error) {
          console.error('사용자 프로필 조회 실패:', error);
        }
      },
    }),
    {
      name: 'user-storage',
      storage: createJSONStorage(() => {
        // React Native의 AsyncStorage 또는 웹의 localStorage 사용
        if (typeof window !== 'undefined') {
          return localStorage;
        }
        // React Native용 AsyncStorage는 필요시 추가
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);