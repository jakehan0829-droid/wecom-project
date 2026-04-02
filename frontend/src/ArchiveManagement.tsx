import { useEffect, useState } from 'react';

// 档案类型
interface MemberArchive {
  id: string;
  userId: string;
  conversationId: string | null;
  basicInfo: string | null;
  preferences: string | null;
  coreProblem: string | null;
  communicationSummary: string | null;
  followupFocus: string | null;
  personaSummary: string | null;
  recentIssueSummary: string | null;
  followupPlan: string | null;
  sourceConversations: string | null;
  updatedAt: string;
  createdAt: string;
}

interface PatientArchive {
  patientId: string;
  name: string;
  basicInfo: string | null;
  preferences: string | null;
  coreProblem: string | null;
  communicationSummary: string | null;
  followupFocus: string | null;
  personaSummary: string | null;
  recentIssueSummary: string | null;
  followupPlan: string | null;
  sourceConversations: string | null;
  updatedAt: string;
}

interface ArchiveChangeLog {
  id: string;
  archiveType: 'patient' | 'member';
  archiveId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changeReason: string | null;
  operatorId: string | null;
  createdAt: string;
}

interface ArchiveManagementProps {
  mode: 'mock' | 'real';
  token: string;
  onBack?: () => void;
}

export default function ArchiveManagement({ mode, token, onBack }: ArchiveManagementProps) {
  const [view, setView] = useState<'member' | 'patient'>('member');
  const [memberArchives, setMemberArchives] = useState<MemberArchive[]>([]);
  const [patientArchives, setPatientArchives] = useState<PatientArchive[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<MemberArchive | PatientArchive | null>(null);
  const [changeLogs, setChangeLogs] = useState<ArchiveChangeLog[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 格式化友好错误消息
  const formatErrorMessage = (err: unknown, defaultMessage: string): string => {
    if (!(err instanceof Error)) return defaultMessage;

    const message = err.message;

    // HTTP错误状态码处理
    if (message.includes('HTTP error! status:')) {
      const statusMatch = message.match(/status: (\d+)/);
      if (statusMatch) {
        const status = parseInt(statusMatch[1]);
        switch (status) {
          case 401:
            return `认证失败 (401): Token无效或已过期。请检查Token是否正确，或在Mock模式下测试。`;
          case 403:
            return `权限不足 (403): 当前Token没有访问此资源的权限。`;
          case 404:
            return `资源未找到 (404): 请求的API接口不存在。请检查后端服务是否正常运行。`;
          case 500:
            return `服务器内部错误 (500): 后端服务出现异常。请检查后端日志或联系管理员。`;
          default:
            return `HTTP错误 (${status}): 请检查网络连接和后端服务状态。`;
        }
      }
    }

    // 特定错误消息处理
    if (message.includes('加载成员档案失败') || message.includes('加载患者档案失败')) {
      return `${message}。请确保：1) 后端服务正常运行，2) Token有效，3) 数据库中有测试数据。`;
    }

    if (message.includes('档案更新失败')) {
      return `${message}。可能原因：1) 网络连接问题，2) 数据格式不正确，3) 权限不足。`;
    }

    // 默认返回原始消息
    return message;
  };

  // 加载成员档案列表
  const loadMemberArchives = async () => {
    console.log('loadMemberArchives called', { mode, token, view });
    if (mode === 'mock') {
      // Mock数据 - 始终显示模拟数据
      console.log('Loading mock member archives');
      setMemberArchives([
        {
          id: 'mock-member-1',
          userId: 'user123',
          conversationId: 'conv123',
          basicInfo: '基本信息：男性，35岁，糖尿病患者',
          preferences: '偏好：喜欢文字沟通，关注血糖监测',
          coreProblem: '核心问题：血糖控制不稳定，空腹血糖8.5',
          communicationSummary: '沟通风格：直接，表达清晰，积极寻求医疗建议',
          followupFocus: '跟进重点：定期监测血糖，调整用药方案',
          personaSummary: '人物画像：注重健康管理，有糖尿病家族史',
          recentIssueSummary: '近期问题：饮食控制困难，血糖波动较大',
          followupPlan: '跟进计划：每周跟进一次，提供个性化饮食建议',
          sourceConversations: 'conv123;conv456;conv789',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        },
        {
          id: 'mock-member-2',
          userId: 'user456',
          conversationId: 'conv789',
          basicInfo: '基本信息：女性，52岁，高血压患者',
          preferences: '偏好：偏好电话沟通，关注血压管理',
          coreProblem: '核心问题：血压控制不佳，有心血管风险',
          communicationSummary: '沟通风格：详细描述症状，需要反复确认',
          followupFocus: '跟进重点：血压监测，生活方式调整',
          personaSummary: '人物画像：有高血压家族史，服药依从性一般',
          recentIssueSummary: '近期问题：血压波动，头晕症状',
          followupPlan: '跟进计划：每两周跟进一次，监测用药效果',
          sourceConversations: 'conv789;conv999',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    // Real模式但token为空
    if (!token) {
      setError('Real模式需要有效的Token。请在右上角输入有效的Bearer Token，或切换到Mock模式使用模拟数据。');
      setMemberArchives([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await fetch(`/api/v1/member-archives?keyword=${encodeURIComponent(searchKeyword)}&limit=20`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setMemberArchives(result.data?.items || []);
      } else {
        throw new Error(result.error?.message || '加载成员档案失败');
      }
    } catch (err) {
      setError(formatErrorMessage(err, '加载成员档案失败'));
    } finally {
      setLoading(false);
    }
  };

  // 加载患者档案列表（通过患者接口）
  const loadPatientArchives = async () => {
    console.log('loadPatientArchives called', { mode, token, view });
    if (mode === 'mock') {
      // Mock数据 - 始终显示模拟数据
      console.log('Loading mock patient archives');
      setPatientArchives([
        {
          patientId: 'patient-001',
          name: '张三',
          basicInfo: '男性，58岁，2型糖尿病患者，病史8年',
          preferences: '偏好：喜欢详细解释，关注用药副作用',
          coreProblem: '核心健康问题：血糖控制不稳定，胰岛素抵抗',
          communicationSummary: '沟通总结：积极配合治疗，但饮食控制困难',
          followupFocus: '跟进重点：血糖监测，胰岛素剂量调整',
          personaSummary: '人物画像：退休教师，注重健康管理，有学习意愿',
          recentIssueSummary: '近期问题：空腹血糖偏高，体重增加',
          followupPlan: '跟进计划：每周血糖监测，每月复诊评估',
          sourceConversations: 'conv-diabetes-group;conv-private-zhang',
          updatedAt: new Date().toISOString()
        },
        {
          patientId: 'patient-002',
          name: '李四',
          basicInfo: '女性，45岁，高血压患者，病史5年',
          preferences: '偏好：简洁明了的建议，关注生活方式调整',
          coreProblem: '核心健康问题：血压波动，晨峰高血压',
          communicationSummary: '沟通总结：经常忘记服药，需要提醒',
          followupFocus: '跟进重点：血压监测，服药依从性',
          personaSummary: '人物画像：上班族，工作压力大，运动不足',
          recentIssueSummary: '近期问题：工作压力导致血压升高',
          followupPlan: '跟进计划：每日血压监测，调整降压药',
          sourceConversations: 'conv-hypertension-group;conv-private-li',
          updatedAt: new Date().toISOString()
        },
        {
          patientId: 'patient-003',
          name: '王五',
          basicInfo: '男性，62岁，冠心病患者，支架术后2年',
          preferences: '偏好：家属参与决策，关注心血管风险',
          coreProblem: '核心健康问题：冠心病稳定期管理，血脂控制',
          communicationSummary: '沟通总结：详细描述症状，需要反复确认',
          followupFocus: '跟进重点：血脂监测，症状预警',
          personaSummary: '人物画像：退休工人，有吸烟史，已戒烟',
          recentIssueSummary: '近期问题：偶尔胸痛，担心复发',
          followupPlan: '跟进计划：定期心电图检查，强化降脂治疗',
          sourceConversations: 'conv-cardiac-group;conv-private-wang',
          updatedAt: new Date().toISOString()
        }
      ]);
      return;
    }

    // Real模式但token为空
    if (!token) {
      setError('Real模式需要有效的Token。请在右上角输入有效的Bearer Token，或切换到Mock模式使用模拟数据。');
      setPatientArchives([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      // 首先获取患者列表
      const patientsResponse = await fetch('/api/v1/patients', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!patientsResponse.ok) {
        throw new Error(`HTTP error! status: ${patientsResponse.status}`);
      }

      const patientsResult = await patientsResponse.json();
      if (patientsResult.success) {
        const patients = patientsResult.data || [];

        // 为每个患者加载档案信息
        const archives: PatientArchive[] = [];
        for (const patient of patients.slice(0, 10)) { // 限制前10个
          try {
            // 获取患者档案变更历史
            const changeLogResponse = await fetch(`/api/v1/patients/${patient.id}/archive-change-log?limit=5`, {
              headers: {
                Authorization: `Bearer ${token}`
              }
            });

            if (changeLogResponse.ok) {
              const changeLogResult = await changeLogResponse.json();
              if (changeLogResult.success) {
                // 从变更历史中提取最新档案信息
                const logs = changeLogResult.data || [];
                const latestLogs = logs.slice(0, 3);

                archives.push({
                  patientId: patient.id,
                  name: patient.name || `患者 ${patient.id.substring(0, 8)}`,
                  basicInfo: patient.basicInfo || null,
                  preferences: patient.preferences || null,
                  coreProblem: patient.coreProblem || null,
                  communicationSummary: patient.communicationSummary || null,
                  followupFocus: patient.followupFocus || null,
                  personaSummary: patient.personaSummary || null,
                  recentIssueSummary: patient.recentIssueSummary || null,
                  followupPlan: patient.followupPlan || null,
                  sourceConversations: patient.sourceConversations || null,
                  updatedAt: patient.updatedAt || new Date().toISOString()
                });
              }
            }
          } catch (err) {
            console.error(`加载患者 ${patient.id} 档案失败:`, err);
          }
        }

        setPatientArchives(archives);
      } else {
        throw new Error(patientsResult.error?.message || '加载患者列表失败');
      }
    } catch (err) {
      setError(formatErrorMessage(err, '加载患者档案失败'));
    } finally {
      setLoading(false);
    }
  };

  // 加载档案详情
  const loadArchiveDetail = async (archiveId: string, archiveType: 'member' | 'patient') => {
    console.log(`加载档案详情: archiveId=${archiveId}, archiveType=${archiveType}, mode=${mode}, token=${token ? '有' : '无'}`);

    if (mode !== 'real' || !token) {
      console.log('使用Mock数据加载档案详情');
      // Mock data
      if (archiveType === 'member') {
        setSelectedArchive({
          id: 'mock-member-1',
          userId: 'user123',
          conversationId: 'conv123',
          basicInfo: '基本信息：男性，35岁',
          preferences: '偏好：喜欢文字沟通',
          coreProblem: '核心问题：血糖控制不稳定',
          communicationSummary: '沟通风格：直接，表达清晰',
          followupFocus: '跟进重点：定期监测血糖',
          personaSummary: '人物画像：注重健康管理',
          recentIssueSummary: '近期问题：饮食控制困难',
          followupPlan: '跟进计划：每周跟进一次',
          sourceConversations: 'conv123;conv456',
          updatedAt: new Date().toISOString(),
          createdAt: new Date().toISOString()
        });
      } else {
        setSelectedArchive({
          patientId: 'patient-001',
          name: '张三',
          basicInfo: '患者基本信息',
          preferences: '患者偏好',
          coreProblem: '核心健康问题',
          communicationSummary: '沟通总结',
          followupFocus: '跟进重点',
          personaSummary: '人物画像',
          recentIssueSummary: '近期问题',
          followupPlan: '跟进计划',
          sourceConversations: '会话来源',
          updatedAt: new Date().toISOString()
        });
      }

      // Mock change logs
      setChangeLogs([
        {
          id: 'log-1',
          archiveType,
          archiveId,
          fieldName: 'basicInfo',
          oldValue: '旧信息',
          newValue: '新信息',
          changeReason: 'AI分析更新',
          operatorId: 'system',
          createdAt: new Date().toISOString()
        }
      ]);
      return;
    }

    try {
      setLoading(true);
      setError('');

      if (archiveType === 'member') {
        console.log(`调用成员档案详情API: /api/v1/member-archives/${archiveId}`);
        // 加载成员档案详情
        const response = await fetch(`/api/v1/member-archives/${archiveId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        console.log(`API响应状态: ${response.status}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log('API响应结果:', result);
        if (result.success) {
          console.log('设置选中档案:', result.data?.archive);
          // 处理可能的响应结构：result.data.archive 或 result.data
          const archiveData = result.data?.archive || result.data;
          if (!archiveData) {
            throw new Error('API响应中没有档案数据');
          }
          setSelectedArchive(archiveData);
          setChangeLogs(result.data?.changeLog || []);
        } else {
          throw new Error(result.error?.message || '加载成员档案详情失败');
        }
      } else {
        // 加载患者档案详情（通过患者接口和变更历史）
        // 这里简化处理，实际应该调用专门的档案接口
        const patientResponse = await fetch(`/api/v1/patients/${archiveId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!patientResponse.ok) {
          throw new Error(`HTTP error! status: ${patientResponse.status}`);
        }

        const patientResult = await patientResponse.json();
        if (patientResult.success) {
          const patient = patientResult.data;

          // 加载变更历史
          const changeLogResponse = await fetch(`/api/v1/patients/${archiveId}/archive-change-log?limit=20`, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          });

          let changeLogs: ArchiveChangeLog[] = [];
          if (changeLogResponse.ok) {
            const changeLogResult = await changeLogResponse.json();
            if (changeLogResult.success) {
              changeLogs = changeLogResult.data || [];
            }
          }

          setSelectedArchive({
            patientId: patient.id,
            name: patient.name || `患者 ${patient.id.substring(0, 8)}`,
            basicInfo: patient.basicInfo || null,
            preferences: patient.preferences || null,
            coreProblem: patient.coreProblem || null,
            communicationSummary: patient.communicationSummary || null,
            followupFocus: patient.followupFocus || null,
            personaSummary: patient.personaSummary || null,
            recentIssueSummary: patient.recentIssueSummary || null,
            followupPlan: patient.followupPlan || null,
            sourceConversations: patient.sourceConversations || null,
            updatedAt: patient.updatedAt || new Date().toISOString()
          });
          setChangeLogs(changeLogs);
        } else {
          throw new Error(patientResult.error?.message || '加载患者详情失败');
        }
      }
    } catch (err) {
      setError(formatErrorMessage(err, '加载档案详情失败'));
    } finally {
      setLoading(false);
    }
  };

  // 更新档案
  const updateArchive = async (updates: Record<string, string>) => {
    if (!selectedArchive) {
      alert('请先选择档案');
      return;
    }

    // Mock模式：模拟更新
    if (mode !== 'real' || !token) {
      // 更新本地选中的档案
      const updatedArchive = { ...selectedArchive, ...updates, updatedAt: new Date().toISOString() };
      setSelectedArchive(updatedArchive);

      // 更新列表中的档案
      if ('userId' in selectedArchive) {
        setMemberArchives(prev => prev.map(archive =>
          archive.userId === selectedArchive.userId ? { ...archive, ...updates, updatedAt: new Date().toISOString() } : archive
        ));
      } else {
        setPatientArchives(prev => prev.map(archive =>
          archive.patientId === selectedArchive.patientId ? { ...archive, ...updates, updatedAt: new Date().toISOString() } : archive
        ));
      }

      alert('Mock模式：档案更新成功（模拟）');
      return;
    }

    try {
      setLoading(true);
      setError('');

      let response;
      if ('userId' in selectedArchive) {
        // 更新成员档案
        response = await fetch(`/api/v1/member-archives/${selectedArchive.userId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
      } else {
        // 更新患者档案（通过患者profile接口）
        response = await fetch(`/api/v1/patients/${selectedArchive.patientId}/profile`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updates)
        });
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        alert('档案更新成功');
        // 重新加载当前档案
        if ('userId' in selectedArchive) {
          await loadArchiveDetail(selectedArchive.userId, 'member');
        } else {
          await loadArchiveDetail(selectedArchive.patientId, 'patient');
        }
      } else {
        throw new Error(result.error?.message || '档案更新失败');
      }
    } catch (err) {
      setError(formatErrorMessage(err, '档案更新失败'));
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    console.log('ArchiveManagement useEffect triggered', { view, mode, token });
    if (view === 'member') {
      loadMemberArchives();
    } else {
      loadPatientArchives();
    }
  }, [view, mode, token]);

  // 组件挂载时确保加载数据
  useEffect(() => {
    console.log('ArchiveManagement mounted, view:', view);
    if (view === 'member' && memberArchives.length === 0) {
      loadMemberArchives();
    } else if (view === 'patient' && patientArchives.length === 0) {
      loadPatientArchives();
    }
  }, []);

  // 将文本分割成列表
  const splitTextIntoList = (text: string | null): string[] => {
    if (!text || text.trim() === '') return [];
    // 按句号、分号、换行符分割
    return text
      .split(/[。；;\\n]+/)
      .map(item => item.trim())
      .filter(item => item.length > 0);
  };

  // 渲染档案字段
  const renderArchiveField = (label: string, value: string | null, fieldName?: string) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');

    // 特殊处理basicInfo字段 - 解析为键值对
    const parseBasicInfo = (text: string | null) => {
      if (!text) return [];
      const pairs: Array<{key: string, value: string}> = [];
      // 尝试按逗号、顿号分割
      const segments = text.split(/[，,、]+/).map(s => s.trim()).filter(s => s);
      for (const segment of segments) {
        if (segment.includes(':')) {
          const [key, ...valParts] = segment.split(':');
          pairs.push({key: key.trim(), value: valParts.join(':').trim()});
        } else if (segment.includes('：')) {
          const [key, ...valParts] = segment.split('：');
          pairs.push({key: key.trim(), value: valParts.join('：').trim()});
        } else {
          pairs.push({key: segment, value: ''});
        }
      }
      return pairs;
    };

    const handleSave = () => {
      if (fieldName && selectedArchive) {
        updateArchive({ [fieldName]: editValue });
      }
      setIsEditing(false);
    };

    return (
      <div className="archive-field" key={label}>
        <strong>{label}:</strong>
        {isEditing ? (
          <div className="archive-edit">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
            />
            <div className="archive-edit-actions">
              <button onClick={handleSave} disabled={loading}>保存</button>
              <button onClick={() => {
                setIsEditing(false);
                setEditValue(value || '');
              }}>取消</button>
            </div>
          </div>
        ) : (
          <div className="archive-value">
            {value ? (
              (() => {
                const items = splitTextIntoList(value);
                if (items.length > 1) {
                  return (
                    <ol className="archive-list">
                      {items.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ol>
                  );
                } else {
                  return <p>{value}</p>;
                }
              })()
            ) : (
              <p>未设置</p>
            )}
            {fieldName && (
              <button
                className="ghost-btn"
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                编辑
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  console.log('ArchiveManagement渲染:', {
    view,
    selectedArchive: selectedArchive ? `有选中档案 (${'userId' in selectedArchive ? '成员' : '患者'})` : '无选中档案',
    memberArchivesCount: memberArchives.length,
    patientArchivesCount: patientArchives.length,
    loading,
    error
  });

  return (
    <div className="archive-management">
      <header className="hero">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div>
            <h1>档案管理</h1>
            <p>查看和管理成员/患者档案，支持手动编辑和查看变更历史</p>
          </div>
          {onBack && (
            <button
              className="ghost-btn"
              onClick={onBack}
              style={{ marginLeft: '20px', padding: '8px 16px' }}
            >
              ← 返回工作台
            </button>
          )}
        </div>
      </header>

      <div className="toolbar-panel">
        <div className="toolbar-row">
          <div className="toolbar-group">
            <span className="toolbar-label">档案类型</span>
            <button
              className={view === 'member' ? 'active' : ''}
              onClick={() => setView('member')}
            >
              成员档案
            </button>
            <button
              className={view === 'patient' ? 'active' : ''}
              onClick={() => setView('patient')}
            >
              患者档案
            </button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">搜索</span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="输入关键词搜索档案..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (view === 'member') {
                    loadMemberArchives();
                  } else {
                    loadPatientArchives();
                  }
                }
              }}
            />
            <button
              onClick={() => {
                if (view === 'member') {
                  loadMemberArchives();
                } else {
                  loadPatientArchives();
                }
              }}
              disabled={loading}
            >
              搜索
            </button>
          </div>
        </div>
      </div>

      {loading && <div className="info-box">加载中...</div>}
      {error && <div className="error-box">{error}</div>}


      <div className="archive-layout">
        {/* 档案列表 */}
        <div className="archive-list-panel">
          <h3>{view === 'member' ? '成员档案列表' : '患者档案列表'}</h3>
          <div className="archive-list">
            {view === 'member' ? (
              memberArchives.length === 0 ? (
                <div className="empty-state">暂无成员档案</div>
              ) : (
                memberArchives.map((archive) => (
                  <div
                    key={archive.id}
                    className={`archive-list-item ${selectedArchive && 'userId' in selectedArchive && selectedArchive.userId === archive.userId ? 'active' : ''}`}
                    onClick={() => loadArchiveDetail(archive.userId, 'member')}
                  >
                    <strong>{archive.userId}</strong>
                    <p>{archive.basicInfo?.substring(0, 50) || '无基本信息'}</p>
                    <small>更新于: {new Date(archive.updatedAt).toLocaleDateString()}</small>
                  </div>
                ))
              )
            ) : (
              patientArchives.length === 0 ? (
                <div className="empty-state">暂无患者档案</div>
              ) : (
                patientArchives.map((archive) => (
                  <div
                    key={archive.patientId}
                    className={`archive-list-item ${selectedArchive && 'patientId' in selectedArchive && selectedArchive.patientId === archive.patientId ? 'active' : ''}`}
                    onClick={() => loadArchiveDetail(archive.patientId, 'patient')}
                  >
                    <strong>{archive.name}</strong>
                    <p>{archive.basicInfo?.substring(0, 50) || '无基本信息'}</p>
                    <small>更新于: {new Date(archive.updatedAt).toLocaleDateString()}</small>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* 档案详情 */}
        <div className="archive-detail-panel">
          {selectedArchive ? (
            <>
              <h3>档案详情</h3>
              <div className="archive-detail">
                {'userId' in selectedArchive ? (
                  <>
                    <h4>成员档案 - {selectedArchive.userId}</h4>
                    {renderArchiveField('基本信息', selectedArchive.basicInfo, 'basicInfo')}
                    {renderArchiveField('偏好与习惯', selectedArchive.preferences, 'preferences')}
                    {renderArchiveField('核心问题', selectedArchive.coreProblem, 'coreProblem')}
                    {renderArchiveField('沟通风格总结', selectedArchive.communicationSummary, 'communicationSummary')}
                    {renderArchiveField('人物画像总结', selectedArchive.personaSummary, 'personaSummary')}
                    {renderArchiveField('近期问题摘要', selectedArchive.recentIssueSummary, 'recentIssueSummary')}
                    {renderArchiveField('跟进计划', selectedArchive.followupPlan, 'followupPlan')}
                    {renderArchiveField('后续跟进重点', selectedArchive.followupFocus, 'followupFocus')}
                    {renderArchiveField('来源会话', selectedArchive.sourceConversations, 'sourceConversations')}
                  </>
                ) : (
                  <>
                    <h4>患者档案 - {selectedArchive.name}</h4>
                    <div className="archive-cards">
                      {/* 基本信息卡片 */}
                      <div className="archive-card">
                        <h5>基本信息</h5>
                        {renderArchiveField('患者信息', selectedArchive.basicInfo, 'basicInfo')}
                        {renderArchiveField('偏好与习惯', selectedArchive.preferences, 'preferences')}
                      </div>

                      {/* 健康问题卡片 */}
                      <div className="archive-card">
                        <h5>健康问题</h5>
                        {renderArchiveField('核心问题', selectedArchive.coreProblem, 'coreProblem')}
                        {renderArchiveField('近期问题摘要', selectedArchive.recentIssueSummary, 'recentIssueSummary')}
                      </div>

                      {/* 沟通与画像卡片 */}
                      <div className="archive-card">
                        <h5>沟通与画像</h5>
                        {renderArchiveField('沟通风格总结', selectedArchive.communicationSummary, 'communicationSummary')}
                        {renderArchiveField('人物画像总结', selectedArchive.personaSummary, 'personaSummary')}
                      </div>

                      {/* 行动计划卡片 */}
                      <div className="archive-card">
                        <h5>行动计划</h5>
                        {renderArchiveField('跟进计划', selectedArchive.followupPlan, 'followupPlan')}
                        {renderArchiveField('后续跟进重点', selectedArchive.followupFocus, 'followupFocus')}
                      </div>

                      {/* 其他信息卡片 */}
                      <div className="archive-card">
                        <h5>其他信息</h5>
                        {renderArchiveField('来源会话', selectedArchive.sourceConversations, 'sourceConversations')}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* 变更历史 */}
              <div className="change-log-panel">
                <h4>变更历史</h4>
                {changeLogs.length === 0 ? (
                  <div className="empty-state">暂无变更记录</div>
                ) : (
                  <div className="change-log-list">
                    {changeLogs.map((log) => (
                      <div key={log.id} className="change-log-item">
                        <div className="change-log-header">
                          <strong>{log.fieldName}</strong>
                          <small>{new Date(log.createdAt).toLocaleString()}</small>
                        </div>
                        <div className="change-log-content">
                          <div>操作人: {log.operatorId || 'system'}</div>
                          <div>变更原因: {log.changeReason || '未说明'}</div>
                          {log.oldValue && <div>旧值: {log.oldValue.substring(0, 100)}</div>}
                          {log.newValue && <div>新值: {log.newValue.substring(0, 100)}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="empty-state">
              请从左侧列表选择一个档案查看详情
              <div style={{ fontSize: '12px', color: '#999', marginTop: '10px' }}>
                调试信息: view={view}, mode={mode}, token={token ? '有' : '无'}, selectedArchive={selectedArchive ? '有' : '无'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}