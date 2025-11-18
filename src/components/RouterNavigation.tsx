import { useNavigate } from 'react-router-dom';

// React Router 네비게이션을 React Native 스타일로 래핑하는 훅
export const useRouterNavigation = () => {
  const navigate = useNavigate();

  return {
    navigate: (screen: string, params?: any) => {
      switch (screen) {
        case 'Home':
          navigate('/home');
          break;
        case 'Search':
          navigate('/search');
          break;
        case 'Chat':
          navigate('/chat');
          break;
        case 'MyPage':
          navigate('/mypage');
          break;
        case 'Login':
          navigate('/login');
          break;
        case 'CreateMeetup':
          navigate('/create-meetup');
          break;
        case 'MeetupDetail':
          navigate(`/meetup/${params?.meetupId}`);
          break;
        case 'MeetupList':
          navigate('/meetup-list');
          break;
        case 'ChatRoom':
          const title = params?.meetupTitle ? `?title=${encodeURIComponent(params.meetupTitle)}` : '';
          navigate(`/chat/${params?.meetupId}${title}`);
          break;
        default:
          console.warn(`Unknown screen: ${screen}`);
      }
    },
    goBack: () => {
      navigate(-1);
    },
    navigateToSearch: () => {
      navigate('/search');
    },
    logout: () => {
      // 로그아웃 로직은 상위 컴포넌트에서 처리
      navigate('/login');
    }
  };
};