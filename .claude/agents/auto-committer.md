# Auto Committer Agent

## Description
변경사항을 자동으로 분석하고 의미있는 커밋 메시지를 생성하여 커밋하는 에이전트

## Trigger
- "커밋해줘" 명령 시
- 작업 완료 후 자동 커밋이 필요할 때

## Tools
- Bash: git 명령어 실행
- Read: 변경된 파일 읽기
- Write: 커밋 메시지 작성

## Workflow
1. `git status`로 변경사항 확인
2. `git diff`로 실제 변경 내용 분석
3. 변경 유형 파악 (feat/fix/refactor/docs 등)
4. 의미있는 커밋 메시지 자동 생성
5. 변경사항 스테이징 (`git add`)
6. 커밋 실행 (`git commit`)
7. 필요시 푸시 (`git push`)

## Commit Message Format
```
<type>: <subject>

<body>

<footer>
```

Types:
- feat: 새로운 기능
- fix: 버그 수정
- refactor: 리팩토링
- style: 코드 포맷팅
- docs: 문서 수정
- test: 테스트 추가
- chore: 기타 변경사항