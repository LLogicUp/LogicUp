---
name: slack-gif-creator
description: Slack에 최적화된 애니메이션 GIF를 만들기 위한 지식과 유틸리티. 제약 조건, 검증 도구, 애니메이션 개념을 제공합니다. 사용자가 "X가 Y를 하는 Slack용 GIF 만들어줘"와 같이 Slack용 애니메이션 GIF를 요청할 때 사용합니다.
license: Complete terms in LICENSE.txt
---

# Slack GIF 생성기

Slack에 최적화된 애니메이션 GIF를 만들기 위한 유틸리티와 지식을 제공하는 툴킷입니다.

## Slack 요구사항

**크기:**
- 이모지 GIF: 128x128 (권장)
- 메시지 GIF: 480x480

**파라미터:**
- FPS: 10-30 (낮을수록 파일 크기 작음)
- 색상: 48-128 (적을수록 파일 크기 작음)
- 지속 시간: 이모지 GIF의 경우 3초 미만 유지

## 핵심 워크플로

```python
from core.gif_builder import GIFBuilder
from PIL import Image, ImageDraw

# 1. 빌더 생성
builder = GIFBuilder(width=128, height=128, fps=10)

# 2. 프레임 생성
for i in range(12):
    frame = Image.new('RGB', (128, 128), (240, 248, 255))
    draw = ImageDraw.Draw(frame)

    # PIL 프리미티브를 사용해 애니메이션 그리기
    # (원, 다각형, 선 등)

    builder.add_frame(frame)

# 3. 최적화와 함께 저장
builder.save('output.gif', num_colors=48, optimize_for_emoji=True)
```

## 그래픽 그리기

### 사용자가 업로드한 이미지 작업
사용자가 이미지를 업로드하는 경우, 원하는 것이 무엇인지 고려합니다:
- **직접 사용** (예: "이것을 애니메이션으로", "이것을 프레임으로 분리")
- **영감으로 사용** (예: "이런 것을 만들어줘")

PIL로 이미지를 로드하고 작업합니다:
```python
from PIL import Image

uploaded = Image.open('file.png')
# 직접 사용하거나, 색상/스타일 참고로만 사용
```

### 처음부터 그리기
처음부터 그래픽을 그릴 때 PIL ImageDraw 프리미티브를 사용합니다:

```python
from PIL import ImageDraw

draw = ImageDraw.Draw(frame)

# 원/타원
draw.ellipse([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)

# 별, 삼각형, 모든 다각형
points = [(x1, y1), (x2, y2), (x3, y3), ...]
draw.polygon(points, fill=(r, g, b), outline=(r, g, b), width=3)

# 선
draw.line([(x1, y1), (x2, y2)], fill=(r, g, b), width=5)

# 직사각형
draw.rectangle([x1, y1, x2, y2], fill=(r, g, b), outline=(r, g, b), width=3)
```

**사용하지 말 것:** 이모지 폰트(플랫폼 간 신뢰할 수 없음) 또는 이 스킬에 사전 패키지된 그래픽이 있다고 가정하지 마세요.

### 그래픽을 멋지게 만들기

그래픽은 세련되고 창의적으로 보여야 하며, 기본적으로 보여서는 안 됩니다. 방법은 다음과 같습니다:

**두꺼운 선 사용** - 윤곽선과 선에 항상 `width=2` 이상을 설정합니다. 얇은 선(width=1)은 어색하고 아마추어처럼 보입니다.

**시각적 깊이 추가**:
- 배경에 그래디언트 사용 (`create_gradient_background`)
- 복잡성을 위해 여러 도형 레이어링 (예: 내부에 더 작은 별이 있는 별)

**도형을 더 흥미롭게 만들기**:
- 단순한 원을 그리지 말고 하이라이트, 링, 또는 패턴 추가
- 별은 빛 효과를 가질 수 있음 (뒤에 더 크고 반투명한 버전 그리기)
- 여러 도형 결합 (별 + 반짝임, 원 + 링)

**색상에 주의**:
- 선명하고 보완적인 색상 사용
- 대비 추가 (밝은 도형에 어두운 윤곽선, 어두운 도형에 밝은 윤곽선)
- 전체 구성 고려

**복잡한 도형** (하트, 눈송이 등):
- 다각형과 타원의 조합 사용
- 대칭을 위해 포인트 신중하게 계산
- 세부사항 추가 (하트는 하이라이트 곡선을 가질 수 있고, 눈송이는 복잡한 가지를 가짐)

창의적이고 세밀하게 만드세요! 좋은 Slack GIF는 플레이스홀더 그래픽처럼 보이지 않고 세련되어 보여야 합니다.

## 사용 가능한 유틸리티

### GIFBuilder (`core.gif_builder`)
프레임을 조립하고 Slack에 최적화합니다:
```python
builder = GIFBuilder(width=128, height=128, fps=10)
builder.add_frame(frame)  # PIL Image 추가
builder.add_frames(frames)  # 프레임 목록 추가
builder.save('out.gif', num_colors=48, optimize_for_emoji=True, remove_duplicates=True)
```

