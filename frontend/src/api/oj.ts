export interface OjProblemSummary {
  number: number;
  title: string;
}

export interface OjExample {
  input: string;
  output: string;
}

export interface OjProblemDetail extends OjProblemSummary {
  description: string;
  examples: OjExample[];
}

export interface OjChapterSummary {
  chapter: number;
  file: string;
  problems: OjProblemSummary[];
}

export interface OjSubjectSummary {
  key: string;
  label: string;
  chapters: OjChapterSummary[];
}

export async function fetchOjIndex(): Promise<OjSubjectSummary[]> {
  const res = await fetch('http://localhost:8000/oj');
  if (!res.ok) throw new Error('OJ 목록을 불러오지 못했습니다.');
  const data = await res.json();
  return data.subjects ?? [];
}

export async function fetchOjProblem(
  subject: string,
  chapter: string,
  problemNumber: string
): Promise<OjProblemDetail> {
  const res = await fetch(
    `http://localhost:8000/oj/${encodeURIComponent(subject)}/${encodeURIComponent(chapter)}/${encodeURIComponent(problemNumber)}`
  );
  if (!res.ok) throw new Error('OJ 문제를 불러오지 못했습니다.');
  const data = await res.json();
  return data.problem;
}
