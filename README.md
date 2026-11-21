# AETHER Player

Windows 네이티브 데스크톱 시네마 & **PIP** 미디어 스튜디오 (WinForms + Edge WebView2)

## 주요 기능
- **지원 포맷**: `MP4`, `WebM`, `MKV`, `MP3`, 미완료 `.part`(`.mp4.part`, `.webm.part`, `.mkv.part`, `.mp3.part`, `.part`), 자막(`.SRT`/`.VTT`), 싱크 가사(`.LRC`)
- **데스크톱 PIP 엔진**:
  - 영상 비율 잠금 리사이징 (`WM_SIZING`) 및 세로(9:16) 영상 완벽 대응
  - 4모서리 스냅, `S` / `M` / `L` 크기 프리셋, 투명도 조절(`35%~100%`)
  - **고스트 모드** (클릭 통과 `Alt+Shift+G`), 전역 단축키(`Alt+Shift+P`, `Alt+Shift+Space`)
  - 분리형 OS 미니 창 PIP(오디오 스펙트럼 브릿지 포함)
- **데스크톱 UX**: 상단 여백·여백부 드래그 창 이동, 화면 최상단 끝 드래그 시 전체화면 전환, 자동 이어보기/북마크/A-B 구간 반복, 5-Band EQ & 앰비라이트
- **High-DPI WPF 설치 프로그램 및 자동 업데이트**: `src/AppConfig.cs` 기반 GitHub Releases / `latest.json` 원클릭 무중단 업그레이드

## 빌드 방법
```powershell
.\build-installer.ps1
```
- 출력물:
  - `AETHER Player.exe` (단독 실행 파일)
  - `dist\AETHER Player Setup.exe` (WPF 설치 프로그램)
  - `dist\latest.json` (자동 업데이트 매니페스트 + SHA-256)

## GitHub 릴리즈 & 자동 업데이트 배포
1. `src/AppConfig.cs`에서 `Version`과 `UpdateGithubRepo` (`"owner/repo"`)를 설정합니다.
2. `gh auth login`으로 로그인한 상태에서 아래 명령을 실행하면 빌드·자체 검증·Git 푸시·GitHub Release 업로드를 한 번에 수행합니다.
```powershell
.\publish-release.ps1
```
