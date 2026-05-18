export interface OjProblemSummary {
  number: number;
  title: string;
}

export interface OJProblemSummary extends OjProblemSummary {
  id: number;
  week: number;
}

export interface OJLevelInfo {
  id: string;
  label: string;
  weeks: number[];
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

export async function fetchOJLevels(): Promise<OJLevelInfo[]> {
  const subjects = await fetchOjIndex();
  return subjects.map((subject) => ({
    id: subject.key,
    label: subject.label,
    weeks: subject.chapters.map((chapter) => chapter.chapter),
  }));
}

export async function fetchOJProblems(subject: string): Promise<OJProblemSummary[]> {
  const subjects = await fetchOjIndex();
  const selected = subjects.find((item) => item.key === subject);
  if (!selected) return [];

  return selected.chapters.flatMap((chapter) =>
    chapter.problems.map((problem) => ({
      ...problem,
      id: chapter.chapter * 1000 + problem.number,
      week: chapter.chapter,
    }))
  );
}
