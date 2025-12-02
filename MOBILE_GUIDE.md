# 모바일 앱 개발 및 빌드 가이드

이 프로젝트는 **Capacitor**를 사용하여 하이브리드 모바일 앱으로 설정되었습니다.
현재 `docs/` 폴더에 있는 웹 소스를 그대로 안드로이드 앱으로 변환하여 실행할 수 있습니다.

## 1. 필수 준비 사항

안드로이드 앱을 빌드하고 실행하려면 **Android Studio**가 필요합니다.
- [Android Studio 다운로드](https://developer.android.com/studio)
- 설치 시 기본 설정을 그대로 유지하며 설치해 주세요. (Android SDK 등이 포함됩니다.)

## 2. 프로젝트 열기 및 실행

1. **Android Studio**를 실행합니다.
2. **Open**을 클릭하고, 이 프로젝트 폴더 내의 `android` 폴더를 선택하여 엽니다.
   - 경로: `Desktop\Bible-verse-memorization-main\android`
3. 프로젝트가 로딩되는 동안 잠시 기다립니다 (Gradle Sync).
4. 상단 메뉴에서 실행할 기기(에뮬레이터 또는 USB로 연결된 실제 폰)를 선택하고 **Run (▶)** 버튼을 누릅니다.

## 3. 앱 업데이트 방법

웹 소스(`docs/` 폴더 내의 HTML, CSS, JS)를 수정한 후에는 앱에도 반영해 주어야 합니다.
터미널(PowerShell 등)에서 다음 명령어를 실행하세요:

```bash
npx cap sync
```

이 명령어는 `docs` 폴더의 변경 사항을 `android` 프로젝트로 복사합니다. 그 후 Android Studio에서 다시 Run을 누르면 됩니다.

## 4. 참고 사항

- **시작 페이지**: 앱을 켜면 `docs/index.html` (소개 페이지)가 먼저 뜹니다. "웹에서 바로 사용하기" 버튼을 누르면 암송 화면으로 이동합니다.
- **아이콘 변경**: `android/app/src/main/res/` 폴더 내의 이미지들을 교체하여 앱 아이콘을 변경할 수 있습니다.
