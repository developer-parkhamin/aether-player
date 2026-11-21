<div align="center">

<img src="assets/app-badge.png" alt="AETHER Player Logo" width="112" />

<h1>AETHER Player</h1>

<p>
  <strong>Windows 10 / 11 네이티브 플로팅 PIP 시네마 &amp; 오디오 스튜디오</strong>
</p>

<p>
  <a href="https://github.com/developer-parkhamin/aether-player/releases/latest">
    <img src="https://img.shields.io/github/v/release/developer-parkhamin/aether-player?label=Latest%20Release&color=38BDF8&style=for-the-badge" alt="Latest Release" />
  </a>
  <a href="https://github.com/developer-parkhamin/aether-player/releases">
    <img src="https://img.shields.io/github/downloads/developer-parkhamin/aether-player/total?label=Downloads&color=22D3EE&style=for-the-badge" alt="Total Downloads" />
  </a>
  <img src="https://img.shields.io/badge/Windows%2010%20%2F%2011-x64-0F172A?style=for-the-badge&logo=windows&logoColor=38BDF8" alt="Windows 10 / 11 x64" />
  <img src="https://img.shields.io/badge/Runtime-Win32%20%2B%20WebView2-0F172A?style=for-the-badge" alt="Win32 + WebView2" />
</p>

<br />

<a href="https://github.com/developer-parkhamin/aether-player/releases/latest/download/AETHER.Player.Setup.exe">
  <img src="https://img.shields.io/badge/Download-AETHER%20Player%20Setup.exe%20(v2.3.0)-38BDF8?style=for-the-badge&logo=windows&logoColor=04101A" alt="Download AETHER Player Setup.exe" />
</a>

<p>
  <a href="#다운로드-및-설치">다운로드 및 설치</a> ·
  <a href="#주요-기능">주요 기능</a> ·
  <a href="#지원-포맷">지원 포맷</a> ·
  <a href="#단축키">단축키</a> ·
  <a href="https://github.com/developer-parkhamin/aether-player/releases">전체 릴리즈</a>
</p>

</div>

---

**AETHER Player**는 영상 시청과 멀티태스킹에 최적화된 Windows 네이티브 데스크톱 미디어 플레이어입니다.  
여백 없는 **Edge-to-Edge 플로팅 PIP**, 다른 창 조작을 방해하지 않는 **고스트 모드(클릭 통과)**, 다운로드가 완료되지 않은 **`.part` 파일 실시간 스트리밍**, **5-Band 오디오 EQ**까지 하나의 가벼운 앱에 담았습니다.

---

## 다운로드 및 설치

