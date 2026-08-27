// 회원가입(개인)이나 그룹 생성 시 공통으로 제공하는 기본 카테고리.
// (설정 화면 없이 누구에게나 동일하게 제공 — 우리 서비스 공통 기능 원칙)
const DEFAULT_CATEGORIES = [
  { name: '식비', type: 'expense', color: '#FF6B6B', icon: 'food', sort_order: 1 },
  { name: '카페/간식', type: 'expense', color: '#F5A623', icon: 'cafe', sort_order: 2 },
  { name: '교통', type: 'expense', color: '#4A90D9', icon: 'transit', sort_order: 3 },
  { name: '주거/통신', type: 'expense', color: '#7B61FF', icon: 'home', sort_order: 4 },
  { name: '쇼핑', type: 'expense', color: '#FF8FB1', icon: 'shopping', sort_order: 5 },
  { name: '문화/여가', type: 'expense', color: '#2FCB8C', icon: 'culture', sort_order: 6 },
  { name: '의료/건강', type: 'expense', color: '#5BC8F2', icon: 'health', sort_order: 7 },
  { name: '교육', type: 'expense', color: '#9B7BFF', icon: 'edu', sort_order: 8 },
  { name: '경조사/선물', type: 'expense', color: '#FF9F5B', icon: 'gift', sort_order: 9 },
  { name: '기타지출', type: 'expense', color: '#B0B8C1', icon: 'etc', sort_order: 10 },
  { name: '급여', type: 'income', color: '#3182F6', icon: 'salary', sort_order: 1 },
  { name: '용돈', type: 'income', color: '#00C2A8', icon: 'allowance', sort_order: 2 },
  { name: '부수입', type: 'income', color: '#8B5CF6', icon: 'side', sort_order: 3 },
  { name: '기타수입', type: 'income', color: '#B0B8C1', icon: 'etc', sort_order: 4 },
];

module.exports = { DEFAULT_CATEGORIES };
