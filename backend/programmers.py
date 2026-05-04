import json
import requests
from bs4 import BeautifulSoup
from config import groq_client, logger


def fetch_problem_from_url(url: str) -> dict:
    """임의의 코딩 문제 URL에서 문제 정보를 추출합니다."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
    }

    logger.info(f"URL 크롤링 시작 | url={url}")
    try:
        response = requests.get(url, headers=headers, timeout=10)
    except Exception:
        logger.exception(f"URL 요청 실패 | url={url}")
        return {}

    if response.status_code != 200:
        logger.warning(f"URL 크롤링 실패 | status={response.status_code} | url={url}")
        return {}

    soup = BeautifulSoup(response.text, "lxml")

    for tag in soup(["script", "style", "nav", "footer", "header", "aside"]):
        tag.decompose()

    body = soup.body or soup
    page_text = body.get_text(separator="\n", strip=True)[:4000]

    logger.info(f"URL 파싱 완료 | url={url} | content_length={len(page_text)}")

    prompt = (
        "다음은 코딩 문제 페이지의 내용입니다. 문제 정보를 추출하세요.\n\n"
        f"{page_text}\n\n"
        "반드시 다음 JSON 형식으로만 응답하세요:\n"
        '{"title": "문제 제목", "problem": "문제 설명 전체", '
        '"expected_input": "입력 예시 (없으면 빈 문자열)", '
        '"expected_output": "출력 예시 (없으면 빈 문자열)"}'
    )

    try:
        res = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        data = json.loads(res.choices[0].message.content)
    except Exception:
        logger.exception(f"LLM 문제 추출 실패 | url={url}")
        return {}

    title = data.get("title", "")
    problem_text = data.get("problem", "")
    logger.info(f"URL 크롤링 성공 | url={url} | title={title}")

    return {
        "problem": f"[제목] {title}\n[문제 설명]\n{problem_text}",
        "expected_input": data.get("expected_input", ""),
        "expected_output": data.get("expected_output", ""),
    }
