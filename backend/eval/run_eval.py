"""
힌트 정확도 평가 스크립트

실행:
  cd backend
  python eval/run_eval.py [--judge]

  --judge  LLM-as-judge 품질 평가도 함께 실행 (API 비용 추가)

출력:
  eval/results_<timestamp>.json  - 원시 결과
  eval/report_<timestamp>.txt    - 요약 리포트 (콘솔에도 출력)
"""

import sys
import os
import json
import re
import time
import argparse
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import groq_client, LLM_MODEL
from prompts import SYSTEM_PROMPT, build_prompt, ERROR_CATEGORIES
from eval.test_cases import TEST_CASES

RESULTS_DIR = Path(__file__).parent
VALID_CATEGORIES = set(ERROR_CATEGORIES)

LEVEL_RULES = {
    1: (
        "이 힌트는 레벨 1입니다. "
        "오류 위치(줄 번호)와 오류 타입만 알려줘야 합니다. "
        "수정 방법, 정답 코드, 코드 스니펫을 제시하면 안 됩니다."
    ),
    2: (
        "이 힌트는 레벨 2입니다. "
        "오류와 관련된 개념만 설명해야 합니다. "
        "실제 정답 코드나 풀이 코드를 포함하면 안 됩니다."
    ),
    3: (
        "이 힌트는 레벨 3입니다. "
        "pseudocode(의사코드)만 제공해야 합니다. "
        "실제 동작하는 코드(C, Python 등)를 포함하면 안 됩니다. "
        "pseudocode 필드가 비어있으면 안 됩니다."
    ),
}


# ── 힌트 생성 ─────────────────────────────────────────────────────────────────

def call_llm(case: dict, level: int) -> dict:
    prompt = build_prompt(
        case["problem"],
        case["expected_input"],
        case["expected_output"],
        case["code"],
        case["error_log"],
        level,
        case["language"],
    )
    res = groq_client.chat.completions.create(
        model=LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
    )
    raw = res.choices[0].message.content
    return json.loads(raw)


# ── 정량 평가 ─────────────────────────────────────────────────────────────────

def evaluate_categories(predicted: list[str], expected: list[str]) -> dict:
    pred_set = set(predicted)
    exp_set = set(expected)
    tp = len(pred_set & exp_set)
    precision = tp / len(pred_set) if pred_set else 0.0
    recall = tp / len(exp_set) if exp_set else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    invalid = [c for c in predicted if c not in VALID_CATEGORIES]
    return {
        "precision": round(precision, 3),
        "recall": round(recall, 3),
        "f1": round(f1, 3),
        "invalid_categories": invalid,
    }


def check_format(result: dict, level: int) -> dict:
    issues = []
    for field in ["explanation", "pseudocode", "error_categories", "title"]:
        if field not in result:
            issues.append(f"누락 필드: {field}")
    if level == 3 and not result.get("pseudocode", "").strip():
        issues.append("레벨 3인데 pseudocode가 비어있음")
    if level != 3 and result.get("pseudocode", "").strip():
        issues.append(f"레벨 {level}인데 pseudocode가 채워져 있음")
    return {"issues": issues, "passed": len(issues) == 0}


# ── LLM-as-judge ─────────────────────────────────────────────────────────────

JUDGE_SYSTEM = (
    "당신은 프로그래밍 교육 힌트의 품질을 평가하는 전문 심사위원입니다. "
    "반드시 다음 JSON 형식으로만 응답하세요: "
    '{"score": 1~5, "rule_violation": true/false, "violation_reason": "위반 내용 또는 빈 문자열", "comment": "평가 한 줄 요약"}'
)


def llm_judge(case: dict, level: int, hint_result: dict) -> dict:
    judge_prompt = (
        f"[문제]\n{case['problem']}\n\n"
        f"[버그 코드]\n{case['code']}\n\n"
        f"[에러 로그]\n{case['error_log']}\n\n"
        f"[힌트 레벨 규칙]\n{LEVEL_RULES[level]}\n\n"
        f"[생성된 힌트 explanation]\n{hint_result.get('explanation', '')}\n\n"
        f"[생성된 힌트 pseudocode]\n{hint_result.get('pseudocode', '')}\n\n"
        f"[분류된 error_categories]\n{hint_result.get('error_categories', [])}\n\n"
        "위 힌트를 평가하세요:\n"
        "1. score: 1(매우 나쁨) ~ 5(완벽) - 힌트가 학습에 얼마나 도움이 되는가\n"
        "2. rule_violation: 레벨 규칙을 위반했는가 (정답 코드 노출 등)\n"
        "3. violation_reason: 위반했다면 구체적으로 무엇을\n"
        "4. comment: 전반적인 평가 한 줄"
    )
    res = groq_client.chat.completions.create(
        model=LLM_MODEL,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": JUDGE_SYSTEM},
            {"role": "user", "content": judge_prompt},
        ],
    )
    return json.loads(res.choices[0].message.content)


