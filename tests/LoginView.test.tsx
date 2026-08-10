import React from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import LoginView from '../components/auth/LoginView';

describe('LoginView', () => {
  it('shows a server connection error when email-only verification times out', async () => {
    const timeoutError = new Error('schedule_editor_verification_timeout');

    render(
      <LoginView
        mode="dialog"
        defaultEmail="editor@example.com"
        onSignIn={async () => undefined}
        onEmailOnlySignIn={async () => {
          throw timeoutError;
        }}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mở chỉnh sửa' }));

    expect(screen.getByRole('button', { name: 'Đang kiểm tra...' })).toBeDisabled();

    await waitFor(() => {
      expect(
        screen.getByText('Không kết nối được máy chủ chỉnh sửa. Vui lòng thử lại sau ít phút.'),
      ).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: 'Mở chỉnh sửa' })).toBeEnabled();
  });
});
