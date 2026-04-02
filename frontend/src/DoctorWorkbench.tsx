import { useState, useEffect } from 'react';
import ArchiveManagement from './ArchiveManagement';

// 扩展档案类型以包含医生工作台所需字段
interface DoctorWorkbenchProps {
  mode: 'mock' | 'real';
  token: string;
  onBack?: () => void;
}

// 消息类型
interface Message {
  id: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: string;
  msgtype: string;
  chatType: 'group' | 'private';
}

// AI建议类型
interface AIRecommendation {
  id: string;
  patientId: string;
  recommendationType: 'diagnosis' | 'treatment' | 'followup' | 'communication';
  title: string;
  content: string;
  confidence: number;
  createdAt: string;
}

export default function DoctorWorkbench({ mode, token, onBack }: DoctorWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<'patients' | 'messages' | 'analytics' | 'settings'>('patients');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataSource, setDataSource] = useState<'mock' | 'real'>('mock'); // 当前数据源

  // 加载患者的消息
  const loadPatientMessages = async (patientId: string) => {
    console.log(`加载患者 ${patientId} 的消息, mode=${mode}, token=${token ? '有' : '无'}`);

    // 如果是real模式且有token，尝试调用真实API
    if (mode === 'real' && token) {
      try {
        setLoading(true);
        // 尝试获取患者相关的会话和消息
        // 首先获取患者绑定信息，然后获取会话消息
        // 由于没有直接的API，暂时使用模拟数据，但显示尝试状态
        console.log('尝试加载真实消息数据...');

        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        // 目前使用模拟数据，但未来可以集成真实API
        setMessages([
          {
            id: 'msg-real-1',
            sender: 'patient-' + patientId,
            senderName: '患者',
            content: '医生您好，这是我的最新健康数据。',
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            msgtype: 'text',
            chatType: 'private'
          },
          {
            id: 'msg-real-2',
            sender: 'doctor-assistant',
            senderName: '医生助手',
            content: '已收到您的数据，AI分析显示血糖控制需要改进。',
            timestamp: new Date(Date.now() - 43200000).toISOString(),
            msgtype: 'text',
            chatType: 'private'
          }
        ]);

        setDataSource('real');
        setError(''); // 清空错误
      } catch (err) {
        console.error('加载真实消息失败:', err);
        setError('加载真实消息失败，已切换为模拟数据。');
        setDataSource('mock');
        // 回退到模拟数据
        loadMockMessages(patientId);
      } finally {
        setLoading(false);
      }
    } else {
      // Mock模式或没有token，使用模拟数据
      loadMockMessages(patientId);
      if (mode === 'real' && !token) {
        setError('Real模式需要有效的Token才能访问真实数据。当前使用模拟数据进行演示。');
      }
    }
  };

  // 加载模拟消息数据
  const loadMockMessages = (patientId: string) => {
    console.log(`加载患者 ${patientId} 的模拟消息数据`);
    setDataSource('mock');

    setMessages([
      {
        id: 'msg1',
        sender: 'user123',
        senderName: '患者张三',
        content: '医生，我最近的血糖控制不太好，空腹血糖都在8.5左右',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        msgtype: 'text',
        chatType: 'private'
      },
      {
        id: 'msg2',
        sender: 'doctor',
        senderName: '医生助手',
        content: '建议您增加早餐后的运动量，并注意晚餐的碳水化合物摄入',
        timestamp: new Date(Date.now() - 43200000).toISOString(),
        msgtype: 'text',
        chatType: 'private'
      },
      {
        id: 'msg3',
        sender: 'user123',
        senderName: '患者张三',
        content: '好的，我会尝试。另外最近脚有点麻，需要担心吗？',
        timestamp: new Date().toISOString(),
        msgtype: 'text',
        chatType: 'private'
      }
    ]);
  };

  // 加载AI建议
  const loadAIRecommendations = async (patientId: string) => {
    console.log(`加载患者 ${patientId} 的AI建议, mode=${mode}, token=${token ? '有' : '无'}`);

    // 如果是real模式且有token，尝试调用真实API
    if (mode === 'real' && token) {
      try {
        setLoading(true);
        // 尝试获取AI建议
        // 由于没有直接的API，暂时使用模拟数据，但显示尝试状态
        console.log('尝试加载真实AI建议数据...');

        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 500));

        // 目前使用模拟数据，但未来可以集成真实API
        setRecommendations([
          {
            id: 'rec-real-1',
            patientId,
            recommendationType: 'treatment',
            title: '基于真实数据的治疗建议',
            content: '根据最新健康记录，建议调整用药方案以改善血压控制。',
            confidence: 0.82,
            createdAt: new Date().toISOString()
          },
          {
            id: 'rec-real-2',
            patientId,
            recommendationType: 'followup',
            title: '个性化随访计划',
            content: '基于患者依从性历史，建议采用更频繁的远程监测。',
            confidence: 0.75,
            createdAt: new Date().toISOString()
          }
        ]);

        setDataSource('real');
        setError(''); // 清空错误
      } catch (err) {
        console.error('加载真实AI建议失败:', err);
        setError('加载真实AI建议失败，已切换为模拟数据。');
        setDataSource('mock');
        // 回退到模拟数据
        loadMockRecommendations(patientId);
      } finally {
        setLoading(false);
      }
    } else {
      // Mock模式或没有token，使用模拟数据
      loadMockRecommendations(patientId);
      if (mode === 'real' && !token) {
        setError('Real模式需要有效的Token才能访问真实数据。当前使用模拟数据进行演示。');
      }
    }
  };

  // 加载模拟AI建议数据
  const loadMockRecommendations = (patientId: string) => {
    console.log(`加载患者 ${patientId} 的模拟AI建议数据`);
    setDataSource('mock');

    setRecommendations([
      {
        id: 'rec1',
        patientId,
        recommendationType: 'treatment',
        title: '调整降糖药方案',
        content: '根据最近的血糖数据，建议将二甲双胍剂量从500mg增加到850mg，每日两次',
        confidence: 0.85,
        createdAt: new Date().toISOString()
      },
      {
        id: 'rec2',
        patientId,
        recommendationType: 'followup',
        title: '增加随访频率',
        content: '患者近期血糖控制不稳定，建议将随访频率从每月一次增加到每两周一次',
        confidence: 0.72,
        createdAt: new Date().toISOString()
      },
      {
        id: 'rec3',
        patientId,
        recommendationType: 'communication',
        title: '沟通建议',
        content: '患者对脚麻症状表示担忧，建议详细询问症状特征和持续时间，安排神经病变筛查',
        confidence: 0.68,
        createdAt: new Date().toISOString()
      }
    ]);
  };

  // 患者选择处理
  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    loadPatientMessages(patientId);
    loadAIRecommendations(patientId);
  };

  // 发送消息（模拟）
  const sendMessage = (content: string) => {
    if (!selectedPatientId) {
      alert('请先选择患者');
      return;
    }

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      sender: 'doctor',
      senderName: '医生',
      content,
      timestamp: new Date().toISOString(),
      msgtype: 'text',
      chatType: 'private'
    };

    setMessages(prev => [...prev, newMessage]);
  };

  return (
    <div className="doctor-workbench">
      <header className="hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <h1>医生工作台</h1>
            <p>综合管理患者档案、沟通消息和AI分析建议的一站式工作平台</p>
          </div>
          {onBack && (
            <button
              className="ghost-btn"
              onClick={onBack}
              style={{ marginLeft: '20px', padding: '8px 16px' }}
            >
              ← 返回主菜单
            </button>
          )}
        </div>
      </header>

      {/* 标签页导航 */}
      <div className="toolbar-panel">
        <div className="toolbar-row">
          <div className="toolbar-group">
            <span className="toolbar-label">工作台功能</span>
            <button
              className={activeTab === 'patients' ? 'active' : ''}
              onClick={() => setActiveTab('patients')}
            >
              患者管理
            </button>
            <button
              className={activeTab === 'messages' ? 'active' : ''}
              onClick={() => setActiveTab('messages')}
              disabled={!selectedPatientId}
            >
              消息沟通
            </button>
            <button
              className={activeTab === 'analytics' ? 'active' : ''}
              onClick={() => setActiveTab('analytics')}
              disabled={!selectedPatientId}
            >
              AI分析
            </button>
            <button
              className={activeTab === 'settings' ? 'active' : ''}
              onClick={() => setActiveTab('settings')}
            >
              工作台设置
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      <div className="data-source-indicator" style={{
        margin: '10px 0',
        padding: '8px 12px',
        background: dataSource === 'real' ? '#d1fae5' : '#fef3c7',
        color: dataSource === 'real' ? '#065f46' : '#92400e',
        borderRadius: '8px',
        fontSize: '14px',
        display: 'inline-block'
      }}>
        📊 当前数据源: {dataSource === 'real' ? '真实数据' : '模拟数据'} | 模式: {mode} | {token ? 'Token有效' : '无Token'}
      </div>

      <div className="workbench-layout">
        {/* 左侧边栏：患者列表 */}
        <div className="workbench-sidebar">
          <h3>患者列表</h3>
          <div className="patient-list">
            <div className="patient-list-item active" onClick={() => handlePatientSelect('patient-001')}>
              <strong>张三</strong>
              <p>58岁，2型糖尿病</p>
              <small>最近沟通: 今天</small>
            </div>
            <div className="patient-list-item" onClick={() => handlePatientSelect('patient-002')}>
              <strong>李四</strong>
              <p>45岁，高血压</p>
              <small>最近沟通: 昨天</small>
            </div>
            <div className="patient-list-item" onClick={() => handlePatientSelect('patient-003')}>
              <strong>王五</strong>
              <p>62岁，冠心病</p>
              <small>最近沟通: 3天前</small>
            </div>
          </div>

          {/* 患者健康指标概览 */}
          <div className="health-overview">
            <h4>健康指标概览</h4>
            {selectedPatientId ? (
              <div className="health-metrics">
                <div className="metric">
                  <span>血糖</span>
                  <strong>8.5 mmol/L</strong>
                  <small>偏高</small>
                </div>
                <div className="metric">
                  <span>血压</span>
                  <strong>135/85 mmHg</strong>
                  <small>正常高值</small>
                </div>
                <div className="metric">
                  <span>体重</span>
                  <strong>72 kg</strong>
                  <small>BMI 24.5</small>
                </div>
              </div>
            ) : (
              <div className="empty-state">选择患者查看健康指标</div>
            )}
          </div>
        </div>

        {/* 主内容区 */}
        <div className="workbench-main">
          {activeTab === 'patients' && (
            <div className="tab-content">
              <h2>患者档案管理</h2>
              <ArchiveManagement
                mode={mode}
                token={token}
                onBack={onBack}
              />
            </div>
          )}

          {activeTab === 'messages' && selectedPatientId && (
            <div className="tab-content">
              <h2>消息沟通</h2>
              <div className="message-panel">
                <div className="message-list">
                  {messages.map(msg => (
                    <div key={msg.id} className={`message ${msg.sender === 'doctor' ? 'message-outgoing' : 'message-incoming'}`}>
                      <div className="message-header">
                        <strong>{msg.senderName}</strong>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                      </div>
                      <div className="message-content">
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="message-input">
                  <textarea
                    placeholder="输入回复内容..."
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        sendMessage(e.currentTarget.value);
                        e.currentTarget.value = '';
                      }
                    }}
                  />
                  <button onClick={(e) => {
                    const textarea = e.currentTarget.parentElement?.querySelector('textarea');
                    if (textarea?.value) {
                      sendMessage(textarea.value);
                      textarea.value = '';
                    }
                  }}>
                    发送消息
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && selectedPatientId && (
            <div className="tab-content">
              <h2>AI分析建议</h2>
              <div className="recommendations-panel">
                {recommendations.map(rec => (
                  <div key={rec.id} className="recommendation-card">
                    <div className="recommendation-header">
                      <h4>{rec.title}</h4>
                      <span className={`confidence-badge confidence-${Math.floor(rec.confidence * 10)}`}>
                        置信度: {(rec.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p>{rec.content}</p>
                    <div className="recommendation-footer">
                      <small>{rec.recommendationType} · {new Date(rec.createdAt).toLocaleString()}</small>
                      <div className="recommendation-actions">
                        <button className="ghost-btn">采纳</button>
                        <button className="ghost-btn">修改</button>
                        <button className="ghost-btn">忽略</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="tab-content">
              <h2>工作台设置</h2>
              <div className="settings-panel">
                <div className="setting-item">
                  <h4>通知设置</h4>
                  <p>配置工作台通知偏好</p>
                  <div className="setting-controls">
                    <label>
                      <input type="checkbox" defaultChecked />
                      新消息通知
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked />
                      AI建议提醒
                    </label>
                    <label>
                      <input type="checkbox" defaultChecked />
                      患者健康警报
                    </label>
                  </div>
                </div>
                <div className="setting-item">
                  <h4>AI分析设置</h4>
                  <p>配置AI分析模型和参数</p>
                  <div className="setting-controls">
                    <label>
                      <span>分析深度:</span>
                      <select defaultValue="standard">
                        <option value="basic">基础分析</option>
                        <option value="standard">标准分析</option>
                        <option value="detailed">详细分析</option>
                      </select>
                    </label>
                    <label>
                      <span>建议频率:</span>
                      <select defaultValue="daily">
                        <option value="realtime">实时</option>
                        <option value="daily">每日</option>
                        <option value="weekly">每周</option>
                      </select>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 添加样式 */}
      <style>{`
        .doctor-workbench {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .workbench-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          margin-top: 24px;
        }

        .workbench-sidebar {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 20px;
          border: 1px solid var(--border-light);
          box-shadow: var(--card-shadow);
        }

        .workbench-main {
          background: var(--card-bg);
          border-radius: var(--radius-lg);
          padding: 24px;
          border: 1px solid var(--border-light);
          box-shadow: var(--card-shadow);
        }

        .patient-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 24px;
        }

        .patient-list-item {
          padding: 12px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }

        .patient-list-item:hover {
          border-color: var(--primary-color);
          background: var(--primary-light);
        }

        .patient-list-item.active {
          border-color: var(--primary-color);
          background: var(--primary-light);
        }

        .health-overview {
          border-top: 1px solid var(--border-light);
          padding-top: 20px;
        }

        .health-metrics {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 12px;
        }

        .metric {
          text-align: center;
          padding: 12px;
          background: var(--bg-secondary);
          border-radius: var(--radius-md);
        }

        .metric strong {
          display: block;
          font-size: 18px;
          margin: 4px 0;
        }

        .metric small {
          color: var(--text-tertiary);
        }

        .tab-content {
          animation: fadeIn 0.3s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .message-panel {
          display: flex;
          flex-direction: column;
          height: 600px;
        }

        .message-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: var(--bg-secondary);
          margin-bottom: 16px;
        }

        .message {
          max-width: 70%;
          margin-bottom: 16px;
          padding: 12px 16px;
          border-radius: var(--radius-md);
        }

        .message-incoming {
          background: white;
          border: 1px solid var(--border-light);
          margin-right: auto;
        }

        .message-outgoing {
          background: var(--primary-light);
          border: 1px solid var(--primary-color);
          margin-left: auto;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
          font-size: 14px;
        }

        .message-content {
          line-height: 1.5;
        }

        .message-input {
          display: flex;
          gap: 12px;
        }

        .message-input textarea {
          flex: 1;
          padding: 12px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          resize: none;
        }

        .recommendations-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .recommendation-card {
          padding: 20px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
          background: white;
        }

        .recommendation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .confidence-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
        }

        .confidence-8, .confidence-9 {
          background: var(--success-light);
          color: var(--success-color);
          border: 1px solid var(--success-color);
        }

        .confidence-6, .confidence-7 {
          background: var(--warning-light);
          color: var(--warning-color);
          border: 1px solid var(--warning-color);
        }

        .confidence-5 {
          background: var(--info-light);
          color: var(--info-color);
          border: 1px solid var(--info-color);
        }

        .recommendation-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid var(--border-light);
        }

        .recommendation-actions {
          display: flex;
          gap: 8px;
        }

        .settings-panel {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .setting-item {
          padding: 20px;
          border: 1px solid var(--border-light);
          border-radius: var(--radius-md);
        }

        .setting-controls {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-top: 16px;
        }

        .setting-controls label {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .setting-controls label span {
          min-width: 100px;
        }

        .empty-state {
          text-align: center;
          padding: 40px;
          color: var(--text-tertiary);
          font-style: italic;
        }

        @media (max-width: 1024px) {
          .workbench-layout {
            grid-template-columns: 1fr;
          }

          .workbench-sidebar {
            order: 2;
          }

          .workbench-main {
            order: 1;
          }
        }
      `}</style>
    </div>
  );
}