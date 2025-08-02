# 🔑 Claude API 키 설정 가이드

## 1단계: 새 API 키 생성
1. https://console.anthropic.com 접속
2. **API Keys** → **Create Key** 클릭
3. **이름**: `dduki-busan-bot`
4. **권한 설정**:
   - ✅ **Messages API** 활성화
   - ✅ **Claude-3.5-Sonnet** 모델 접근
   - ✅ **Server applications** 허용
   - ❌ **Domain restrictions** 비활성화 (또는 `*.vercel.app` 추가)

## 2단계: Vercel 환경변수 업데이트
1. https://vercel.com/dashboard 접속
2. **ddugiclaude** 프로젝트 선택
3. **Settings** → **Environment Variables**
4. `CLAUDE_API_KEY` 값을 새 키로 교체
5. **Save** 후 **Redeploy**

## 3단계: API 키 형식 확인
✅ 올바른 형식: `sk-ant-api03-xxxxxxxxxxxx`
❌ 잘못된 형식: API 키가 다른 패턴을 가지면 문제 발생 가능

## 4단계: Billing 확인
- **Console** → **Billing** 탭
- 크레딧 잔액 확인
- 결제 방법 등록 여부 확인

## 5단계: 테스트
새 키 설정 후 웹사이트에서 테스트:
```
"안녕하세요 뚜기야, 돼지국밥 맛집 알려줘"
```

## 문제 해결
만약 여전히 작동하지 않으면:
1. **Vercel 함수 로그** 확인
2. **Console.log** 메시지 확인
3. **Anthropic 지원팀** 문의

---
**참고**: 현재 Fallback 시스템이 잘 작동하므로 사용자 경험에는 문제없습니다! 🐧