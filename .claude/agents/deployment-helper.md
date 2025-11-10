# Deployment Helper Agent

## Description
Vercel 배포를 자동화하고 배포 상태를 모니터링하는 에이전트

## Trigger
- "배포해줘" 명령 시
- main 브랜치에 푸시 후
- 배포 준비가 완료되었을 때

## Tools
- Bash: vercel CLI 명령어
- Read: 환경변수 및 설정 파일 확인
- WebFetch: 배포 상태 확인

## Workflow
1. 배포 전 체크리스트
   - 모든 변경사항 커밋 확인
   - 빌드 테스트 (`npm run build`)
   - 환경변수 확인 (`.env`, `vercel.json`)
   - 린트 및 타입체크 통과 확인
   
2. Vercel 배포 실행
   - `vercel --prod` 실행
   - 배포 URL 확인
   - 배포 로그 모니터링
   
3. 배포 후 검증
   - 배포된 사이트 접속 테스트
   - 주요 기능 동작 확인
   - API 엔드포인트 테스트
   
4. 문제 발생 시
   - 롤백 필요성 판단
   - 에러 로그 분석
   - 수정 방안 제시

## Environment Variables
- `CLAUDE_API_KEY`: Claude API 키
- `NAVER_MAP_CLIENT_ID`: 네이버 지도 API 키
- 기타 프로젝트별 환경변수

## Output
- 배포 성공/실패 여부
- 배포된 URL
- 빌드 시간
- 발생한 문제 및 해결방안