| 배포판 | 설명 | 다운로드 |
| :--- | :--- | :--- |
| **AETHER Player Setup.exe** | High-DPI Windows 설치 마법사 (표준 / 최소 설치, 자동 업데이트 지원) | **[최신 버전 다운로드 (v2.3.0)](https://github.com/developer-parkhamin/aether-player/releases/latest/download/AETHER.Player.Setup.exe)** |
| **이전 버전 / 변경 내역** | 버전별 릴리즈 노트 및 SHA-256 체크섬 | **[GitHub Releases 바로가기](https://github.com/developer-parkhamin/aether-player/releases)** |

### 빠른 설치 방법

1. 위 링크에서 **`AETHER Player Setup.exe`** 를 다운로드한 뒤 실행합니다.
2. 설치 마법사에서 원하는 구성을 선택합니다.
   - **표준 설치**: 바탕화면 · 시작 메뉴 바로가기, `.mp4`/`.mkv`/`.mp3`/`.part` 파일 연결 준비, GitHub Releases 기반 원클릭 자동 업데이트 포함
   - **최소 설치**: 필요한 핵심 실행 파일만 가볍게 설치
3. `.mp4` 등 미디어 파일을 더블 클릭으로 바로 실행하려면 설치 완료 화면의 **"Windows 기본 앱 설정 열기"** 버튼을 눌러 기본 앱으로 지정하세요.

> **자동 업데이트 지원**  
> 앱 실행 시 및 **도구 → 업데이트 확인** 메뉴에서 새 버전을 자동으로 확인하며, 클릭 한 번으로 백그라운드 설치 후 최신 버전으로 재실행됩니다.

### 시스템 요구사항

- **운영체제**: Windows 10 (1809 이상) / Windows 11 (64-bit)
- **런타임**: Microsoft Edge WebView2 Runtime · .NET Framework 4.x (Windows 10/11 환경에 대부분 기본 내장)

---

## 주요 기능

### 1. 여백 없는 플로팅 PIP & 고스트 모드
- **Edge-to-Edge 데스크톱 PIP**: 테두리와 불필요한 여백 없이 순수 영상 화면만 데스크톱 위에 띄웁니다.
- **가로 / 세로 비율 자동 고정 리사이즈**: 16:9 와이드 영상부터 9:16 세로 영상(쇼츠/릴스)까지 창 크기 조절 시 화면 잘림이나 왜곡 없이 원본 비율을 유지합니다.
- **고스트 모드 (`Alt+Shift+G`)**: 게임, 문서 작업, 코딩 중 PIP 창을 클릭 통과(Click-Through) 상태로 전환해 마우스 클릭이 뒤쪽 창으로 그대로 전달됩니다.
- **스마트 위치 & 크기 프리셋**: 4모서리 자석 스냅, `S` / `M` / `L` 원클릭 크기 프리셋, `35% ~ 100%` 투명도 조절, 어디서나 작동하는 전역 단축키(`Alt+Shift+P` · `Alt+Shift+Space`)를 지원합니다.
- **분리형 미니 PIP 창**: 필요 시 OS 독립 PIP 창으로도 전환할 수 있으며, MP3 오디오 재생 중에는 실시간 스펙트럼 비주얼라이저를 미니 창에 출력합니다.

### 2. 다운로드 중인 `.part` 파일 실시간 스트리밍
- 브라우저나 다운로더가 파일을 내려받는 도중에도 `.mp4.part`, `.webm.part`, `.mkv.part`, `.m4v.part`, `.mp3.part`, `.part` 파일을 **파일 잠금 없이 즉시 열어 재생**할 수 있습니다.
- 다운로드가 진행되며 파일 크기가 늘어나더라도 끊김 없이 탐색(Seek)할 수 있습니다.

### 3. 오디오 스튜디오 & 자막 · 가사 동기화
- **5-Band 파라메트릭 EQ**: `60Hz · 230Hz · 910Hz · 3.6kHz · 14kHz` 대역 조절 및 5가지 프리셋(플랫 · 베이스 부스트 · 시네마 · 보컬 선명 · 야간 모드) 제공
- **볼륨 부스트 (최대 200%)**: 소리가 작은 영상도 왜곡을 최소화하며 음량을 증폭합니다.
- **실시간 비주얼라이저 & 앰비라이트**: 오디오 주파수에 반응하는 Canvas 스펙트럼과 영상 색감에 맞춰 은은하게 퍼지는 앰비라이트 배경을 제공합니다.
- **자막 & 싱크 가사 자동 매칭**: 같은 이름의 `.srt`, `.vtt`, `.lrc` 파일을 자동으로 불러오며 UTF-8 및 한글 ANSI(CP949) 인코딩을 모두 지원합니다.

### 4. 데스크톱 시네마 컨트롤
- **최근 이어보기 & 깔끔한 대기열**: 재생 위치를 자동 저장해 홈 화면 대시보드에서 바로 이어볼 수 있으며, 탐색기에서 단일 파일을 실행했을 때 폴더 내 다른 파일이 임의로 대기열에 섞이지 않습니다.
- **창 스냅 제스처**: 타이틀바와 상단 여백을 잡아 창을 이동하고, 화면 최상단 끝으로 끌어당기면 창이 깔끔하게 최대화됩니다.
- **정밀 재생 도구**: A-B 구간 반복(`Shift+A`), 타임라인 북마크(`B`), `0.5× ~ 2.5×` 배속 조절, 90° 회전 · 좌우 반전 · 밝기/대비/채도 색감 보정, 프레임 PNG 캡처(`S`), 취침 타이머(`15분 · 30분 · 60분 · 트랙 종료 후`)를 지원합니다.

---

## 지원 포맷

| 분류 | 지원 확장자 | 비고 |
| :--- | :--- | :--- |
| **비디오** | `.mp4`, `.webm`, `.mkv`, `.m4v`, `.mov`, `.ogv` | 하드웨어 가속 및 비율 잠금 PIP 지원 |
| **미완료 / 라이브 파일** | `.mp4.part`, `.webm.part`, `.mkv.part`, `.m4v.part`, `.mp3.part`, `.part` | 다운로드 중에도 잠금 없이 즉시 스트리밍 |
| **오디오** | `.mp3`, `.wav`, `.ogg`, `.flac`, `.m4a`, `.aac` | 5-Band EQ, 200% 부스트, 스펙트럼 비주얼라이저 |
| **자막 · 가사** | `.srt`, `.vtt`, `.lrc` | 동일 파일명 자동 로드, UTF-8 / CP949 지원, ±0.1s 싱크 조절 |

---

## 단축키

### 전역 단축키 (다른 프로그램 사용 중에도 작동)

| 단축키 | 동작 |
| :--- | :--- |
| `Alt + Shift + P` | 데스크톱 PIP 모드 즉시 전환 / 복귀 |
| `Alt + Shift + G` | 고스트 모드 (PIP 클릭 통과) 켜기 / 끄기 |
| `Alt + Shift + Space` | 재생 / 일시정지 |

### 앱 내 단축키

| 단축키 | 동작 | 단축키 | 동작 |
| :--- | :--- | :--- | :--- |
| `Space` / `K` | 재생 / 일시정지 | `←` `→` / `J` `L` | 5초 / 10초 이동 |
| `P` | 데스크톱 PIP 전환 | `Shift + ←` / `→` | 이전 / 다음 트랙 |
| `Shift + P` / `T` | PIP 설정 / 항상 위 고정 | `↑` `↓` / `M` | 볼륨 조절 / 음소거 |
| `F` / `R` | 전체화면 / 90° 화면 회전 | `[` / `]` | 재생 속도 감속 / 가속 |
| `Shift + A` / `B` | A-B 구간 반복 / 북마크 추가 | `G` / `H` | 자막 싱크 `-0.1s` / `+0.1s` |
| `V` / `A` | 비주얼라이저 / 앰비라이트 | `S` / `Q` | 현재 프레임 캡처 / 재생목록 토글 |
| `Ctrl + O` | 파일 열기 | `Ctrl + W` | 재생 종료 후 메인 화면으로 이동 |
