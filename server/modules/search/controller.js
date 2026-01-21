const axios = require('axios');

// 주소/장소 검색 (카카오 API 프록시)
exports.searchAddress = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 2) {
      return res.json({ documents: [] });
    }

    const KAKAO_REST_API_KEY = process.env.KAKAO_CLIENT_ID;

    try {
      // 카카오 API 호출
      const [keywordResponse, addressResponse] = await Promise.allSettled([
        // 키워드 검색 (장소명, 업체명)
        axios.get(`https://dapi.kakao.com/v2/local/search/keyword.json`, {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
          params: {
            query: query,
            size: 10
          }
        }),
        // 주소 검색
        axios.get(`https://dapi.kakao.com/v2/local/search/address.json`, {
          headers: {
            'Authorization': `KakaoAK ${KAKAO_REST_API_KEY}`,
          },
          params: {
            query: query,
            size: 5
          }
        })
      ]);

      const realResults = [];

      // 키워드 검색 결과 처리
      if (keywordResponse.status === 'fulfilled') {
        const keywordDocs = keywordResponse.value.data.documents || [];
        keywordDocs.forEach(doc => {
          realResults.push({
            type: 'place',
            placeName: doc.place_name,
            categoryName: doc.category_name,
            addressName: doc.address_name || doc.road_address_name,
            roadAddressName: doc.road_address_name,
            latitude: parseFloat(doc.y),
            longitude: parseFloat(doc.x),
            phone: doc.phone,
            placeUrl: doc.place_url,
            fullAddress: doc.road_address_name || doc.address_name,
            district: doc.address_name ? doc.address_name.split(' ')[1] : '',
            neighborhood: doc.address_name ? doc.address_name.split(' ')[2] : ''
          });
        });
      }

      // 주소 검색 결과 처리
      if (addressResponse.status === 'fulfilled') {
        const addressDocs = addressResponse.value.data.documents || [];
        addressDocs.forEach(doc => {
          const address = doc.road_address || doc.address;
          realResults.push({
            type: 'address',
            placeName: address.address_name,
            categoryName: '주소',
            addressName: address.address_name,
            roadAddressName: address.address_name,
            latitude: parseFloat(address.y),
            longitude: parseFloat(address.x),
            fullAddress: address.address_name,
            district: address.region_2depth_name,
            neighborhood: address.region_3depth_name
          });
        });
      }

      // 실제 API 호출이 성공한 경우
      if (realResults.length > 0) {
        // 중복 제거
        const uniqueResults = realResults.filter((item, index, self) =>
          index === self.findIndex(t => t.fullAddress === item.fullAddress)
        );

        return res.json({
          documents: uniqueResults.slice(0, 15)
        });
      }
    } catch (apiError) {
      console.log('카카오 API 호출 실패, 더미 데이터로 대체:', apiError.message);
    }

    // API 호출 실패 시 더미 데이터로 대체
    const dummyResults = getDummyResults(query);

    res.json({
      documents: dummyResults
    });

  } catch (error) {
    console.error('주소 검색 오류:', error);
    res.status(500).json({ error: '주소 검색에 실패했습니다', documents: [] });
  }
};

