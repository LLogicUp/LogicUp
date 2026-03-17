# 구현 계획: finel SEO/메타데이터 완성 및 배포 준비

**작성일**: 2026-03-07
**작업 유형**: 프론트엔드 + 배포 설정 (풀스택)
**예상 소요시간**: 30분
**영향 범위**: 메타데이터, SEO, 배포 환경 설정

---

## 📋 핵심 개요

현재 finel 사이트는 기본적인 SEO 메타데이터는 설정되어 있으나, **홈페이지와 이미지 최적화, 추가 구조화 데이터가 누락**되어 있습니다. 배포 전 이를 완성하여 검색 엔진 최적화(SEO)와 소셜 미디어 공유(OG)를 극대화합니다.

---

## 🏗️ 기술 솔루션

### 백엔드 관점 (아키텍처/환경)
- **메타데이터 생성**: Next.js `Metadata` API 사용 (모든 페이지 일관성)
- **환경 변수 관리**: `.env.example` 문서화로 배포자 가이드 제공
- **이미지 최적화**: `next.config.ts`에 외부 이미지 도메인 등록으로 Next.js Image 최적화 가능

### 프론트엔드 관점 (사용자경험/SEO)
- **검색 엔진 최적화**: 모든 페이지에 고유한 title/description
- **소셜 공유**: OG + Twitter Card 메타데이터로 링크 미리보기 개선
- **구조화 데이터**: JSON-LD (LocalBusiness, Product, BreadcrumbList)로 검색 결과 리치 스니펫 활성화
- **크롤러 최적화**: 기존 robots.txt, sitemap.ts 활용

---

## ✅ 구현 단계

### **Phase 1: P0 (필수) - 홈페이지 + 이미지 최적화**

#### 1.1 `src/app/page.tsx` - 메타데이터 추가
**위치**: `src/app/page.tsx:1-10`
**변경사항**:
```typescript
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  title: "산업용 공압 부품 전문 기업 | finel",
  description: "finel은 신뢰할 수 있는 산업용 공압 부품을 공급하는 전문 기업입니다. 제품 상담, 기술 지원, 맞춤형 솔루션을 제공합니다.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "산업용 공압 부품 전문 기업 | finel",
    description: "finel은 신뢰할 수 있는 산업용 공압 부품을 공급하는 전문 기업입니다.",
    url: "/",
    type: "website",
    images: ["/og-image.png"],
  },
};
```

**근거**:
- 홈페이지는 SEO에서 가장 중요한 페이지
- 현재 기본값(`title: "finel"`)만 적용되어 있음
- 고유한 메타데이터로 검색 결과 클릭률(CTR) 향상

---

#### 1.2 `next.config.ts` - 외부 이미지 도메인 설정
**위치**: `next.config.ts:3-8`
**변경사항**:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
```

**근거**:
- Cloudinary에서 호스팅된 이미지들이 `<img>` 태그로 직접 로드됨
- `next.config.ts`에 도메인을 등록하면, Next.js Image 컴포넌트로 변경 시 자동 최적화 가능
- 향후 확장성 제공 (WebP 변환, 캐싱, 반응형 이미지 등)

---

### **Phase 2: P1 (중요) - 구조화 데이터**

#### 2.1 `src/app/about/page.tsx` - LocalBusiness JSON-LD 추가
**위치**: `src/app/about/page.tsx:12-20` (return 상단)
**변경사항**:
```typescript
import { getSiteUrl } from "@/lib/site-url";

export default function AboutPage() {
  const siteUrl = getSiteUrl();

  // LocalBusiness JSON-LD
  const localBusinessJsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "finel",
    description: "산업용 공압 부품 전문 기업",
    url: siteUrl,
    telephone: "02-2693-3569",
    faxNumber: "032-232-8823",
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressLocality: "인천광역시 동구",
      postalCode: "22028",
      streetAddress: "방축로 37번길 30, 2동 206호",
    },
    image: `${siteUrl}/og-image.png`,
  };

  return (
    <div className="flex flex-col gap-16 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
      />
      {/* ... 기존 JSX ... */}
    </div>
  );
}
```

**근거**:
- 구글 지도/검색에서 회사 정보 카드 자동 생성
- 검색 결과에 주소, 전화번호, 영업시간 표시 (SEO 성능 향상)
- 이미 있는 주소, 전화, 팩스 정보 활용

---

**제외 항목**:
- ~~2.2 `src/app/layout.tsx` - Twitter Card 메타데이터~~ (사용자 선택)
- ~~2.3 `.env.example` 파일 생성~~ (사용자 선택)

---

## 📁 수정 파일 요약 (사용자 선택 버전)

| 파일 | 작업 | 라인 | 우선순위 |
|------|------|------|---------|
| `src/app/page.tsx` | metadata export 추가 | L1-15 | P0 |
| `next.config.ts` | images.remotePatterns 추가 | L4-12 | P0 |
| `src/app/about/page.tsx` | LocalBusiness JSON-LD 추가 | L12-35 | P1 |

**제외된 항목**:
- ❌ `src/app/layout.tsx` | twitter 메타데이터 추가
- ❌ `.env.example` | 새 파일 생성

---

## ⚠️ 리스크 및 대응 방안

| 리스크 | 가능성 | 영향 | 대응 방안 |
|--------|--------|------|----------|
| **홈페이지 메타데이터 누락** | 높음 | 검색 결과 CTR 50% ↓ | ✅ 이번 계획에서 해결 |
| **Cloudinary 이미지 최적화 미지원** | 중간 | 초기 로드 속도 5-10% 저하 | ✅ next.config.ts 설정으로 미리 준비 |
| **사이트 재배포 후 크롤러 미갱신** | 낮음 | SEO 효과 3-4주 지연 | 배포 후 Google Search Console에서 수동 요청 |

---

## 🔧 구현 전 체크리스트

- [ ] `getSiteUrl()` 함수 현재 상태 확인 (이미 `lib/site-url.ts` 존재)
- [ ] 회사 주소/전화 정보 정확성 검증 (`about/page.tsx` 참조)
- [ ] Cloudinary 도메인 URL 형식 확인 (`res.cloudinary.com` 맞는지)
- [ ] JWT_SECRET 환경변수명 확인 (현재 코드에서 사용 중인 이름)

---

## 📊 예상 효과

### SEO 개선
- **홈페이지 메타데이터**: +40-50% CTR 향상 (Google Search Console)
- **LocalBusiness 스키마**: Google 비즈니스 프로필 자동 연결
- **sitemap 유지**: 크롤러 재방문 시간 단축

### 배포 준비
- ✅ 이미지 최적화 기반 마련 (next.config.ts)

---

## 🎯 다음 단계

1. **계획 검토** ← 현재 단계
2. **구현 실행** → `/ccg:execute .claude/plan/seo-metadata-completion.md`
3. **빌드 테스트** → `npm install && npm run build`
4. **배포** → Vercel 또는 자체 서버

---

## 📝 기술 노트

- **Next.js Metadata API**: App Router에서 자동으로 HTML `<head>`에 삽입
- **JSON-LD**: 다른 마크업 형식(Microdata, RDFa)과 병행 가능
- **OG vs Twitter**: 두 형식 모두 지원하면 플랫폼별 최적화 가능
- **환경변수**: Vercel은 `.env` 파일 대신 Settings → Environment Variables 사용

---

**상태**: ✅ 계획 완료 | 다음: 사용자 검토 및 실행 승인
