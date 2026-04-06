import requests
from bs4 import BeautifulSoup


def fetch_boj_problem(problem_number: int) -> str:
    url = f"https://www.acmicpc.net/problem/{problem_number}"
    headers = {"User-Agent": "Mozilla/5.0"}

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        return ""

    soup = BeautifulSoup(response.text, "html.parser")

    title = soup.find("span", id="problem_title")
    description = soup.find("div", id="problem_description")
    input_desc = soup.find("div", id="problem_input")
    output_desc = soup.find("div", id="problem_output")

    if not all([title, description, input_desc, output_desc]):
        return {}

    return {
        "problem": f"[제목] {title.text.strip()}\n[문제 설명] {description.text.strip()}",
        "expected_input": input_desc.text.strip(),
        "expected_output": output_desc.text.strip(),
    }
