import requests
from bs4 import BeautifulSoup


def fetch_boj_problem(problem_number: int) -> str:
    url = f"https://www.acmicpc.net/problem/{problem_number}"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)

    if response.status_code != 200: #크롤링 실패 시 
        return ""

    soup = BeautifulSoup(response.text, "html.parser") 

    title = soup.find("span", id="problem_title") #문제 제목
    description = soup.find("div", id="problem_description") #문제 내용
    input_desc = soup.find("div", id="problem_input") #입력 예시
    output_desc = soup.find("div", id="problem_output") #출력 예시

    if not all([title, description, input_desc, output_desc]):
        return {}

    return { #제목, 설명은 문제로 / 나머지는 각각
        "problem": f"[제목] {title.text.strip()}\n[문제 설명] {description.text.strip()}",
        "expected_input": input_desc.text.strip(),
        "expected_output": output_desc.text.strip(),
    }
