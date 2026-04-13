import requests
from bs4 import BeautifulSoup
from config import logger

def fetch_boj_problem(problem_number: int) -> dict:
    url = f"https://www.acmicpc.net/problem/{problem_number}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "ko-KR,ko;q=0.9",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    }

    logger.info(f"BOJ 크롤링 시작 | problem_number={problem_number}")
    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        logger.warning(f"BOJ 크롤링 실패 | status={response.status_code} | problem_number={problem_number}")
        return {}

    soup = BeautifulSoup(response.text, "html.parser")

    title = soup.find("span", id="problem_title")
    description = soup.find("div", id="problem_description")
    input_desc = soup.find("div", id="problem_input")
    output_desc = soup.find("div", id="problem_output")

    if not all([title, description, input_desc, output_desc]):
        logger.warning(f"BOJ 파싱 실패 | problem_number={problem_number} | title={title is not None} | desc={description is not None} | input={input_desc is not None} | output={output_desc is not None}")
        return {}

    logger.info(f"BOJ 크롤링 성공 | problem_number={problem_number} | title={title.text.strip()}")
    return {
        "problem": f"[제목] {title.text.strip()}\n[문제 설명] {description.text.strip()}",
        "expected_input": input_desc.text.strip(),
        "expected_output": output_desc.text.strip(),
    }
