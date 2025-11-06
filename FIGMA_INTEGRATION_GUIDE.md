# Figma 디자인 통합 가이드

## Figma 템플릿을 현재 프로젝트에 적용하는 방법

### 1단계: Figma 디자인 준비
1. Figma 파일 링크 공유 설정 (View 권한)
2. 또는 Figma 파일을 .fig 형식으로 다운로드
3. 필요한 페이지/프레임 확인

### 2단계: 디자인 시스템 추출
```css
/* 예시: Figma에서 추출할 디자인 토큰 */
:root {
  /* Colors */
  --primary: #FF6B35;
  --secondary: #FFD166;
  --background: #F7F7F7;
  --text: #2F2F2F;
  
  /* Typography */
  --font-heading: 'Pretendard', sans-serif;
  --font-body: 'Inter', sans-serif;
  
  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --spacing-xl: 32px;
}
```

### 3단계: 컴포넌트 매핑
현재 프로젝트 구조와 Figma 컴포넌트 매칭:
- Header → `.dm-header`
- Chat Messages → `.dm-chat-area`
- Input → `.dm-input-area`
- Restaurant Cards → `.restaurant-card`
- Modal → `.artifacts-overlay`

### 4단계: 스타일 적용 방법

#### A. 수동 적용
1. Figma Inspect 모드에서 CSS 복사
2. `style.css` 파일에 붙여넣기
3. 클래스명 매핑

#### B. 자동 변환 (추천)
1. Figma 플러그인 설치:
   - Figma to Code
   - Anima
   - Figtoken

2. 변환 설정:
   - Framework: Vanilla JS
   - CSS: Standard CSS
   - Units: px/rem

### 5단계: 반응형 처리
```css
/* Figma 브레이크포인트 적용 */
@media (max-width: 768px) {
  /* 태블릿 스타일 */
}

@media (max-width: 480px) {
  /* 모바일 스타일 */
}
```

### 6단계: 애셋 처리
1. 이미지: `/public/images/`
2. 아이콘: SVG 인라인 또는 `/public/icons/`
3. 폰트: Google Fonts 또는 로컬 폰트

## 필요한 정보
Figma 템플릿을 적용하려면 다음이 필요합니다:
1. **Figma 파일 링크** (공유 링크)
2. **적용하고 싶은 페이지/섹션** 지정
3. **디자인 우선순위** (어떤 부분부터 적용할지)

## 예시 명령어
```bash
# Figma 링크 제공 시
"이 Figma 디자인을 적용해줘: [Figma URL]"

# 특정 섹션만 적용
"Figma의 헤더 디자인만 적용해줘"

# 색상 시스템만 적용
"Figma의 컬러 팔레트를 프로젝트에 적용해줘"
```

---

**참고:** Figma 파일이나 링크를 공유해주시면 바로 적용 가능합니다!