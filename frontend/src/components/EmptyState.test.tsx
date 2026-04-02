import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from './EmptyState';

describe('EmptyState组件', () => {
  const mockTitle = '暂无数据';
  const mockDescription = '这里还没有任何内容，请添加一些数据。';

  it('渲染标题和描述', () => {
    render(<EmptyState title={mockTitle} description={mockDescription} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.getByText('这里还没有任何内容，请添加一些数据。')).toBeInTheDocument();
  });

  it('支持自定义图标', () => {
    const { container } = render(<EmptyState title={mockTitle} icon="📁" />);

    // 图标应该在文档中
    expect(screen.getByText('📁')).toBeInTheDocument();

    // 找到包含图标的div
    const iconDiv = container.querySelector('.text-4xl');
    expect(iconDiv).toBeInTheDocument();
    expect(iconDiv).toHaveClass('text-4xl', 'mb-4', 'opacity-60');
  });

  it('支持操作按钮', () => {
    const mockAction = jest.fn();
    render(
      <EmptyState
        title={mockTitle}
        action={{ label: '添加数据', onClick: mockAction }}
      />
    );

    const button = screen.getByRole('button', { name: '添加数据' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-primary-color', 'text-white');

    fireEvent.click(button);
    expect(mockAction).toHaveBeenCalledTimes(1);
  });

  it('没有描述时只显示标题', () => {
    render(<EmptyState title={mockTitle} />);

    expect(screen.getByText('暂无数据')).toBeInTheDocument();
    expect(screen.queryByText('这里还没有任何内容，请添加一些数据。')).not.toBeInTheDocument();
  });

  it('没有操作时不显示按钮', () => {
    render(<EmptyState title={mockTitle} />);

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('应用正确的样式类', () => {
    const { container } = render(<EmptyState title={mockTitle} />);

    // 最外层容器应该有正确的类
    const outerContainer = container.firstChild as HTMLElement;
    expect(outerContainer).toHaveClass('flex', 'flex-col', 'items-center', 'justify-center', 'py-12', 'px-4', 'text-center');
  });

  it('按钮有正确的悬停样式', () => {
    render(
      <EmptyState
        title={mockTitle}
        action={{ label: '测试按钮', onClick: jest.fn() }}
      />
    );

    const button = screen.getByRole('button');
    expect(button).toHaveClass('hover:bg-primary-hover');
  });
});