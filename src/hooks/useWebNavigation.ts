// 웹용 간단한 네비게이션 훅
export const useTypedNavigation = () => {
  return {
    navigate: (screen: string, params?: any) => {
      // silently handle error
    },
    navigateToHome: () => {},
    navigateToSearch: (params?: any) => {
      alert('탐색 페이지로 이동!');
    },
    navigateToChat: (params?: any) => {},
    navigateToMyPage: () => {},
    goBack: () => {},
  };
};