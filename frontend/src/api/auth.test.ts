import { sejongLogin } from './auth';

const TOKEN_KEY = 'lu_token';

beforeEach(() => {
  localStorage.clear();
  jest.resetAllMocks();
});

describe('sejongLogin', () => {
  it('성공 시 access_token을 localStorage에 저장한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'test-token-123' }),
    } as Response);

    await sejongLogin('21011234', 'mypassword');

    expect(localStorage.getItem(TOKEN_KEY)).toBe('test-token-123');
    expect(fetch).toHaveBeenCalledWith(
      'http://localhost:8000/auth/sejong',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: '21011234', password: 'mypassword' }),
      })
    );
  });

  it('401 응답 시 인증 실패 에러를 던진다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ detail: '세종대 포털 인증에 실패했습니다.' }),
    } as Response);

    await expect(sejongLogin('21011234', 'wrongpassword')).rejects.toThrow(
      '세종대 포털 인증에 실패했습니다.'
    );
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('502 응답 시 포털 연결 오류 에러를 던진다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ detail: '세종대 포털 서버에 연결할 수 없습니다.' }),
    } as Response);

    await expect(sejongLogin('21011234', 'mypassword')).rejects.toThrow(
      '세종대 포털 서버에 연결할 수 없습니다.'
    );
  });

  it('detail이 배열인 에러 응답을 올바르게 파싱한다', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ detail: [{ msg: 'Value error, 학번은 필수입니다.' }] }),
    } as Response);

    await expect(sejongLogin('', '')).rejects.toThrow('학번은 필수입니다.');
  });
});