### 검증기 (`core.validators`)
GIF가 Slack 요구사항을 충족하는지 확인합니다:
```python
from core.validators import validate_gif, is_slack_ready

# 상세 검증
passes, info = validate_gif('my.gif', is_emoji=True, verbose=True)

# 빠른 확인
if is_slack_ready('my.gif'):
    print("Ready!")
```

### 이징 함수 (`core.easing`)
선형 대신 부드러운 모션:
```python
from core.easing import interpolate

# 0.0에서 1.0으로의 진행도
t = i / (num_frames - 1)

# 이징 적용
y = interpolate(start=0, end=400, t=t, easing='ease_out')

# 사용 가능: linear, ease_in, ease_out, ease_in_out,
#           bounce_out, elastic_out, back_out
```

### 프레임 헬퍼 (`core.frame_composer`)
일반적인 필요를 위한 편의 함수들:
```python
from core.frame_composer import (
    create_blank_frame,         # 단색 배경
    create_gradient_background,  # 수직 그래디언트
    draw_circle,                # 원을 위한 헬퍼
    draw_text,                  # 간단한 텍스트 렌더링
    draw_star                   # 5각 별
)
```

## 애니메이션 개념

### 흔들기/진동
진동으로 오브젝트 위치 오프셋:
- 프레임 인덱스와 함께 `math.sin()` 또는 `math.cos()` 사용
- 자연스러운 느낌을 위해 작은 무작위 변형 추가
- x 및/또는 y 위치에 적용

### 펄스/심장박동
오브젝트 크기를 리드미컬하게 조정:
- 부드러운 펄스를 위해 `math.sin(t * frequency * 2 * math.pi)` 사용
- 심장박동용: 두 번의 빠른 펄스 후 정지 (사인파 조정)
- 기본 크기의 0.8에서 1.2 사이로 스케일

### 바운스
오브젝트가 떨어지고 튕깁니다:
- 착지를 위해 `easing='bounce_out'`과 함께 `interpolate()` 사용
- 떨어질 때(가속) `easing='ease_in'` 사용
- 각 프레임마다 y 속도를 증가시켜 중력 적용

### 회전
중심 주위로 오브젝트 회전:
- PIL: `image.rotate(angle, resample=Image.BICUBIC)`
- 흔들기용: 선형 대신 각도에 사인파 사용

### 페이드 인/아웃
점진적으로 나타나거나 사라집니다:
- RGBA 이미지 생성, 알파 채널 조정
- 또는 `Image.blend(image1, image2, alpha)` 사용
- 페이드 인: 알파 0에서 1로
- 페이드 아웃: 알파 1에서 0으로

### 슬라이드
화면 밖에서 위치로 오브젝트 이동:
- 시작 위치: 프레임 경계 밖
- 끝 위치: 대상 위치
- 부드러운 정지를 위해 `easing='ease_out'`과 함께 `interpolate()` 사용
- 오버슈트용: `easing='back_out'` 사용

### 줌
줌 효과를 위한 스케일 및 위치:
- 줌 인: 0.1에서 2.0으로 스케일, 중앙 자르기
- 줌 아웃: 2.0에서 1.0으로 스케일
- 드라마틱 효과를 위해 모션 블러 추가 가능 (PIL 필터)

### 폭발/파티클 버스트
방사형으로 퍼지는 파티클 생성:
- 무작위 각도와 속도로 파티클 생성
- 각 파티클 업데이트: `x += vx`, `y += vy`
- 중력 추가: `vy += gravity_constant`
- 시간에 따라 파티클 페이드 아웃 (알파 감소)

## 최적화 전략

파일 크기를 줄이도록 요청받은 경우에만 다음 방법 중 일부를 구현합니다:

1. **프레임 수 줄이기** - 낮은 FPS(20 대신 10) 또는 짧은 지속 시간
2. **색상 수 줄이기** - 128 대신 `num_colors=48`
3. **크기 줄이기** - 480x480 대신 128x128
4. **중복 제거** - save()에서 `remove_duplicates=True`
5. **이모지 모드** - `optimize_for_emoji=True`가 자동 최적화

```python
# 이모지를 위한 최대 최적화
builder.save(
    'emoji.gif',
    num_colors=48,
    optimize_for_emoji=True,
    remove_duplicates=True
)
```

## 철학

이 스킬은 다음을 제공합니다:
- **지식**: Slack의 요구사항과 애니메이션 개념
- **유틸리티**: GIFBuilder, 검증기, 이징 함수
- **유연성**: PIL 프리미티브를 사용해 애니메이션 로직 생성

다음은 제공하지 않습니다:
- 엄격한 애니메이션 템플릿이나 미리 만들어진 함수
- 이모지 폰트 렌더링 (플랫폼 간 신뢰할 수 없음)
- 스킬에 내장된 사전 패키지된 그래픽 라이브러리

**사용자 업로드 관련 참고**: 이 스킬은 미리 빌드된 그래픽을 포함하지 않지만, 사용자가 이미지를 업로드하면 PIL을 사용해 로드하고 작업합니다 — 요청을 기반으로 직접 사용할지 영감으로만 사용할지 해석합니다.

창의적으로 하세요! 개념을 결합하고(바운싱 + 회전, 펄스 + 슬라이딩 등) PIL의 모든 기능을 활용하세요.

## 의존성

```bash
pip install pillow imageio numpy
```
