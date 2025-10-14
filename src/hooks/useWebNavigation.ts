// 웹용 간단한 네비게이션 훅
export const useTypedNavigation = () => {
  return {
    navigate: (screen: string, params?: any) => {
      console.log(`Navigate to ${screen}`, params);
      // 웹에서는 간단히 로그만 출력
    },
    navigateToHome: () => console.log('Navigate to Home'),
    navigateToSearch: (params?: any) => {
      console.log('Navigate to Search', params);
      alert('탐색 페이지로 이동!');
    },
    navigateToChat: (params?: any) => console.log('Navigate to Chat', params),
    navigateToMyPage: () => console.log('Navigate to MyPage'),
    goBack: () => console.log('Go back'),
  };
};