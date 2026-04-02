import React from 'react';
import { render, screen } from '@testing-library/react';
import Loading from './Loading';

describe('Loading组件', () => {
  it('默认渲染中等大小的加载指示器', () => {
    render(<Loading />);

    // 检查加载动画容器
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();

    // 检查默认文本
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('支持不同尺寸', () => {
    const { rerender } = render(<Loading size="small" />);

    // 小尺寸应该有相应的样式类
    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner.firstChild).toHaveClass('w-6', 'h-6', 'border-2');

    rerender(<Loading size="large" />);
    expect(spinner.firstChild).toHaveClass('w-16', 'h-16', 'border-4');
  });

  it('支持自定义文本', () => {
    render(<Loading text="正在加载数据..." />);
    expect(screen.getByText('正在加载数据...')).toBeInTheDocument();
  });

  it('支持全屏模式', () => {
    const { container } = render(<Loading fullScreen />);

    // 全屏模式应该有fixed定位
    const fullScreenDiv = container.firstChild as HTMLElement;
    expect(fullScreenDiv).toHaveClass('fixed', 'inset-0', 'bg-white', 'bg-opacity-80', 'flex', 'items-center', 'justify-center', 'z-50');
  });

  it('可以隐藏文本', () => {
    render(<Loading text="" />);

    // 不应该有文本元素
    expect(screen.queryByText('加载中...')).not.toBeInTheDocument();
  });

  it('应用正确的CSS变量', () => {
    render(<Loading />);

    const spinner = screen.getByRole('status', { hidden: true }).firstChild;

    // 检查内联样式中的CSS变量
    expect(spinner).toHaveStyle({
      borderTopColor: 'var(--primary-color)',
      borderBottomColor: 'var(--primary-color)'
    });
  });
});