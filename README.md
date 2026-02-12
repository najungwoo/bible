# 말씀 암송 프로그램 (Bible Verse Memorization)

성경 구절을 효과적으로 암송할 수 있는 프로그램입니다.

## 🚀 바로 시작하기

### 🌐 웹 버전
설치 없이 바로 사용하세요!

**👉 [웹에서 바로 사용하기](https://najungwoo.github.io/bible/)**

- PC, 모바일, 태블릿 모두 지원
- 설치 불필요
- 모바일에서 홈 화면에 추가하면 앱처럼 사용 가능

### 💻 Windows 프로그램
오프라인에서도 사용할 수 있는 데스크톱 버전입니다.

**👉 [Windows 프로그램 다운로드](https://github.com/najungwoo/bible/releases/latest/download/BibleMemory.exe)**

---

## ✨ 주요 기능

### 📚 다양한 학습 모드
- **빈칸 채우기**: 일부 단어만 가려서 암송 연습
- **구절 암송**: 구절 전체를 암송
- **장절 암송**: 성경 책 이름과 장절을 암송
- **전체 암송**: 모든 것을 암송

### 📊 학습 관리
- **일차별 학습**: 하루하루 체계적으로 암송
- **과정별 분류**: 1~4과정으로 구절 분류 및 필터링
- **점수 시스템**: 학습 성과를 점수로 확인
- **틀린 구절 복습**: 틀린 구절만 모아서 다시 연습

### 💡 편의 기능
- **힌트 시스템**: 3단계 힌트로 학습 도움
- **글자 크기 조절**: 가독성 향상
---

## 🎯 사용 방법

### 웹 버전
1. [웹 페이지](https://najungwoo.github.io/bible/) 접속
2. 일차 선택 후 학습 시작
3. 모바일에서는 홈 화면에 추가하여 앱처럼 사용

### Windows 프로그램
1. [다운로드 링크](https://github.com/najungwoo/bible/releases/latest/download/BibleMemory.exe)에서 exe 파일 다운로드
2. 실행 (보안 경고 시 '추가 정보' → '실행' 클릭)
3. 일차를 선택하고 학습 시작

---

## 🛠️ 개발 정보

### 기술 스택
- **웹 버전**: HTML, CSS, JavaScript
- **데스크톱 버전**: Python, CustomTkinter
- **배포**: GitHub Pages, GitHub Actions

### 로컬 개발
```bash
# 웹 버전
docs/index.html 열기

# Python 버전 실행
python bible.py

# EXE 빌드
pyinstaller --noconfirm --onefile --windowed --add-data "data;data" --name "BibleMemory" bible.py
```

---

## 📝 라이선스
MIT License

---

## 💬 문의 및 버그 리포트
이슈나 개선 사항은 [GitHub Issues](https://github.com/najungwoo/bible/issues)에 남겨주세요.
