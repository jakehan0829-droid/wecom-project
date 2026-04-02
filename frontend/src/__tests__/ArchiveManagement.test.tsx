import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArchiveManagement from '../ArchiveManagement';

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock console.error to avoid noise in test output
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ArchiveManagement Component', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  const defaultProps = {
    mode: 'mock' as const,
    token: 'test-token',
    onBack: jest.fn(),
  };

  test('renders component with default view', () => {
    render(<ArchiveManagement {...defaultProps} />);

    // 检查组件标题或关键元素
    expect(screen.getByText(/档案管理|Archives/i)).toBeInTheDocument();

    // 检查视图切换按钮
    expect(screen.getByRole('button', { name: /成员档案|Member Archives/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /患者档案|Patient Archives/i })).toBeInTheDocument();

    // 检查搜索框
    expect(screen.getByPlaceholderText(/搜索档案|Search archives/i)).toBeInTheDocument();
  });

  test('switches between member and patient views', async () => {
    render(<ArchiveManagement {...defaultProps} />);

    // 初始应该是成员档案视图
    expect(screen.getByRole('button', { name: /成员档案|Member Archives/i })).toHaveClass(/active/i);

    // 切换到患者档案视图
    const patientButton = screen.getByRole('button', { name: /患者档案|Patient Archives/i });
    await userEvent.click(patientButton);

    // 检查视图已切换
    expect(screen.getByRole('button', { name: /患者档案|Patient Archives/i })).toHaveClass(/active/i);
  });

  test('displays loading state when fetching data', async () => {
    // Mock fetch to delay response
    mockFetch.mockImplementation(() =>
      new Promise(resolve =>
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, data: { archives: [], total_count: 0 } })
        }), 100)
      )
    );

    render(<ArchiveManagement {...defaultProps} />);

    // 检查加载状态
    expect(screen.getByText(/加载中|Loading/i)).toBeInTheDocument();

    // 等待数据加载完成
    await waitFor(() => {
      expect(screen.queryByText(/加载中|Loading/i)).not.toBeInTheDocument();
    });
  });

  test('displays error message when API fails', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ success: false, message: '服务器错误' })
    });

    render(<ArchiveManagement {...defaultProps} />);

    // 等待错误信息显示
    await waitFor(() => {
      expect(screen.getByText(/服务器错误|Server error/i)).toBeInTheDocument();
    });
  });

  test('allows searching archives', async () => {
    // Mock successful response
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          archives: [
            {
              id: '1',
              userId: 'user1',
              display_name: '测试用户',
              basicInfo: '{"age": 30, "gender": "male"}',
              updatedAt: '2024-01-01T10:00:00Z'
            }
          ],
          total_count: 1
        }
      })
    });

    render(<ArchiveManagement {...defaultProps} />);

    // 等待数据加载
    await waitFor(() => {
      expect(screen.getByText('测试用户')).toBeInTheDocument();
    });

    // 输入搜索关键词
    const searchInput = screen.getByPlaceholderText(/搜索档案|Search archives/i);
    await userEvent.type(searchInput, '测试');

    // 检查搜索功能（这里假设组件有实时搜索或搜索按钮）
    const searchButton = screen.getByRole('button', { name: /搜索|Search/i });
    if (searchButton) {
      await userEvent.click(searchButton);
    }
  });

  test('calls onBack callback when back button is clicked', () => {
    const onBackMock = jest.fn();
    render(<ArchiveManagement {...defaultProps} onBack={onBackMock} />);

    // 查找返回按钮并点击
    const backButton = screen.getByRole('button', { name: /返回|Back/i });
    if (backButton) {
      userEvent.click(backButton);
      expect(onBackMock).toHaveBeenCalledTimes(1);
    }
  });
});