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
    let resolvePromise: any;
    const delayedPromise = new Promise(resolve => {
      resolvePromise = () => resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { items: [], total_count: 0 } })
      });
    });

    mockFetch.mockImplementation(() => delayedPromise);

    // 使用real模式测试加载状态
    render(<ArchiveManagement mode="real" token="test-token" />);

    // 检查加载状态 - 组件显示"加载中..."
    expect(screen.getByText(/加载中|Loading/i)).toBeInTheDocument();

    // 解析promise让数据加载完成
    resolvePromise();

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

    // 使用real模式测试API错误
    render(<ArchiveManagement mode="real" token="test-token" />);

    // 等待错误信息显示 - 组件会显示格式化的错误信息
    // HTTP 500错误会显示: "服务器内部错误 (500): 后端服务出现异常。请检查后端日志或联系管理员。"
    await waitFor(() => {
      expect(screen.getByText(/服务器内部错误|后端服务出现异常/i)).toBeInTheDocument();
    });
  });

  test('displays mock archives in mock mode', async () => {
    render(<ArchiveManagement {...defaultProps} />);

    // 在mock模式下应该显示预定义的mock数据：user123和user456
    await waitFor(() => {
      expect(screen.getByText('user123')).toBeInTheDocument();
      expect(screen.getByText('user456')).toBeInTheDocument();
    });
  });

  test('allows searching archives in real mode', async () => {
    // Mock successful response for real mode
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: {
          items: [
            {
              id: '1',
              userId: 'user1',
              conversationId: 'conv123',
              basicInfo: '{"age": 30, "gender": "male"}',
              preferences: null,
              coreProblem: null,
              communicationSummary: null,
              followupFocus: null,
              personaSummary: null,
              recentIssueSummary: null,
              followupPlan: null,
              sourceConversations: null,
              updatedAt: '2024-01-01T10:00:00Z',
              createdAt: '2024-01-01T10:00:00Z'
            }
          ],
          total_count: 1
        }
      })
    });

    // 使用real模式测试API调用
    render(<ArchiveManagement mode="real" token="test-token" />);

    // 等待数据加载 - 组件显示的是userId字段
    await waitFor(() => {
      expect(screen.getByText('user1')).toBeInTheDocument();
    });

    // 输入搜索关键词
    const searchInput = screen.getByPlaceholderText(/输入关键词搜索档案/i);
    await userEvent.type(searchInput, '测试');

    // 检查搜索按钮并点击
    const searchButton = screen.getByRole('button', { name: /搜索/i });
    expect(searchButton).toBeInTheDocument();
    await userEvent.click(searchButton);
  });

  test('calls onBack callback when back button is clicked', async () => {
    const onBackMock = jest.fn();
    render(<ArchiveManagement {...defaultProps} onBack={onBackMock} />);

    // 查找返回按钮并点击 - 按钮文本为"← 返回工作台"
    const backButton = screen.getByText(/← 返回工作台/i);
    expect(backButton).toBeInTheDocument();
    await userEvent.click(backButton);
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });
});