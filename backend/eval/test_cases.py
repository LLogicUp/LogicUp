"""
힌트 정확도 평가용 테스트 케이스 데이터셋

각 케이스:
  - problem: 문제 설명
  - expected_input / expected_output: 예시 입출력
  - code: 버그 있는 코드
  - error_log: 에러 메시지 (없으면 빈 문자열)
  - language: 언어
  - expected_categories: 예상 error_categories (정답)
  - levels: 테스트할 힌트 레벨 목록
  - level_rules: 레벨별 지켜야 할 규칙 설명 (LLM judge에게 전달)
"""

TEST_CASES = [
    # ── C 언어 ────────────────────────────────────────────────────────────────
    {
        "id": "c_printf_format",
        "language": "c",
        "problem": "두 정수 A, B를 입력받아 합을 출력하라.",
        "expected_input": "3 5",
        "expected_output": "8",
        "code": '#include <stdio.h>\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf(a + b);\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["입출력 형식 오류 (scanf/printf)"],
        "levels": [1, 2, 3],
    },
    {
        "id": "c_off_by_one",
        "language": "c",
        "problem": "배열 크기 5짜리 배열에 1~5를 저장하고 모두 출력하라.",
        "expected_input": "",
        "expected_output": "1 2 3 4 5",
        "code": '#include <stdio.h>\nint main() {\n    int arr[5];\n    for (int i = 0; i <= 5; i++) arr[i] = i + 1;\n    for (int i = 0; i <= 5; i++) printf("%d ", arr[i]);\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["배열 범위 초과"],
        "levels": [1, 2, 3],
    },
    {
        "id": "c_null_pointer",
        "language": "c",
        "problem": "동적 할당한 메모리에 값을 저장하고 출력하라.",
        "expected_input": "",
        "expected_output": "42",
        "code": '#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    int *p = NULL;\n    *p = 42;\n    printf("%d\\n", *p);\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["NULL 포인터 참조"],
        "levels": [1, 2],
    },
    {
        "id": "c_memory_leak",
        "language": "c",
        "problem": "정수를 동적 할당하여 저장하고 출력하라.",
        "expected_input": "",
        "expected_output": "10",
        "code": '#include <stdio.h>\n#include <stdlib.h>\nint main() {\n    int *p = (int*)malloc(sizeof(int));\n    *p = 10;\n    printf("%d\\n", *p);\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["메모리 누수 (free 누락)"],
        "levels": [1, 2],
    },
    {
        "id": "c_string_no_null",
        "language": "c",
        "problem": "문자열을 입력받아 출력하라.",
        "expected_input": "hello",
        "expected_output": "hello",
        "code": '#include <stdio.h>\nint main() {\n    char s[5] = {\'h\', \'e\', \'l\', \'l\', \'o\'};\n    printf("%s\\n", s);\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["문자열 종료 문자 누락"],
        "levels": [1, 2],
    },
    {
        "id": "c_infinite_loop",
        "language": "c",
        "problem": "1부터 10까지 출력하라.",
        "expected_input": "",
        "expected_output": "1 2 3 4 5 6 7 8 9 10",
        "code": '#include <stdio.h>\nint main() {\n    int i = 1;\n    while (i <= 10) {\n        printf("%d ", i);\n    }\n    return 0;\n}',
        "error_log": "",
        "expected_categories": ["무한루프"],
        "levels": [1, 2],
    },
    # ── Python ────────────────────────────────────────────────────────────────
    {
        "id": "py_index_error",
        "language": "python",
        "problem": "리스트의 첫 번째와 두 번째 원소의 합을 출력하라.",
        "expected_input": "1 2",
        "expected_output": "3",
        "code": "nums = list(map(int, input().split()))\nprint(nums[0] + nums[2])",
        "error_log": "",
        "expected_categories": ["리스트 인덱스 오류 (IndexError)", "배열 범위 초과"],
        "levels": [1, 2],
    },
    {
        "id": "py_int_division",
        "language": "python",
        "problem": "두 수를 입력받아 정수 나눗셈 결과를 출력하라.",
        "expected_input": "7 2",
        "expected_output": "3",
        "code": "a, b = map(int, input().split())\nprint(a / b)",
        "error_log": "",
        "expected_categories": ["정수 나눗셈 오류 (/ vs //)"],
        "levels": [1, 2],
    },
    {
        "id": "py_scope_error",
        "language": "python",
        "problem": "함수 안에서 전역 변수를 수정하여 출력하라.",
        "expected_input": "",
        "expected_output": "10",
        "code": "count = 0\ndef increment():\n    count += 1\nfor _ in range(10):\n    increment()\nprint(count)",
        "error_log": "",
        "expected_categories": ["변수 스코프 오류 (global/nonlocal 누락)"],
        "levels": [1, 2],
    },
    # ── 알고리즘 ──────────────────────────────────────────────────────────────
    {
        "id": "algo_binary_search",
        "language": "c",
        "problem": "정렬된 배열에서 이분 탐색으로 target을 찾아라.",
        "expected_input": "5 3\n1 2 3 4 5",
        "expected_output": "2",
        "code": '#include <stdio.h>\nint bsearch(int *arr, int n, int target) {\n    int lo = 0, hi = n;\n    while (lo < hi) {\n        int mid = (lo + hi) / 2;\n        if (arr[mid] == target) return mid;\n        else if (arr[mid] < target) lo = mid;\n        else hi = mid - 1;\n    }\n    return -1;\n}\nint main() {\n    int n, t; scanf("%d %d", &n, &t);\n    int arr[100]; for(int i=0;i<n;i++) scanf("%d",&arr[i]);\n    printf("%d\\n", bsearch(arr, n, t));\n}',
        "error_log": "",
        "expected_categories": ["이분 탐색 범위 오류", "이분 탐색 조건 오류"],
        "levels": [1, 2, 3],
    },
    {
        "id": "algo_dfs_no_visit",
        "language": "c",
        "problem": "인접 리스트로 주어진 그래프를 DFS로 탐색하라.",
        "expected_input": "4 4\n1 2\n1 3\n2 4\n3 4",
        "expected_output": "1 2 4 3",
        "code": '#include <stdio.h>\nint graph[5][5], n, m;\nvoid dfs(int v) {\n    printf("%d ", v);\n    for (int i = 1; i <= n; i++)\n        if (graph[v][i]) dfs(i);\n}\nint main() {\n    scanf("%d %d", &n, &m);\n    for (int i=0;i<m;i++) {\n        int u, v; scanf("%d %d",&u,&v);\n        graph[u][v]=graph[v][u]=1;\n    }\n    dfs(1);\n}',
        "error_log": "",
        "expected_categories": ["DFS 방문 체크 누락"],
        "levels": [1, 2, 3],
    },
]
