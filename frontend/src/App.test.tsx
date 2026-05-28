import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('./components/HistoryPage', () => () => <div>History Page</div>);
jest.mock('./pages/EditorPage', () => () => <div>Editor Page</div>);

test('renders the unauthenticated login screen', () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  expect(screen.getByRole('heading', { name: 'LogicUp' })).toBeInTheDocument();
  expect(screen.getByText('카카오로 로그인')).toBeInTheDocument();
  expect(screen.getByText('세종대 로그인')).toBeInTheDocument();
});