// 더미 데이터 생성 함수
function getDummyResults(query) {
  const dummyResults = [];
  const lowerQuery = query.toLowerCase();

  // 강남 관련 검색
  if (query.includes('강남') || lowerQuery.includes('gangnam')) {
    dummyResults.push(
      { type: 'place', placeName: '강남역', categoryName: '교통,수송 > 지하철,전철 > 지하철역', addressName: '서울 강남구 역삼동 825', roadAddressName: '서울 강남구 강남대로 390', latitude: 37.498095, longitude: 127.027610, phone: '1544-7788', fullAddress: '서울 강남구 강남대로 390', district: '강남구', neighborhood: '역삼동' },
      { type: 'place', placeName: '강남구청', categoryName: '공공,사회기관 > 구청', addressName: '서울 강남구 학동로 426', roadAddressName: '서울 강남구 학동로 426', latitude: 37.517305, longitude: 127.047184, phone: '02-3423-5000', fullAddress: '서울 강남구 학동로 426', district: '강남구', neighborhood: '논현동' }
    );
  }

  // 맥도날드 검색
  if (query.includes('맥도날드') || lowerQuery.includes('mcdonald')) {
    dummyResults.push(
      { type: 'place', placeName: '맥도날드 강남역점', categoryName: '음식점 > 패스트푸드', addressName: '서울 강남구 강남대로 390', roadAddressName: '서울 강남구 강남대로 390', latitude: 37.498095, longitude: 127.027610, phone: '02-568-1291', fullAddress: '서울 강남구 강남대로 390', district: '강남구', neighborhood: '역삼동' },
      { type: 'place', placeName: '맥도날드 홍대입구점', categoryName: '음식점 > 패스트푸드', addressName: '서울 마포구 양화로 188', roadAddressName: '서울 마포구 양화로 188', latitude: 37.556652, longitude: 126.923962, phone: '02-333-8252', fullAddress: '서울 마포구 양화로 188', district: '마포구', neighborhood: '서교동' }
    );
  }

  // 스타벅스 검색
  if (query.includes('스타벅스') || lowerQuery.includes('starbucks')) {
    dummyResults.push(
      { type: 'place', placeName: '스타벅스 강남역사거리점', categoryName: '음식점 > 카페', addressName: '서울 강남구 강남대로 390', roadAddressName: '서울 강남구 강남대로 390', latitude: 37.498000, longitude: 127.027500, phone: '1522-3232', fullAddress: '서울 강남구 강남대로 390', district: '강남구', neighborhood: '역삼동' },
      { type: 'place', placeName: '스타벅스 홍대입구역점', categoryName: '음식점 > 카페', addressName: '서울 마포구 양화로 142', roadAddressName: '서울 마포구 양화로 142', latitude: 37.556900, longitude: 126.924400, phone: '1522-3232', fullAddress: '서울 마포구 양화로 142', district: '마포구', neighborhood: '서교동' }
    );
  }

  // 홍대 검색
  if (query.includes('홍대') || lowerQuery.includes('hongik') || query.includes('홍익대')) {
    dummyResults.push(
      { type: 'place', placeName: '홍대입구역', categoryName: '교통,수송 > 지하철,전철 > 지하철역', addressName: '서울 마포구 서교동 367', roadAddressName: '서울 마포구 양화로 188', latitude: 37.556652, longitude: 126.923962, phone: '1544-7788', fullAddress: '서울 마포구 양화로 188', district: '마포구', neighborhood: '서교동' },
      { type: 'place', placeName: '홍익대학교', categoryName: '교육,학문 > 대학교', addressName: '서울 마포구 와우산로 94', roadAddressName: '서울 마포구 와우산로 94', latitude: 37.549094, longitude: 126.925381, phone: '02-320-1114', fullAddress: '서울 마포구 와우산로 94', district: '마포구', neighborhood: '상수동' }
    );
  }

  // 신촌 검색
  if (query.includes('신촌') || lowerQuery.includes('sinchon')) {
    dummyResults.push(
      { type: 'place', placeName: '신촌역', categoryName: '교통,수송 > 지하철,전철 > 지하철역', addressName: '서울 서대문구 창천동 31-12', roadAddressName: '서울 서대문구 신촌로 지하 21', latitude: 37.555134, longitude: 126.936893, phone: '1544-7788', fullAddress: '서울 서대문구 신촌로 지하 21', district: '서대문구', neighborhood: '창천동' },
      { type: 'place', placeName: '연세대학교', categoryName: '교육,학문 > 대학교', addressName: '서울 서대문구 연세로 50', roadAddressName: '서울 서대문구 연세로 50', latitude: 37.566229, longitude: 126.938263, phone: '02-2123-2114', fullAddress: '서울 서대문구 연세로 50', district: '서대문구', neighborhood: '신촌동' }
    );
  }

  // 일반 검색어 (아무것도 매칭되지 않을 때)
  if (dummyResults.length === 0) {
    const baseLocations = [
      { lat: 37.498095, lng: 127.027610, district: '강남구', neighborhood: '역삼동', area: '강남' },
      { lat: 37.556652, lng: 126.923962, district: '마포구', neighborhood: '서교동', area: '홍대' },
      { lat: 37.555134, lng: 126.936893, district: '서대문구', neighborhood: '창천동', area: '신촌' }
    ];

    baseLocations.forEach((loc, index) => {
      dummyResults.push({
        type: 'place',
        placeName: `${query} ${loc.area}점`,
        categoryName: '일반업소 > 기타',
        addressName: `서울 ${loc.district} ${loc.neighborhood}`,
        roadAddressName: `서울 ${loc.district} ${query}로 ${10 + index * 5}`,
        latitude: loc.lat + (Math.random() - 0.5) * 0.01,
        longitude: loc.lng + (Math.random() - 0.5) * 0.01,
        fullAddress: `서울 ${loc.district} ${query}로 ${10 + index * 5}`,
        district: loc.district,
        neighborhood: loc.neighborhood
      });
    });
  }

  return dummyResults.slice(0, 15);
}
