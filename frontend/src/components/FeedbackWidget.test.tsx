import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeedbackWidget from './FeedbackWidget';

// Mock fetch API
global.fetch = jest.fn();

describe('FeedbackWidget组件', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('默认渲染反馈按钮', () => {
    render(<FeedbackWidget />);

    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    expect(feedbackButton).toBeInTheDocument();
    expect(feedbackButton).toHaveTextContent('反馈');
  });

  it('点击按钮打开反馈表单', async () => {
    render(<FeedbackWidget />);

    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 检查表单元素
    expect(screen.getByText('提供反馈')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/请告诉我们您的想法/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /提交反馈/i })).toBeInTheDocument();
  });

  it('可以关闭反馈表单', async () => {
    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 关闭表单
    const closeButton = screen.getByRole('button', { name: /✕/i });
    await userEvent.click(closeButton);

    // 表单应该关闭，按钮重新显示
    expect(screen.getByRole('button', { name: /反馈/i })).toBeInTheDocument();
    expect(screen.queryByText('提供反馈')).not.toBeInTheDocument();
  });

  it('可以选择评分', async () => {
    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 点击第三个星星
    const stars = screen.getAllByRole('button', { name: /★/i });
    await userEvent.click(stars[2]); // 第三颗星

    // 星星应该被选中
    expect(stars[0]).toHaveClass('text-yellow-400');
    expect(stars[1]).toHaveClass('text-yellow-400');
    expect(stars[2]).toHaveClass('text-yellow-400');
    expect(stars[3]).toHaveClass('text-gray-300');
    expect(stars[4]).toHaveClass('text-gray-300');
  });

  it('可以输入反馈内容', async () => {
    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 输入反馈内容
    const textarea = screen.getByPlaceholderText(/请告诉我们您的想法/i);
    const testComment = '这个功能很有用，但希望能添加更多选项。';
    await userEvent.type(textarea, testComment);

    expect(textarea).toHaveValue(testComment);
  });

  it('可以输入邮箱（当showEmail为true时）', async () => {
    render(<FeedbackWidget showEmail={true} />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 检查邮箱输入框
    const emailInput = screen.getByPlaceholderText(/your@email.com/i);
    expect(emailInput).toBeInTheDocument();

    // 输入邮箱
    const testEmail = 'test@example.com';
    await userEvent.type(emailInput, testEmail);
    expect(emailInput).toHaveValue(testEmail);
  });

  it('不显示邮箱输入框（当showEmail为false时）', async () => {
    render(<FeedbackWidget showEmail={false} />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 邮箱输入框不应该存在
    expect(screen.queryByPlaceholderText(/your@email.com/i)).not.toBeInTheDocument();
  });

  it('提交反馈表单', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });

    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 选择评分
    const stars = screen.getAllByRole('button', { name: /★/i });
    await userEvent.click(stars[4]); // 第五颗星

    // 输入反馈内容
    const textarea = screen.getByPlaceholderText(/请告诉我们您的想法/i);
    await userEvent.type(textarea, '非常好的功能！');

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /提交反馈/i });
    await userEvent.click(submitButton);

    // 检查fetch被调用
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/feedback',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
    });

    // 检查成功消息
    await waitFor(() => {
      expect(screen.getByText(/感谢您的反馈/i)).toBeInTheDocument();
    });
  });

  it('提交失败时显示错误消息', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 输入必要内容
    const textarea = screen.getByPlaceholderText(/请告诉我们您的想法/i);
    await userEvent.type(textarea, '测试反馈');

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /提交反馈/i });
    await userEvent.click(submitButton);

    // 检查错误消息
    await waitFor(() => {
      expect(screen.getByText(/提交失败/i)).toBeInTheDocument();
    });
  });

  it('自定义按钮文本', () => {
    render(<FeedbackWidget buttonText="意见反馈" />);

    const feedbackButton = screen.getByRole('button', { name: /意见反馈/i });
    expect(feedbackButton).toBeInTheDocument();
    expect(feedbackButton).toHaveTextContent('意见反馈');
  });

  it('支持自定义onSubmit回调', async () => {
    const mockOnSubmit = jest.fn();

    render(<FeedbackWidget onSubmit={mockOnSubmit} />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 输入内容
    const textarea = screen.getByPlaceholderText(/请告诉我们您的想法/i);
    await userEvent.type(textarea, '自定义回调测试');

    // 提交表单
    const submitButton = screen.getByRole('button', { name: /提交反馈/i });
    await userEvent.click(submitButton);

    // 检查自定义回调被调用
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          comment: '自定义回调测试',
          pageUrl: expect.any(String),
          userAgent: expect.any(String)
        })
      );
    });
  });

  it('提交按钮在无内容时禁用', async () => {
    render(<FeedbackWidget />);

    // 打开表单
    const feedbackButton = screen.getByRole('button', { name: /反馈/i });
    await userEvent.click(feedbackButton);

    // 提交按钮应该被禁用（无内容）
    const submitButton = screen.getByRole('button', { name: /提交反馈/i });
    expect(submitButton).toBeDisabled();

    // 输入内容后应该启用
    const textarea = screen.getByPlaceholderText(/请告诉我们您的想法/i);
    await userEvent.type(textarea, '测试内容');
    expect(submitButton).not.toBeDisabled();
  });
});