# ── 메인 ─────────────────────────────────────────────────────────────────────

def run(use_judge: bool):
    results = []
    total_cases = sum(len(tc["levels"]) for tc in TEST_CASES)
    done = 0

    for case in TEST_CASES:
        case_results = {"id": case["id"], "language": case["language"], "levels": {}}

        for level in case["levels"]:
            done += 1
            print(f"[{done}/{total_cases}] {case['id']} 레벨 {level} ...", end=" ", flush=True)

            try:
                hint = call_llm(case, level)
            except Exception as e:
                print(f"ERROR: {e}")
                case_results["levels"][level] = {"error": str(e)}
                continue

            cat_eval = evaluate_categories(
                hint.get("error_categories", []),
                case["expected_categories"],
            )
            fmt_eval = check_format(hint, level)

            entry = {
                "hint": hint,
                "category_eval": cat_eval,
                "format_eval": fmt_eval,
            }

            if use_judge:
                try:
                    judgment = llm_judge(case, level, hint)
                    entry["judge"] = judgment
                except Exception as e:
                    entry["judge"] = {"error": str(e)}

            case_results["levels"][level] = entry

            status = "OK" if fmt_eval["passed"] and cat_eval["f1"] >= 0.5 else "WARN"
            print(f"{status} | F1={cat_eval['f1']:.2f} | fmt={'OK' if fmt_eval['passed'] else 'FAIL'}")

            time.sleep(0.5)  # rate limit 완화

        results.append(case_results)

    _save_and_report(results, use_judge)


def _save_and_report(results: list, use_judge: bool):
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_path = RESULTS_DIR / f"results_{ts}.json"
    report_path = RESULTS_DIR / f"report_{ts}.txt"

    result_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = [f"힌트 정확도 평가 리포트 ({ts})", "=" * 60, ""]

    all_f1, all_prec, all_rec = [], [], []
    format_fails = []
    violations = []

    for case_result in results:
        cid = case_result["id"]
        for level, data in case_result["levels"].items():
            if "error" in data:
                lines.append(f"[ERROR] {cid} L{level}: {data['error']}")
                continue
            ce = data["category_eval"]
            fe = data["format_eval"]
            all_f1.append(ce["f1"])
            all_prec.append(ce["precision"])
            all_rec.append(ce["recall"])

            if not fe["passed"]:
                format_fails.append(f"{cid} L{level}: {fe['issues']}")
            if ce["invalid_categories"]:
                format_fails.append(f"{cid} L{level} 허용목록 외 카테고리: {ce['invalid_categories']}")

            if use_judge and "judge" in data and "error" not in data.get("judge", {}):
                j = data["judge"]
                if j.get("rule_violation"):
                    violations.append(f"{cid} L{level}: {j.get('violation_reason', '')}")

    if all_f1:
        lines += [
            "■ 카테고리 분류 정확도",
            f"  평균 Precision : {sum(all_prec)/len(all_prec):.3f}",
            f"  평균 Recall    : {sum(all_rec)/len(all_rec):.3f}",
            f"  평균 F1        : {sum(all_f1)/len(all_f1):.3f}",
            "",
        ]

    if use_judge:
        all_scores = []
        for cr in results:
            for data in cr["levels"].values():
                j = data.get("judge", {})
                if "score" in j:
                    all_scores.append(j["score"])
        if all_scores:
            lines += [
                "■ LLM Judge 품질 점수 (1~5)",
                f"  평균 점수: {sum(all_scores)/len(all_scores):.2f}",
                f"  최소: {min(all_scores)}  최대: {max(all_scores)}",
                "",
            ]

    if format_fails:
        lines += ["■ 형식 오류 / 허용목록 외 카테고리"] + [f"  {f}" for f in format_fails] + [""]
    else:
        lines += ["■ 형식 오류: 없음", ""]

    if use_judge and violations:
        lines += ["■ 레벨 규칙 위반 (LLM Judge 판정)"] + [f"  {v}" for v in violations] + [""]
    elif use_judge:
        lines += ["■ 레벨 규칙 위반: 없음", ""]

    lines += ["", f"원시 결과: {result_path}"]
    report = "\n".join(lines)
    report_path.write_text(report, encoding="utf-8")
    print("\n" + report)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--judge", action="store_true", help="LLM-as-judge 품질 평가 포함")
    args = parser.parse_args()
    run(use_judge=args.judge)
