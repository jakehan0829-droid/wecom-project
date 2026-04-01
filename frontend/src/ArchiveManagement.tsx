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
}

export default function ArchiveManagement({ mode, token }: ArchiveManagementProps) {
  const [view, setView] = useState<'member' | 'patient'>('member');
  const [memberArchives, setMemberArchives] = useState<MemberArchive[]>([]);
  const [patientArchives, setPatientArchives] = useState<PatientArchive[]>([]);
  const [selectedArchive, setSelectedArchive] = useState<MemberArchive | PatientArchive | null>(null);
  const [changeLogs, setChangeLogs] = useState<ArchiveChangeLog[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 加载成员档案列表
  const loadMemberArchives = async () => {
    if (mode !== 'real' || !token) {
      // Mock data
      setMemberArchives([
        {
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
        }
      ]);
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
      setError(err instanceof Error ? err.message : '加载成员档案失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载患者档案列表（通过患者接口）
  const loadPatientArchives = async () => {
    if (mode !== 'real' || !token) {
      // Mock data
      setPatientArchives([
        {
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
        }
      ]);
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
      setError(err instanceof Error ? err.message : '加载患者档案失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载档案详情
  const loadArchiveDetail = async (archiveId: string, archiveType: 'member' | 'patient') => {
    if (mode !== 'real' || !token) {
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
        // 加载成员档案详情
        const response = await fetch(`/api/v1/member-archives/${archiveId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
          setSelectedArchive(result.data?.archive || null);
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
      setError(err instanceof Error ? err.message : '加载档案详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 更新档案
  const updateArchive = async (updates: Record<string, string>) => {
    if (mode !== 'real' || !token || !selectedArchive) {
      alert('Mock模式下无法保存更改');
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
      setError(err instanceof Error ? err.message : '档案更新失败');
    } finally {
      setLoading(false);
    }
  };

  // 初始化加载
  useEffect(() => {
    if (view === 'member') {
      loadMemberArchives();
    } else {
      loadPatientArchives();
    }
  }, [view, mode, token]);

  // 渲染档案字段
  const renderArchiveField = (label: string, value: string | null, fieldName?: string) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || '');

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
            <p>{value || '未设置'}</p>
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

  return (
    <div className="archive-management">
      <header className="hero">
        <div>
          <h1>档案管理</h1>
          <p>查看和管理成员/患者档案，支持手动编辑和查看变更历史</p>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}