import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorDisplay from './ErrorDisplay';

describe('ErrorDisplay组件', () => {
  const mockError = '这是一个测试错误';
  const mockTitle = '错误标题';

  it('默认渲染危险类型的错误', () => {
    render(<ErrorDisplay error={mockError} />);

    // 检查标题和消息
    expect(screen.getByText('出错了')).toBeInTheDocument();
    expect(screen.getByText('这是一个测试错误')).toBeInTheDocument();

    // 检查危险类型的样式
    const container = screen.getByRole('alert');
    expect(container).toHaveClass('bg-danger-light', 'border-danger-color');
  });

  it('支持自定义标题', () => {
    render(<ErrorDisplay error={mockError} title={mockTitle} />);
    expect(screen.getByText('错误标题')).toBeInTheDocument();
  });

  it('支持不同类型的错误样式', () => {
    const { rerender } = render(<ErrorDisplay error={mockError} variant="info" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-info-light', 'border-info-color');

    rerender(<ErrorDisplay error={mockError} variant="warning" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-warning-light', 'border-warning-color');

    rerender(<ErrorDisplay error={mockError} variant="success" />);
    expect(screen.getByRole('alert')).toHaveClass('bg-success-light', 'border-success-color');
  });

  it('支持重试按钮', () => {
    const mockRetry = jest.fn();
    render(<ErrorDisplay error={mockError} onRetry={mockRetry} />);

    const retryButton = screen.getByRole('button', { name: /重试/i });
    expect(retryButton).toBeInTheDocument();

    fireEvent.click(retryButton);
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('显示错误详情', () => {
    const errorWithStack = new Error('详细错误');
    errorWithStack.stack = '错误堆栈跟踪';

    render(<ErrorDisplay error={errorWithStack} showDetails />);

    // 检查详情摘要
    expect(screen.getByText('查看详情')).toBeInTheDocument();

    // 点击展开详情
    const details = screen.getByText('查看详情');
    fireEvent.click(details);

    // 检查堆栈跟踪
    expect(screen.getByText(/错误堆栈跟踪/)).toBeInTheDocument();
  });

  it('正确处理字符串错误', () => {
    render(<ErrorDisplay error="字符串错误" />);
    expect(screen.getByText('字符串错误')).toBeInTheDocument();
  });

  it('正确处理Error对象', () => {
    const errorObj = new Error('Error对象错误');
    render(<ErrorDisplay error={errorObj} />);
    expect(screen.getByText('Error对象错误')).toBeInTheDocument();
  });

  it('没有重试函数时不显示按钮', () => {
    render(<ErrorDisplay error={mockError} />);
    expect(screen.queryByRole('button', { name: /重试/i })).not.toBeInTheDocument();
  });
});