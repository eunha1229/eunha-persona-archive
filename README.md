# Persona Archive — Distribution v1.1.0

개인 페르소나 설정과 AI 채팅 프롬프트를 GitHub Pages에 보관하고 공유할 수 있는 정적 아카이브입니다.

## 처음 설치

1. 이 폴더의 파일 전체를 자신의 GitHub 저장소 루트에 업로드합니다. `.nojekyll`도 반드시 포함하세요.
2. GitHub 저장소의 **Settings → Pages**에서 `Deploy from a branch`, `main`, `/(root)`를 선택합니다.
3. 사이트가 배포되면 우측 상단 **GITHUB · CONNECT**를 누릅니다.
4. 자신의 GitHub 사용자명, 저장소명, 브랜치(`main`)와 Fine-grained personal access token을 입력합니다.
5. 토큰은 반드시 **자기 저장소에만** 권한을 주고, Repository permissions의 **Contents: Read and write**만 허용하세요. 다른 사람에게 토큰을 공유하지 마세요.

## 포함 기능

- HOME 문구 사이트에서 편집
- 페르소나 생성 / 수정 / 삭제
- 동일 이름 캐릭터를 세계관별 별도 게시글로 관리
- MAIN / SUB / OTHER 카테고리
- WORLD / CATEGORY별 탐색 및 검색
- 캐치프레이즈 / 짧은 소개 / 기본 프로필
- 자유 TEXT SECTION / COPY SECTION
- 섹션 순서 ↑ ↓ 재배치
- 대표 이미지 및 다중 GALLERY 업로드
- 갤러리 원본 비율 Lightbox, 이전/다음 탐색
- 공개 URL 공유 시 Viewer 모드

## 중요

`posts/index.json`은 게시글 목록을 읽는 데 필요합니다. `.nojekyll`은 Markdown 파일이 GitHub Pages에서 정상 제공되도록 하기 위해 필요하므로 삭제하지 마세요.

`assets/characters/`는 이미지 저장 위치입니다. 빈 폴더는 Git이 보존하지 않으므로 `.gitkeep`이 들어 있습니다.

made by @2by4_JourNey
