import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthPanel from './AuthPanel';
import * as authApi from '../api/auth';

jest.mock('../api/auth');

const mockOnLogin = jest.fn();

beforeEach(() => {
  jest.resetAllMocks();
});

describe('AuthPanel - 세종대 로그인', () => {
  it('카카오 버튼과 세종대 포털 버튼이 나란히 렌더링된다', () => {
    render(<AuthPanel onLogin={mockOnLogin} />);

    expect(screen.getByText('카카오로 로그인')).toBeInTheDocument();
    expect(screen.getByText('세종대 로그인')).toBeInTheDocument();
  });

  it('세종대 포털 버튼 클릭 시 학번/비밀번호 폼으로 전환된다', () => {
    render(<AuthPanel onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText('세종대 로그인'));

    expect(screen.getByPlaceholderText('학번')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('포털 비밀번호')).toBeInTheDocument();
    expect(screen.getByText('세종대 포털 로그인')).toBeInTheDocument();
  });

  it('세종대 폼에서 뒤로가기 클릭 시 소셜 버튼 화면으로 복귀한다', () => {
    render(<AuthPanel onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText('세종대 로그인'));
    expect(screen.getByPlaceholderText('학번')).toBeInTheDocument();

    fireEvent.click(screen.getByText('← 뒤로'));

    expect(screen.queryByPlaceholderText('학번')).not.toBeInTheDocument();
    expect(screen.getByText('카카오로 로그인')).toBeInTheDocument();
    expect(screen.getByText('세종대 로그인')).toBeInTheDocument();
  });

  it('학번과 비밀번호 입력 후 로그인 성공 시 onLogin을 호출한다', async () => {
    jest.spyOn(authApi, 'sejongLogin').mockResolvedValueOnce();

    render(<AuthPanel onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText('세종대 로그인'));
    fireEvent.change(screen.getByPlaceholderText('학번'), {
      target: { value: '21011234' },
    });
    fireEvent.change(screen.getByPlaceholderText('포털 비밀번호'), {
      target: { value: 'mypassword' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(authApi.sejongLogin).toHaveBeenCalledWith('21011234', 'mypassword');
      expect(mockOnLogin).toHaveBeenCalled();
    });
  });

  it('로그인 실패 시 에러 메시지를 표시한다', async () => {
    jest.spyOn(authApi, 'sejongLogin').mockRejectedValueOnce(
      new Error('세종대 포털 인증에 실패했습니다.')
    );

    render(<AuthPanel onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText('세종대 로그인'));
    fireEvent.change(screen.getByPlaceholderText('학번'), {
      target: { value: '21011234' },
    });
    fireEvent.change(screen.getByPlaceholderText('포털 비밀번호'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: '로그인' }));

    await waitFor(() => {
      expect(screen.getByText('세종대 포털 인증에 실패했습니다.')).toBeInTheDocument();
    });
    expect(mockOnLogin).not.toHaveBeenCalled();
  });

  it('세종대 폼으로 전환 시 입력값이 초기화된다', () => {
    render(<AuthPanel onLogin={mockOnLogin} />);

    fireEvent.click(screen.getByText('세종대 로그인'));
    fireEvent.change(screen.getByPlaceholderText('학번'), {
      target: { value: '21011234' },
    });
    fireEvent.click(screen.getByText('← 뒤로'));
    fireEvent.click(screen.getByText('세종대 로그인'));

    expect(screen.getByPlaceholderText('학번')).toHaveValue('');
  });
});
