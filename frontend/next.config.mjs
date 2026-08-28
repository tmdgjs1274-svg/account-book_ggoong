/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Render Static Site(정적 호스팅)로 배포하기 위한 정적 export 설정.
  // 서버 전용 기능(app/api, middleware, next/image 최적화 서버 등)을 쓰지 않는
  // 순수 클라이언트 앱이라 정적 export가 가능해요.
  output: 'export',
  // 각 라우트를 `경로/index.html` 형태로 내보내서, 정적 호스팅에서 `/dashboard` 같은
  // 경로에 새로고침/직접 접속해도 폴더의 index.html이 그대로 서빙되게 해요.
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
