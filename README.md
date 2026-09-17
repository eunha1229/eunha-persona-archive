# Persona Archive v1.0.0

개인 페르소나/캐릭터 설정과 프롬프트를 정리하는 GitHub Pages 기반 개인 아카이브입니다.

## 시작하기

1. 이 저장소를 **Use this template**로 복사해 본인 계정에 새 저장소를 만듭니다.
2. 저장소 **Settings → Pages**에서 `Deploy from a branch` / `main` / `/(root)`를 선택합니다.
3. Pages 주소가 열리면 우측 상단 **GITHUB · CONNECT**를 누릅니다.
4. GitHub 계정 Settings → Developer settings → Personal access tokens → Fine-grained tokens에서 토큰을 만듭니다.
5. Repository access는 이 아카이브 저장소 하나만 선택하고, Repository permissions에서 **Contents: Read and write**만 추가합니다. Metadata의 Read-only는 GitHub 기본 권한입니다.
6. 사이트의 CONNECT 창에 Owner / Repository / Branch / Token을 입력합니다. GitHub Pages 기본 주소로 접속했다면 Owner와 Repository는 자동 추정됩니다.
7. **EDIT HOME**으로 홈 문구를 바꾸고 **NEW ENTRY**로 첫 페르소나를 추가합니다.

## 보안

Fine-grained token은 다른 사람에게 공유하지 마세요. 이 사이트는 토큰을 저장소 파일에 기록하지 않으며 브라우저 `sessionStorage`에만 보관합니다. 브라우저 세션이 끝나면 다시 입력해야 할 수 있습니다. 토큰은 해당 아카이브 저장소 하나에만 접근하도록 제한하는 것을 권장합니다.

## 중요한 파일

- `.nojekyll` — 삭제하지 마세요. Markdown 게시글을 GitHub Pages에서 그대로 읽기 위해 필요합니다.
- `posts/index.json` — 게시글 목록. 사이트에서 글을 추가/삭제하면 자동 갱신됩니다.
- `config/home.json` — 홈 화면 문구.
- `assets/characters/` — 업로드한 캐릭터 이미지.

## 기능

페르소나 생성/수정/삭제, 이미지 업로드, 월드 분류, 검색, 자유 텍스트 섹션, COPY 섹션, 홈 편집, GitHub 직접 저장을 지원합니다.

made by @2by4_JourNey
