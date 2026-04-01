import { useEffect, useMemo, useState } from 'react';
import mockPayload from '../governance-dashboard/mock-data.json';
import { governanceDashboardSections } from '../governance-dashboard/schema';
import { actionLabelMap, bindingTypeLabelMap, matchedByLabelMap, mappingStatusLabelMap, toDisplayLabel } from '../governance-dashboard/display-dictionary';
import ArchiveManagement from './ArchiveManagement';

type DashboardPayload = typeof mockPayload;
type DashboardData = DashboardPayload['data'];
type Mode = 'mock' | 'real';
type TimePreset = 'today' | 'this_week' | '7d';
type PageView = 'dashboard' | 'conversation-detail' | 'archive-management';
type GovernanceAction = 'confirm' | 'reassign' | 'unconfirm' | 'promote_binding';

type ConversationDetail = Record<string, unknown> | null;
type ConversationMessage = Record<string, unknown>;
type AuditItem = Record<string, unknown>;
type InsightItem = Record<string, unknown> | null;
type BusinessFeedbackItem = Record<string, unknown> | null;
type ActionItem = Record<string, unknown>;

type FeedbackStatus = 'done' | 'closed' | 'failed';
type FeedbackType = 'completed' | 'failed' | 'no_response' | 'rescheduled' | 'duplicate' | 'not_needed';
type ArchiveCorrectionType = 'add' | 'update' | 'delete' | 'note' | 'skip';

const ARCHIVE_CORRECTION_OPTIONS: Array<{ value: ArchiveCorrectionType; label: string; feedbackType: FeedbackType; status: FeedbackStatus }> = [
  { value: 'add', label: '新增内容', feedbackType: 'completed', status: 'done' },
  { value: 'update', label: '修改原内容', feedbackType: 'rescheduled', status: 'done' },
  { value: 'delete', label: '删除错误内容', feedbackType: 'duplicate', status: 'done' },
  { value: 'note', label: '补充备注', feedbackType: 'completed', status: 'done' },
  { value: 'skip', label: '暂不写入', feedbackType: 'not_needed', status: 'closed' }
];

const archiveCorrectionLabelMap: Record<ArchiveCorrectionType, string> = {
  add: '新增内容',
  update: '修改原内容',
  delete: '删除错误内容',
  note: '补充备注',
  skip: '暂不写入'
};

const feedbackTypeLabelMap: Record<FeedbackType, string> = {
  completed: '已完成',
  failed: '执行失败',
  no_response: '无响应',
  rescheduled: '改期/延期',
  duplicate: '重复动作',
  not_needed: '无需继续'
};

const feedbackStatusLabelMap: Record<FeedbackStatus, string> = {
  done: '已完成',
  closed: '已关闭',
  failed: '已失败'
};
type PatientOption = {
  id: string;
  name: string;
  phone?: string;
  gender?: string;
  riskLevel?: string;
  managementStatus?: string;
  source?: string;
  diabetesType?: string;
  wecomExternalUserId?: string;
  recentConversationCount?: number;
  recentConversationName?: string;
  recentConversationId?: string;
  latestInsightSummary?: string;
};

const columnLabelMap: Record<string, string> = {
  createdAt: '时间',
  action: '动作',
  conversationId: '会话ID',
  platformChatId: '会话标识',
  total: '动作数',
  lastActionAt: '最近动作时间',
  fromPatientId: '原患者ID',
  toPatientId: '目标患者ID',
  matchedBy: '命中来源',
  operatorNote: '备注',
  customerId: '客户ID',
  lastMessageAt: '最近消息时间',
  messageCount: '消息数',
  status: '状态'
};

function getFeedbackStatusBadgeClass(value: unknown) {
  if (value === 'done') return 'status-inline-badge-done';
  if (value === 'closed') return 'status-inline-badge-closed';
  if (value === 'failed') return 'status-inline-badge-failed';
  return 'status-inline-badge-default';
}

function formatValue(key: string, value: unknown) {
  if (key === 'action') return toDisplayLabel(actionLabelMap, value);
  if (key === 'matchedBy') return toDisplayLabel(matchedByLabelMap, value);
  if (key === 'mappingStatus') return toDisplayLabel(mappingStatusLabelMap, value);
  if (key === 'bindingType') return toDisplayLabel(bindingTypeLabelMap, value);
  if (key === 'feedbackType' && typeof value === 'string' && value in feedbackTypeLabelMap) {
    return feedbackTypeLabelMap[value as FeedbackType];
  }
  if (key === 'feedbackStatus' && typeof value === 'string' && value in feedbackStatusLabelMap) {
    return feedbackStatusLabelMap[value as FeedbackStatus];
  }
  if (key.toLowerCase().includes('at') && typeof value === 'string') {
    const timestamp = Date.parse(value);
    return Number.isNaN(timestamp) ? value : new Date(timestamp).toLocaleString('zh-CN');
  }
  if (value == null || value === '') return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function getPathValue(obj: unknown, path: string) {
  return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function getEmptyCopy(sectionKey: string) {
  if (sectionKey === 'latestUnmappedCustomers') return '当前没有未映射对象';
  if (sectionKey === 'latestConflictCustomers') return '当前没有冲突对象';
  if (sectionKey === 'recentActions') return '当前筛选范围内暂无治理动作';
  return '暂无数据';
}

function getMessageSender(msg: ConversationMessage) {
  return String(msg.senderName || msg.senderRole || msg.senderId || msg.from || '-');
}

function getMessageType(msg: ConversationMessage) {
  return String(msg.msgType || msg.messageType || msg.type || '-');
}

function getMessageContent(msg: ConversationMessage) {
  const candidates = [msg.content, msg.summaryText, msg.text, msg.body];
  const first = candidates.find((item) => item != null && item !== '');
  if (typeof first === 'string') return first;
  if (first && typeof first === 'object') return JSON.stringify(first, null, 2);
  return '-';
}

function normalizePatientOption(item: Record<string, unknown>): PatientOption {
  const recentConversations = Array.isArray(item.recentConversations) ? item.recentConversations as Array<Record<string, unknown>> : [];
  const latestInsight = item.latestInsight && typeof item.latestInsight === 'object' ? item.latestInsight as Record<string, unknown> : null;
  return {
    id: String(item.id || item.patientId || ''),
    name: String(item.name || item.patientName || item.nickname || item.id || '-'),
    phone: item.phone ? String(item.phone) : item.mobile ? String(item.mobile) : undefined,
    gender: item.gender ? String(item.gender) : undefined,
    riskLevel: item.riskLevel ? String(item.riskLevel) : undefined,
    managementStatus: item.managementStatus ? String(item.managementStatus) : undefined,
    source: item.source ? String(item.source) : undefined,
    diabetesType: item.diabetesType ? String(item.diabetesType) : undefined,
    wecomExternalUserId: item.wecomExternalUserId ? String(item.wecomExternalUserId) : undefined,
    recentConversationCount: recentConversations.length,
    recentConversationName: recentConversations[0]?.conversationName ? String(recentConversations[0].conversationName) : undefined,
    recentConversationId: recentConversations[0]?.conversationId ? String(recentConversations[0].conversationId) : undefined,
    latestInsightSummary: latestInsight?.summaryText ? String(latestInsight.summaryText) : undefined
  };
}

async function apiGet(path: string, token: string) {
  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error?.message || '请求失败');
  return json.data;
}

async function apiPost(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error?.message || '提交失败');
  return json.data;
}

async function apiPatch(path: string, token: string, body: Record<string, unknown>) {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error?.message || '提交失败');
  return json.data;
}

function CardsSection({ section, data }: { section: (typeof governanceDashboardSections)[number]; data: DashboardData }) {
  const cards = getPathValue({ data }, section.source) as Record<string, number>;
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p>当前筛选窗口内的治理动作统计</p>
        </div>
      </div>
      <div className="cards-grid">
        {'items' in section && section.items?.map((item) => (
          <div key={item.key} className="card-item">
            <div className="card-label">{item.label}</div>
            <div className="card-value">{cards?.[item.key] ?? 0}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ChartSection({ section, data }: { section: (typeof governanceDashboardSections)[number]; data: DashboardData }) {
  const rows = (getPathValue({ data }, section.source) as Array<Record<string, unknown>>) || [];
  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>{section.title}</h2>
          <p>{section.key === 'byAction' ? '不同治理动作类型的数量分布' : '治理动作命中来源分布'}</p>
        </div>
      </div>
      <div className="chart-list">
        {rows.length ? rows.map((row, index) => (
          <div key={index} className="chart-row">
            <span>{formatValue(row.action ? 'action' : 'matchedBy', row.action ?? row.matchedBy)}</span>
            <strong>{String(row.total ?? 0)}</strong>
          </div>
        )) : <div className="empty">{getEmptyCopy(section.key)}</div>}
      </div>
    </section>
  );
}

function GovernanceForm({
  conversationId,
  token,
  mode,
  currentMapping,
  conversationMeta,
  onSubmitted
}: {
  conversationId: string;
  token: string;
  mode: Mode;
  currentMapping: {
    mappingStatus?: unknown;
    patientId?: unknown;
    matchedBy?: unknown;
    bindingType?: unknown;
    primaryCustomerId?: unknown;
  };
  conversationMeta?: {
    conversationName?: unknown;
    platformChatId?: unknown;
  };
  onSubmitted: (message: string) => void;
}) {
  const [action, setAction] = useState<GovernanceAction>('reassign');
  const [patientId, setPatientId] = useState('');
  const [toPatientId, setToPatientId] = useState('');
  const [patientKeyword, setPatientKeyword] = useState('');
  const [patientOptions, setPatientOptions] = useState<PatientOption[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientError, setPatientError] = useState('');
  const [patientDetailCache, setPatientDetailCache] = useState<Record<string, PatientOption>>({});
  const [bindingType, setBindingType] = useState<'wecom_user' | 'external_user'>('external_user');
  const [operatorName, setOperatorName] = useState('HanCong');
  const [operatorNote, setOperatorNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedPatientOptions = patientOptions.filter((option) => option.id === patientId || option.id === toPatientId);

  const actionHelpMap: Record<GovernanceAction, string> = {
    confirm: '把当前会话手工确认到某个 patient。适合未映射但已能明确判断归属的会话。',
    reassign: '把当前会话从当前归属改绑到新的 patient。适合修正错误归属。',
    unconfirm: '撤销当前会话的人工确认。适合回退错误治理结果。',
    promote_binding: '把会话级映射提升为正式 binding。适合已经确认稳定归属的对象。'
  };

  async function loadPatients(keyword = '') {
    if (mode !== 'real' || !token.trim()) {
      setPatientOptions([]);
      setPatientError('');
      return;
    }

    try {
      setPatientsLoading(true);
      setPatientError('');
      const result = await apiGet('/api/v1/patients', token.trim());
      const rows = Array.isArray(result)
        ? result
        : result && typeof result === 'object' && Array.isArray((result as { items?: unknown[] }).items)
          ? (result as { items: unknown[] }).items
          : [];
      const normalized = rows
        .map((item) => normalizePatientOption(item as Record<string, unknown>))
        .filter((item) => item.id)
        .filter((item) => {
          if (!keyword.trim()) return true;
          const haystack = `${item.id} ${item.name} ${item.phone || ''} ${item.wecomExternalUserId || ''} ${item.riskLevel || ''} ${item.managementStatus || ''} ${item.diabetesType || ''}`.toLowerCase();
          return haystack.includes(keyword.trim().toLowerCase());
        })
        .slice(0, 8);
      setPatientOptions(normalized);
      normalized.slice(0, 3).forEach(async (option) => {
        if (patientDetailCache[option.id]) return;
        try {
          const detail = await apiGet(`/api/v1/patients/${encodeURIComponent(option.id)}`, token.trim());
          setPatientDetailCache((prev) => ({ ...prev, [option.id]: normalizePatientOption(detail as Record<string, unknown>) }));
        } catch {
          // 忽略单个 patient 详情补充失败，避免打断主流程
        }
      });
    } catch (err) {
      setPatientError(err instanceof Error ? err.message : '患者列表请求失败');
    } finally {
      setPatientsLoading(false);
    }
  }

  useEffect(() => {
    loadPatients(patientKeyword);
  }, [mode, token, patientKeyword, patientDetailCache]);

  function applyPatient(option: PatientOption) {
    if (action === 'reassign') {
      setToPatientId(option.id);
    } else {
      setPatientId(option.id);
    }
  }

  function validate() {
    if (mode !== 'real') return null;
    if (!token.trim()) return '提交治理动作前需要 Bearer token';
    if ((action === 'confirm' || action === 'promote_binding') && !patientId.trim()) return 'patientId 不能为空';
    if (action === 'reassign' && !toPatientId.trim()) return 'toPatientId 不能为空';
    if (!operatorNote.trim()) return 'operatorNote 建议必填，便于审计追踪';
    return null;
  }

  async function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (mode !== 'real') {
      onSubmitted('当前为 mock 模式，治理动作仅做表单演示，未提交真实接口。');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      if (action === 'confirm') {
        await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/mapping/confirm`, token.trim(), {
          patientId,
          operatorName,
          operatorNote
        });
      } else if (action === 'reassign') {
        await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/mapping/reassign`, token.trim(), {
          toPatientId,
          operatorName,
          operatorNote
        });
      } else if (action === 'promote_binding') {
        await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/mapping/promote-binding`, token.trim(), {
          patientId,
          bindingType,
          operatorName,
          operatorNote
        });
      } else {
        await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/mapping/unconfirm`, token.trim(), {
          operatorName,
          operatorNote
        });
      }
      onSubmitted(`治理动作已提交：${action}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="governance-form">
      <div className="current-mapping-card">
        <div className="current-mapping-head">当前映射快照</div>
        <div className="current-mapping-grid">
          <div><span>mappingStatus</span><strong>{formatValue('mappingStatus', currentMapping.mappingStatus)}</strong></div>
          <div><span>patientId</span><strong>{formatValue('patientId', currentMapping.patientId)}</strong></div>
          <div><span>matchedBy</span><strong>{formatValue('matchedBy', currentMapping.matchedBy)}</strong></div>
          <div><span>bindingType</span><strong>{formatValue('bindingType', currentMapping.bindingType)}</strong></div>
        </div>
        <div className="mapping-context-row">
          <div className="mapping-context-card">
            <span>当前会话ID</span>
            <strong>{conversationId}</strong>
          </div>
          <div className="mapping-context-card">
            <span>会话名称 / 标识</span>
            <strong>{String(conversationMeta?.conversationName || '-')} / {String(conversationMeta?.platformChatId || '-')}</strong>
          </div>
          <div className="mapping-context-card">
            <span>当前主客户</span>
            <strong>{formatValue('customerId', currentMapping.primaryCustomerId)}</strong>
          </div>
          <div className="mapping-context-card">
            <span>命中方式</span>
            <strong>{formatValue('matchedBy', currentMapping.matchedBy)}</strong>
          </div>
        </div>
      </div>

      <div className="toolbar-row">
        <div className="toolbar-group">
          <span className="toolbar-label">动作</span>
          {(['confirm', 'reassign', 'unconfirm', 'promote_binding'] as GovernanceAction[]).map((item) => (
            <button key={item} type="button" className={action === item ? 'active' : ''} onClick={() => setAction(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="help-box">{actionHelpMap[action]}</div>

      {(action === 'confirm' || action === 'reassign' || action === 'promote_binding') && (
        <>
          <div className="form-row">
            <label>患者检索</label>
            <input value={patientKeyword} onChange={(e) => setPatientKeyword(e.target.value)} placeholder="按 patientId / 姓名 / 手机筛选" />
          </div>
          {patientsLoading && <div className="info-box">正在加载 patient 列表...</div>}
          {patientError && <div className="error-box">{patientError}</div>}
          {!!patientOptions.length && (
            <>
            <div className="candidate-compare-grid">
              {[...patientOptions].sort((left, right) => {
                const leftDetail = patientDetailCache[left.id] || left;
                const rightDetail = patientDetailCache[right.id] || right;
                const leftScore = (
                  (currentMapping.primaryCustomerId && leftDetail.id === String(currentMapping.primaryCustomerId) ? 3 : 0) +
                  (currentMapping.patientId && leftDetail.id === String(currentMapping.patientId) ? 3 : 0) +
                  (leftDetail.recentConversationName ? 2 : 0) +
                  (leftDetail.recentConversationId ? 2 : 0) +
                  (leftDetail.latestInsightSummary ? 1 : 0) +
                  (currentMapping.matchedBy ? 1 : 0)
                );
                const rightScore = (
                  (currentMapping.primaryCustomerId && rightDetail.id === String(currentMapping.primaryCustomerId) ? 3 : 0) +
                  (currentMapping.patientId && rightDetail.id === String(currentMapping.patientId) ? 3 : 0) +
                  (rightDetail.recentConversationName ? 2 : 0) +
                  (rightDetail.recentConversationId ? 2 : 0) +
                  (rightDetail.latestInsightSummary ? 1 : 0) +
                  (currentMapping.matchedBy ? 1 : 0)
                );
                return rightScore - leftScore;
              }).slice(0, 2).map((option, index) => {
                const enrichedOption = patientDetailCache[option.id] || option;
                const topReason = [
                  currentMapping.primaryCustomerId && enrichedOption.id === String(currentMapping.primaryCustomerId) ? '主客户一致' : '',
                  currentMapping.patientId && enrichedOption.id === String(currentMapping.patientId) ? '映射对象一致' : '',
                  enrichedOption.recentConversationName ? `最近会话：${enrichedOption.recentConversationName}` : '',
                  currentMapping.matchedBy ? `命中：${formatValue('matchedBy', currentMapping.matchedBy)}` : ''
                ].filter(Boolean)[0] || '暂无明显推荐线索';
                const notChosenReason = currentMapping.primaryCustomerId && enrichedOption.id !== String(currentMapping.primaryCustomerId)
                  ? '当前主客户仍指向其他对象'
                  : currentMapping.patientId && enrichedOption.id !== String(currentMapping.patientId)
                    ? '当前映射结果尚未切到该候选'
                    : '当前尚未执行切换动作';
                return (
                  <div key={`top-${option.id}`} className={`candidate-compare-card ${index === 0 ? 'top-rank-1' : 'top-rank-2'}`}>
                    <div className="candidate-compare-head">
                      <strong>{index === 0 ? 'TOP 1 候选' : 'TOP 2 候选'}</strong>
                      <span>{enrichedOption.name}</span>
                    </div>
                    <div className="candidate-compare-meta">
                      <div><span>patientId</span><strong>{enrichedOption.id}</strong></div>
                      <div><span>推荐摘要</span><strong>{topReason}</strong></div>
                      <div><span>为何当前未选</span><strong>{notChosenReason}</strong></div>
                    </div>
                  </div>
                );
              })}
              <div className="candidate-compare-card current-context-card">
                <div className="candidate-compare-head">
                  <strong>当前会话上下文</strong>
                  <span>{conversationId}</span>
                </div>
                <div className="candidate-compare-meta">
                  <div><span>主客户</span><strong>{formatValue('customerId', currentMapping.primaryCustomerId)}</strong></div>
                  <div><span>命中方式</span><strong>{formatValue('matchedBy', currentMapping.matchedBy)}</strong></div>
                </div>
              </div>
            </div>
            <div className="patient-option-list">
              {[...patientOptions].sort((left, right) => {
                const leftDetail = patientDetailCache[left.id] || left;
                const rightDetail = patientDetailCache[right.id] || right;
                const leftScore = (
                  (currentMapping.primaryCustomerId && leftDetail.id === String(currentMapping.primaryCustomerId) ? 3 : 0) +
                  (currentMapping.patientId && leftDetail.id === String(currentMapping.patientId) ? 3 : 0) +
                  (leftDetail.recentConversationName ? 2 : 0) +
                  (leftDetail.recentConversationId ? 2 : 0) +
                  (leftDetail.latestInsightSummary ? 1 : 0) +
                  (currentMapping.matchedBy ? 1 : 0)
                );
                const rightScore = (
                  (currentMapping.primaryCustomerId && rightDetail.id === String(currentMapping.primaryCustomerId) ? 3 : 0) +
                  (currentMapping.patientId && rightDetail.id === String(currentMapping.patientId) ? 3 : 0) +
                  (rightDetail.recentConversationName ? 2 : 0) +
                  (rightDetail.recentConversationId ? 2 : 0) +
                  (rightDetail.latestInsightSummary ? 1 : 0) +
                  (currentMapping.matchedBy ? 1 : 0)
                );
                return rightScore - leftScore;
              }).map((option, index) => {
                const enrichedOption = patientDetailCache[option.id] || option;
                const active = action === 'reassign' ? toPatientId === option.id : patientId === option.id;
                const groupedReasons = {
                  identity: [
                    currentMapping.primaryCustomerId && enrichedOption.id === String(currentMapping.primaryCustomerId) ? '与当前主客户一致' : '',
                    currentMapping.patientId && enrichedOption.id === String(currentMapping.patientId) ? '与当前映射 patient 一致' : ''
                  ].filter(Boolean),
                  conversation: [
                    enrichedOption.recentConversationName ? `最近会话命中：${enrichedOption.recentConversationName}` : '',
                    enrichedOption.recentConversationId ? `最近会话ID：${enrichedOption.recentConversationId}` : ''
                  ].filter(Boolean),
                  clue: [
                    currentMapping.matchedBy ? `命中方式参考：${formatValue('matchedBy', currentMapping.matchedBy)}` : '',
                    enrichedOption.latestInsightSummary ? '存在最近洞察摘要' : ''
                  ].filter(Boolean)
                };
                const matchScore = groupedReasons.identity.length * 3 + groupedReasons.conversation.length * 2 + groupedReasons.clue.length;
                const matchReasons = Object.values(groupedReasons).flat();
                const topReason = groupedReasons.identity[0] || groupedReasons.conversation[0] || groupedReasons.clue[0] || '暂无明显推荐线索';
                return (
                  <button key={option.id} type="button" className={`patient-option ${active ? 'active' : ''} ${index === 0 ? 'top-rank top-rank-1' : index === 1 ? 'top-rank top-rank-2' : ''}`} onClick={() => applyPatient(enrichedOption)}>
                    <strong>{enrichedOption.name}</strong>
                    <span>{enrichedOption.id}</span>
                    {index === 0 && <span className="patient-rank-badge">TOP 1</span>}
                    {index === 1 && <span className="patient-rank-badge patient-rank-badge-secondary">TOP 2</span>}
                    {(index === 0 || index === 1) && <span className="patient-top-summary">推荐摘要：{topReason}</span>}
                    <span className="patient-match-score">匹配强度：{matchScore}</span>
                    {enrichedOption.phone && <span>手机：{enrichedOption.phone}</span>}
                    {(enrichedOption.gender || enrichedOption.diabetesType) && <span>基础信息：{enrichedOption.gender || '-'} / {enrichedOption.diabetesType || '-'}</span>}
                    {(enrichedOption.riskLevel || enrichedOption.managementStatus) && <span>管理信息：{enrichedOption.riskLevel || '-'} / {enrichedOption.managementStatus || '-'}</span>}
                    {enrichedOption.source && <span>来源：{enrichedOption.source}</span>}
                    {enrichedOption.recentConversationCount != null && <span>最近会话：{enrichedOption.recentConversationCount} 条{enrichedOption.recentConversationName ? ` / ${enrichedOption.recentConversationName}` : ''}</span>}
                    {enrichedOption.recentConversationId && <span>最近会话ID：{enrichedOption.recentConversationId}</span>}
                    {enrichedOption.latestInsightSummary && <span>最近洞察：{enrichedOption.latestInsightSummary}</span>}
                    {!!matchReasons.length && (
                      <div className="patient-match-reason-list">
                        <div className="patient-match-reason-title">匹配理由</div>
                        {!!groupedReasons.identity.length && (
                          <div className="patient-match-group">
                            <div className="patient-match-group-title">身份一致</div>
                            {groupedReasons.identity.map((reason) => <span key={reason} className="patient-match-reason">• {reason}</span>)}
                          </div>
                        )}
                        {!!groupedReasons.conversation.length && (
                          <div className="patient-match-group">
                            <div className="patient-match-group-title">会话相关</div>
                            {groupedReasons.conversation.map((reason) => <span key={reason} className="patient-match-reason">• {reason}</span>)}
                          </div>
                        )}
                        {!!groupedReasons.clue.length && (
                          <div className="patient-match-group">
                            <div className="patient-match-group-title">命中线索</div>
                            {groupedReasons.clue.map((reason) => <span key={reason} className="patient-match-reason">• {reason}</span>)}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            </>
          )}
        </>
      )}

      {(action === 'confirm' || action === 'promote_binding') && (
        <div className="form-row">
          <label>patientId</label>
          <input value={patientId} onChange={(e) => setPatientId(e.target.value)} placeholder="输入或点击上方 patient 选项" />
        </div>
      )}

      {action === 'reassign' && (
        <div className="form-row">
          <label>toPatientId</label>
          <input value={toPatientId} onChange={(e) => setToPatientId(e.target.value)} placeholder="输入或点击上方 patient 选项" />
        </div>
      )}

      {!!selectedPatientOptions.length && (
        <div className="selected-patient-card">
          {selectedPatientOptions.map((option) => (
            <div key={option.id}>
              <div className="selected-patient-title">已选 patient</div>
              <div>{option.name} / {option.id}{option.phone ? ` / ${option.phone}` : ''}</div>
              {(option.recentConversationName || option.latestInsightSummary) && (
                <div className="selected-patient-extra">
                  {option.recentConversationName && <div>最近会话：{option.recentConversationName}</div>}
                  {option.latestInsightSummary && <div>最近洞察：{option.latestInsightSummary}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {action === 'promote_binding' && (
        <div className="form-row">
          <label>bindingType</label>
          <div className="action-cell">
            <button type="button" className={bindingType === 'external_user' ? 'active' : ''} onClick={() => setBindingType('external_user')}>external_user</button>
            <button type="button" className={bindingType === 'wecom_user' ? 'active' : ''} onClick={() => setBindingType('wecom_user')}>wecom_user</button>
          </div>
        </div>
      )}

      <div className="form-row">
        <label>operatorName</label>
        <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="输入操作人姓名" />
      </div>

      <div className="form-row form-row-top">
        <label>operatorNote</label>
        <input value={operatorNote} onChange={(e) => setOperatorNote(e.target.value)} placeholder="输入备注，建议写清原因、依据和预期结果" />
      </div>

      {error && <div className="error-box">{error}</div>}
      <div className="action-cell">
        <button type="button" className="active" onClick={handleSubmit} disabled={submitting}>{submitting ? '提交中...' : '提交治理动作'}</button>
      </div>
    </div>
  );
}

function getAuditTransitionValue(audit: AuditItem | null, key: string, fallbackKey?: string) {
  if (!audit) return undefined;
  const detail = audit.detail && typeof audit.detail === 'object' ? audit.detail as Record<string, unknown> : null;
  return audit[key] ?? (fallbackKey ? audit[fallbackKey] : undefined) ?? detail?.[key] ?? (fallbackKey ? detail?.[fallbackKey] : undefined);
}

function buildAuditSummary(audit: AuditItem | null) {
  if (!audit) return '';
  const action = String(audit.action || '');
  const fromStatus = formatValue('mappingStatus', getAuditTransitionValue(audit, 'fromMappingStatus', 'previousMappingStatus'));
  const toStatus = formatValue('mappingStatus', getAuditTransitionValue(audit, 'mappingStatus', 'toMappingStatus'));
  if (action === 'reassign') {
    return `已从 ${formatValue('fromPatientId', audit.fromPatientId)} 改到 ${formatValue('toPatientId', audit.toPatientId)}，状态 ${fromStatus} -> ${toStatus}`;
  }
  if (action === 'promote_binding') {
    return `已提升为 binding：${formatValue('bindingType', audit.bindingType)}，状态 ${fromStatus} -> ${toStatus}`;
  }
  if (action === 'manual_unconfirm' || action === 'unconfirm') {
    return `已撤销人工确认，状态 ${fromStatus} -> ${toStatus}`;
  }
  if (action === 'manual_confirm' || action === 'confirm') {
    return `已确认到 ${formatValue('toPatientId', audit.toPatientId)}，状态 ${fromStatus} -> ${toStatus}`;
  }
  return `${formatValue('action', audit.action)} 已执行，状态 ${fromStatus} -> ${toStatus}`;
}

function isActionableMessage(msg: ConversationMessage) {
  const type = getMessageType(msg).toLowerCase();
  const content = getMessageContent(msg).trim();
  const sender = getMessageSender(msg).toLowerCase();
  if (!content || content === '-' || content === '{}' || content === '[]') return false;
  if (type.includes('system')) return false;
  if (sender.includes('system')) return false;
  if (content.length <= 1) return false;
  if (/^\[.*\]$/.test(content)) return false;
  if (content === 'null' || content === 'undefined') return false;
  return true;
}

function ConversationDetailPage({
  conversationId,
  data,
  mode,
  token,
  onBack,
  onRefreshDashboard
}: {
  conversationId: string;
  data: DashboardData;
  mode: Mode;
  token: string;
  onBack: () => void;
  onRefreshDashboard: () => Promise<void>;
}) {
  const recentActions = data.tables.recentActions.filter((item) => item.conversationId === conversationId);
  const conversationSummary = (data.tables.byConversation.find((item) => item.conversationId === conversationId) || null) as Record<string, unknown> | null;
  const latestAction = (recentActions[0] || null) as Record<string, unknown> | null;
  const currentProblemState = data.tables.latestConflictCustomers.some((item: any) => item.conversationId === conversationId)
    ? 'conflict'
    : data.tables.latestUnmappedCustomers.some((item: any) => item.conversationId === conversationId)
      ? 'unmapped'
      : (latestAction?.mappingStatus as string | undefined) || 'matched';

  const [detail, setDetail] = useState<ConversationDetail>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [patientDetail, setPatientDetail] = useState<Record<string, unknown> | null>(null);
  const [patientDetailLoading, setPatientDetailLoading] = useState(false);
  const [patientDetailError, setPatientDetailError] = useState('');
  const [governanceMessage, setGovernanceMessage] = useState('');
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [messageSort, setMessageSort] = useState<'desc' | 'asc'>('desc');
  const [messageTypeFilter, setMessageTypeFilter] = useState<'all' | 'text' | 'image' | 'file'>('all');
  const [messageDecisionFilter, setMessageDecisionFilter] = useState<'all' | 'actionable'>('all');
  const [messageLimitView, setMessageLimitView] = useState<5 | 10>(10);
  const [expandedMessages, setExpandedMessages] = useState<Record<string, boolean>>({});
  const [showFilteredDuplicates, setShowFilteredDuplicates] = useState(false);
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [auditsError, setAuditsError] = useState('');
  const [insight, setInsight] = useState<InsightItem>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insightError, setInsightError] = useState('');
  const [businessFeedback, setBusinessFeedback] = useState<BusinessFeedbackItem>(null);
  const [businessFeedbackLoading, setBusinessFeedbackLoading] = useState(false);
  const [businessFeedbackError, setBusinessFeedbackError] = useState('');
  const [pendingActions, setPendingActions] = useState<ActionItem[]>([]);
  const [pendingActionsLoading, setPendingActionsLoading] = useState(false);
  const [pendingActionsError, setPendingActionsError] = useState('');
  const [actionHistory, setActionHistory] = useState<ActionItem[]>([]);
  const [actionHistoryLoading, setActionHistoryLoading] = useState(false);
  const [actionHistoryError, setActionHistoryError] = useState('');
  const [selectedActionId, setSelectedActionId] = useState('');
  const [actionSubmitLoading, setActionSubmitLoading] = useState(false);
  const [actionSubmitError, setActionSubmitError] = useState('');
  const [actionSubmitMessage, setActionSubmitMessage] = useState('');
  const [archiveCorrectionType, setArchiveCorrectionType] = useState<ArchiveCorrectionType>('add');
  const [quickFeedbackNotes, setQuickFeedbackNotes] = useState('');
  const [editableCurrentProblem, setEditableCurrentProblem] = useState('');
  const [editableCurrentStatus, setEditableCurrentStatus] = useState('');
  const [editableCurrentNeeds, setEditableCurrentNeeds] = useState('');
  const [editableCurrentNextSteps, setEditableCurrentNextSteps] = useState('');
  const [lastFeedbackSnapshot, setLastFeedbackSnapshot] = useState<Record<string, unknown> | null>(null);
  // 业务路由处理状态
  const [businessRoutingProcessing, setBusinessRoutingProcessing] = useState(false);
  const [businessRoutingResult, setBusinessRoutingResult] = useState<Record<string, unknown> | null>(null);
  const [businessRoutingError, setBusinessRoutingError] = useState('');
  const [selectedMessageId, setSelectedMessageId] = useState('');
  const [selectedHandlerType, setSelectedHandlerType] = useState<'group-customer-service' | 'medical-assistant'>('group-customer-service');

  // 处理单条消息的业务路由
  async function processMessageBusinessRouting(messageId: string) {
    if (mode !== 'real' || !token.trim()) {
      setBusinessRoutingError('real 模式需要先填写 Bearer token');
      return;
    }

    try {
      setBusinessRoutingProcessing(true);
      setBusinessRoutingError('');
      setBusinessRoutingResult(null);
      const result = await apiPost('/api/v1/business-routing/messages/process', token.trim(), { messageId });
      setBusinessRoutingResult(result);
    } catch (err) {
      setBusinessRoutingError(err instanceof Error ? err.message : '处理消息业务路由失败');
    } finally {
      setBusinessRoutingProcessing(false);
    }
  }

  // 处理整个会话的业务路由
  async function processConversationBusinessRouting() {
    if (mode !== 'real' || !token.trim()) {
      setBusinessRoutingError('real 模式需要先填写 Bearer token');
      return;
    }

    try {
      setBusinessRoutingProcessing(true);
      setBusinessRoutingError('');
      setBusinessRoutingResult(null);
      const result = await apiPost('/api/v1/business-routing/conversations/process', token.trim(), { conversationId, messageLimit: 50 });
      setBusinessRoutingResult(result);
    } catch (err) {
      setBusinessRoutingError(err instanceof Error ? err.message : '处理会话业务路由失败');
    } finally {
      setBusinessRoutingProcessing(false);
    }
  }

  // 使用指定处理器处理消息
  async function processMessageWithSpecificHandler(messageId: string, handlerType: 'group-customer-service' | 'medical-assistant') {
    if (mode !== 'real' || !token.trim()) {
      setBusinessRoutingError('real 模式需要先填写 Bearer token');
      return;
    }

    try {
      setBusinessRoutingProcessing(true);
      setBusinessRoutingError('');
      setBusinessRoutingResult(null);
      const result = await apiPost('/api/v1/business-routing/messages/process-with-handler', token.trim(), { messageId, handlerType });
      setBusinessRoutingResult(result);
    } catch (err) {
      setBusinessRoutingError(err instanceof Error ? err.message : '使用指定处理器处理消息失败');
    } finally {
      setBusinessRoutingProcessing(false);
    }
  }

  async function loadDetail() {
    if (mode !== 'real' || !token.trim()) {
      setDetail(null);
      setDetailError('');
      return;
    }

    try {
      setDetailLoading(true);
      setDetailError('');
      const result = await apiGet(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}`, token.trim());
      setDetail(result as Record<string, unknown>);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : '详情请求失败');
    } finally {
      setDetailLoading(false);
    }
  }

  async function loadPatientDetail() {
    const patientId = String(detail?.primaryCustomerId || detail?.patientId || detail?.primary_customer_id || '').trim();
    if (mode !== 'real' || !token.trim() || !patientId) {
      setPatientDetail(null);
      setPatientDetailError('');
      return;
    }

    try {
      setPatientDetailLoading(true);
      setPatientDetailError('');
      const result = await apiGet(`/api/v1/patients/${encodeURIComponent(patientId)}`, token.trim());
      setPatientDetail((result || null) as Record<string, unknown> | null);
    } catch (err) {
      setPatientDetail(null);
      setPatientDetailError(err instanceof Error ? err.message : '患者详情请求失败');
    } finally {
      setPatientDetailLoading(false);
    }
  }

  async function loadMessages() {
    if (mode !== 'real' || !token.trim()) {
      setMessages([]);
      setMessagesError('');
      return;
    }

    try {
      setMessagesLoading(true);
      setMessagesError('');
      const result = await apiGet(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/messages?limit=10`, token.trim());
      setMessages(Array.isArray(result) ? result as ConversationMessage[] : []);
    } catch (err) {
      setMessagesError(err instanceof Error ? err.message : '消息请求失败');
    } finally {
      setMessagesLoading(false);
    }
  }

  async function generateInsight() {
    if (mode !== 'real' || !token.trim()) return;
    try {
      setInsightLoading(true);
      setInsightError('');
      await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/analyze`, token.trim(), { limit: 10 });
      await loadInsight();
    } catch (err) {
      setInsightError(err instanceof Error ? err.message : '生成 insight 失败');
    } finally {
      setInsightLoading(false);
    }
  }

  async function loadInsight() {
    if (mode !== 'real' || !token.trim()) {
      setInsight(null);
      setInsightError('');
      return;
    }

    try {
      setInsightLoading(true);
      setInsightError('');
      const result = await apiGet(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/insight`, token.trim());
      setInsight((result || null) as InsightItem);
    } catch (err) {
      setInsight(null);
      setInsightError(err instanceof Error ? err.message : '分析结果请求失败');
    } finally {
      setInsightLoading(false);
    }
  }

  async function loadAudits() {
    if (mode !== 'real' || !token.trim()) {
      setAudits([]);
      setAuditsError('');
      return;
    }

    try {
      setAuditsLoading(true);
      setAuditsError('');
      const result = await apiGet(`/api/v1/wecom/mapping-audit?conversationId=${encodeURIComponent(conversationId)}&limit=10`, token.trim());
      setAudits(Array.isArray(result) ? result as AuditItem[] : []);
    } catch (err) {
      setAuditsError(err instanceof Error ? err.message : '审计请求失败');
    } finally {
      setAuditsLoading(false);
    }
  }

  async function loadBusinessFeedback() {
    if (mode !== 'real' || !token.trim()) {
      setBusinessFeedback(null);
      setBusinessFeedbackError('');
      return;
    }

    try {
      setBusinessFeedbackLoading(true);
      setBusinessFeedbackError('');
      const result = await apiPost(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/business-feedback`, token.trim(), {});
      setBusinessFeedback((result || null) as BusinessFeedbackItem);
    } catch (err) {
      setBusinessFeedback(null);
      setBusinessFeedbackError(err instanceof Error ? err.message : 'business-feedback 请求失败');
    } finally {
      setBusinessFeedbackLoading(false);
    }
  }

  async function loadPendingActions() {
    if (mode !== 'real' || !token.trim()) {
      setPendingActions([]);
      setPendingActionsError('');
      return;
    }

    try {
      setPendingActionsLoading(true);
      setPendingActionsError('');
      const result = await apiGet(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/pending-actions`, token.trim());
      setPendingActions(Array.isArray(result) ? result as ActionItem[] : []);
    } catch (err) {
      setPendingActions([]);
      setPendingActionsError(err instanceof Error ? err.message : 'pending actions 请求失败');
    } finally {
      setPendingActionsLoading(false);
    }
  }

  async function loadActionHistory() {
    if (mode !== 'real' || !token.trim()) {
      setActionHistory([]);
      setActionHistoryError('');
      return;
    }

    try {
      setActionHistoryLoading(true);
      setActionHistoryError('');
      const result = await apiGet(`/api/v1/wecom/conversations/${encodeURIComponent(conversationId)}/action-history`, token.trim());
      setActionHistory(Array.isArray(result) ? result as ActionItem[] : []);
    } catch (err) {
      setActionHistory([]);
      setActionHistoryError(err instanceof Error ? err.message : 'action history 请求失败');
    } finally {
      setActionHistoryLoading(false);
    }
  }

  async function updateSelectedActionStatus(status: 'done' | 'closed') {
    if (mode !== 'real' || !token.trim() || !selectedActionId) return;
    try {
      setActionSubmitLoading(true);
      setActionSubmitError('');
      setActionSubmitMessage('');
      await fetch(`/api/v1/patient-outreach-actions/${encodeURIComponent(selectedActionId)}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      }).then(async (res) => {
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.error?.message || '状态更新失败');
      });
      setActionSubmitMessage(`已更新动作为 ${status}`);
      await reloadAll();
    } catch (err) {
      setActionSubmitError(err instanceof Error ? err.message : '状态更新失败');
    } finally {
      setActionSubmitLoading(false);
    }
  }

  async function submitSelectedActionFeedback() {
    if (mode !== 'real' || !token.trim()) return;
    try {
      setActionSubmitLoading(true);
      setActionSubmitError('');
      setActionSubmitMessage('');
      const patientId = String(patientDetail?.id || patientDetail?.patientId || detail?.primary_customer_id || detail?.primaryCustomerId || selectedPendingAction?.patientId || '');
      if (!patientId) throw new Error('未找到可写回的患者标识');
      const notes = quickFeedbackNotes.trim();
      const correctionOption = ARCHIVE_CORRECTION_OPTIONS.find((item) => item.value === archiveCorrectionType) || ARCHIVE_CORRECTION_OPTIONS[0];

      const recentConversationText = Array.isArray(patientDetail?.recentConversations)
        ? (patientDetail.recentConversations as Array<Record<string, unknown>>).slice(0, 3).map((item) => `${String(item.conversationName || item.conversationId || '-')}${item.chatType ? `（${String(item.chatType)}）` : ''}`).join('；')
        : '';
      const basicInfoText = [
        `患者姓名：${String(patientDetail?.name || patientDetail?.patientName || detail?.patient_name || detail?.patientName || '-')}`,
        `患者标识：${patientId}`,
        `来源渠道：${String(detail?.chat_type || detail?.chatType || '-')}`
      ].join('｜');
      const personaSummaryText = editableCurrentNeeds
        ? `从当前互动看，患者画像相关线索主要包括：${editableCurrentNeeds}。`
        : null;
      const recentIssueSummaryText = editableCurrentProblem
        ? `近期最值得关注的问题是：${editableCurrentProblem}。${editableCurrentStatus ? ` 当前状态判断为：${editableCurrentStatus}。` : ''}`
        : null;
      const followupPlanText = editableCurrentNextSteps
        ? `建议后续优先围绕这些方向继续跟进：${editableCurrentNextSteps}。`
        : null;
      const communicationSummaryText = notes || businessFeedbackSummary || null;

      const profileResult = await apiPatch(`/api/v1/patients/${encodeURIComponent(patientId)}/profile`, token.trim(), {
        basicInfo: basicInfoText,
        preferences: editableCurrentNeeds || null,
        coreProblem: editableCurrentProblem || null,
        communicationSummary: communicationSummaryText,
        followupFocus: editableCurrentNextSteps || null,
        personaSummary: personaSummaryText,
        recentIssueSummary: recentIssueSummaryText,
        followupPlan: followupPlanText,
        sourceConversations: recentConversationText || null
      });

      const feedbackResult = selectedActionId
        ? await apiPost(`/api/v1/patient-outreach-actions/${encodeURIComponent(selectedActionId)}/feedback`, token.trim(), {
            status: correctionOption.status,
            feedbackType: correctionOption.feedbackType,
            notes: notes || undefined
          })
        : null;

      setLastFeedbackSnapshot({
        actionId: selectedActionId,
        patientId,
        status: correctionOption.status,
        feedbackType: correctionOption.feedbackType,
        correctionType: archiveCorrectionType,
        notes: notes || '-',
        submittedAt: new Date().toISOString(),
        result: { profileResult, feedbackResult },
        profileResult
      });
      setQuickFeedbackNotes('');
      setArchiveCorrectionType('add');
      setEditableCurrentProblem('');
      setEditableCurrentStatus('');
      setEditableCurrentNeeds('');
      setEditableCurrentNextSteps('');
      setActionSubmitMessage(`已写回患者档案并记录修正：${correctionOption.label}`);
      await reloadAll();
    } catch (err) {
      setActionSubmitError(err instanceof Error ? err.message : '档案写回失败');
    } finally {
      setActionSubmitLoading(false);
    }
  }

  async function reloadAll() {
    await Promise.all([
      loadDetail(),
      loadMessages(),
      loadAudits(),
      loadInsight(),
      loadBusinessFeedback(),
      loadPendingActions(),
      loadActionHistory(),
      onRefreshDashboard()
    ]);
  }

  useEffect(() => {
    loadDetail();
    loadMessages();
    loadAudits();
    loadInsight();
    loadBusinessFeedback();
    loadPendingActions();
    loadActionHistory();
  }, [mode, token, conversationId]);

  useEffect(() => {
    void loadPatientDetail();
  }, [mode, token, detail?.primaryCustomerId, detail?.patientId, detail?.primary_customer_id]);

  const duplicateMessageKeys = new Set(
    messages
      .map((msg, index, array) => {
        const content = getMessageContent(msg).trim();
        const duplicateIndex = array.findIndex((candidate) => {
          return getMessageContent(candidate).trim() === content
            && String(candidate.createdAt || '') === String(msg.createdAt || '')
            && getMessageSender(candidate) === getMessageSender(msg);
        });
        if (duplicateIndex !== index) {
          return String(msg.id || msg.messageId || `${conversationId}-${index}`);
        }
        return null;
      })
      .filter(Boolean) as string[]
  );

  const filteredDuplicateMessages = messages.filter((msg, index, array) => {
    const content = getMessageContent(msg).trim();
    const duplicateIndex = array.findIndex((candidate) => {
      return getMessageContent(candidate).trim() === content
        && String(candidate.createdAt || '') === String(msg.createdAt || '')
        && getMessageSender(candidate) === getMessageSender(msg);
    });
    return duplicateIndex !== index;
  });

  const normalizedMessages = [...messages]
    .filter((msg, index, array) => {
      if (messageDecisionFilter === 'actionable' && !isActionableMessage(msg)) return false;
      const content = getMessageContent(msg).trim();
      const duplicateIndex = array.findIndex((candidate) => {
        return getMessageContent(candidate).trim() === content
          && String(candidate.createdAt || '') === String(msg.createdAt || '')
          && getMessageSender(candidate) === getMessageSender(msg);
      });
      if (duplicateIndex !== index) return false;
      if (messageTypeFilter === 'all') return true;
      const messageType = getMessageType(msg).toLowerCase();
      if (messageTypeFilter === 'text') return messageType.includes('text');
      if (messageTypeFilter === 'image') return messageType.includes('image');
      if (messageTypeFilter === 'file') return messageType.includes('file');
      return true;
    })
    .sort((a, b) => {
      const left = Date.parse(String(a.createdAt || '')) || 0;
      const right = Date.parse(String(b.createdAt || '')) || 0;
      return messageSort === 'desc' ? right - left : left - right;
    })
    .slice(0, messageLimitView);

  const latestAudit = audits[0] || null;
  const latestPendingAction = pendingActions[0] || null;
  const latestActionHistory = actionHistory[0] || null;
  const insightSummaryText = String(insight?.summaryText || ((insight?.summary as Record<string, unknown> | undefined)?.summaryText) || '-');
  const insightNeeds = Array.isArray(insight?.needs) ? insight?.needs as unknown[] : [];
  const insightConcerns = Array.isArray(insight?.concerns) ? insight?.concerns as unknown[] : [];
  const insightRisks = Array.isArray(insight?.risks) ? insight?.risks as unknown[] : [];
  const insightNextActions = Array.isArray(insight?.nextActions) ? insight?.nextActions as unknown[] : [];
  const proposalSuggestion = ((insight?.d4Summary as Record<string, unknown> | undefined)?.proposalSuggestion || null) as Record<string, unknown> | null;
  const actionSuggestion = ((insight?.d4Summary as Record<string, unknown> | undefined)?.actionSuggestion || null) as Record<string, unknown> | null;
  const businessFeedbackStatus = String(businessFeedback?.status || '-');
  const businessFeedbackSummary = String(
    businessFeedback?.summary
    || businessFeedback?.feedbackSummary
    || (businessFeedback?.customerNeedSummary as Record<string, unknown> | undefined)?.summaryText
    || '-'
  );
  const businessFeedbackNeeds = Array.isArray(businessFeedback?.needs)
    ? businessFeedback.needs as unknown[]
    : Array.isArray(businessFeedback?.needPoints)
      ? businessFeedback.needPoints as unknown[]
      : [];
  const businessFeedbackRisks = Array.isArray(businessFeedback?.risks)
    ? businessFeedback.risks as unknown[]
    : [
        ...(Array.isArray(businessFeedback?.concernPoints) ? businessFeedback.concernPoints as unknown[] : []),
        ...(Array.isArray(businessFeedback?.objectionPoints) ? businessFeedback.objectionPoints as unknown[] : []),
        ...(Array.isArray(businessFeedback?.riskSignals) ? businessFeedback.riskSignals as unknown[] : [])
      ];
  const businessFeedbackNextSteps = Array.isArray(businessFeedback?.nextSteps)
    ? businessFeedback.nextSteps as unknown[]
    : Array.isArray(businessFeedback?.suggestedActions)
      ? businessFeedback.suggestedActions as unknown[]
      : Array.isArray(businessFeedback?.followupSuggestions)
        ? (businessFeedback.followupSuggestions as Array<Record<string, unknown>>).map((item) => item.actionText || item.actionType || '')
        : [];
  const selectedPendingAction = pendingActions.find((item) => String(item.id || '') === selectedActionId) || null;
  const profileData = (patientDetail?.profile as Record<string, unknown> | null) || null;
  const currentProblemValue = String(profileData?.coreProblem || (insightSummaryText !== '-' ? insightSummaryText : (businessFeedbackSummary !== '-' ? businessFeedbackSummary : '')) || '');
  const currentStatusValue = currentProblemValue
    ? (businessFeedbackRisks.length ? '建议优先跟进' : insightNeeds.length ? '可继续跟进' : '信息还不够完整')
    : '信息还不够完整';
  const currentNeedsAndConcerns = profileData?.preferences
    ? String(profileData.preferences).split('；').map((item) => item.trim()).filter(Boolean)
    : Array.from(new Set([...insightNeeds, ...businessFeedbackNeeds, ...businessFeedbackRisks].map((item) => String(item).trim()).filter(Boolean)));
  const currentNextStepValues = profileData?.followupFocus
    ? String(profileData.followupFocus).split('；').map((item) => item.trim()).filter(Boolean)
    : Array.from(new Set([...insightNextActions, ...businessFeedbackNextSteps].map((item) => String(item).trim()).filter(Boolean)));
  const latestActionFeedbackSummary = lastFeedbackSnapshot
    ? `最近反馈：${formatValue('feedbackStatus', lastFeedbackSnapshot.status)} / ${formatValue('feedbackType', lastFeedbackSnapshot.feedbackType)} / ${String(lastFeedbackSnapshot.notes || '-')}`
    : '';
  const recommendedActionText = String(actionSuggestion?.actionText || businessFeedbackNextSteps[0] || '').trim();
  const mappedRecommendedPendingAction = pendingActions.find((item) => {
    const summary = String(item.summary || item.actionType || '').trim();
    if (!recommendedActionText || !summary) return false;
    return recommendedActionText.includes(summary) || summary.includes(recommendedActionText) || String(item.actionType || '').includes('followup');
  }) || pendingActions[0] || null;
  const workbenchPriorityTag = insightRisks.length || businessFeedbackStatus === 'ready'
    ? '建议优先处理'
    : latestPendingAction
      ? '存在待跟进动作'
      : '常规跟进';
  const unifiedSummaryCards = [
    { label: '客户最近在说什么', value: insightSummaryText },
    { label: '当前核心需求 / 顾虑 / 风险', value: [
      insightNeeds.length ? `需求：${insightNeeds.slice(0, 2).map((item) => String(item)).join('；')}` : '',
      insightConcerns.length ? `顾虑：${insightConcerns.slice(0, 2).map((item) => String(item)).join('；')}` : '',
      insightRisks.length ? `风险：${insightRisks.slice(0, 2).map((item) => String(item)).join('；')}` : ''
    ].filter(Boolean).join('｜') || '-' },
    { label: '系统建议下一步做什么', value: [
      insightNextActions.length ? insightNextActions.slice(0, 2).map((item) => String(item)).join('；') : '',
      actionSuggestion?.actionText ? String(actionSuggestion.actionText) : ''
    ].filter(Boolean).join('｜') || '-' },
    { label: '当前处理优先级', value: workbenchPriorityTag }
  ];
  const messageFeatureSummary = (() => {
    const recentWindow = messages.slice(0, 10);
    const textCount = recentWindow.filter((msg) => getMessageType(msg).toLowerCase().includes('text')).length;
    const imageCount = recentWindow.filter((msg) => getMessageType(msg).toLowerCase().includes('image')).length;
    const fileCount = recentWindow.filter((msg) => getMessageType(msg).toLowerCase().includes('file')).length;
    const emptyLikeCount = recentWindow.filter((msg) => !isActionableMessage(msg)).length;
    const humanLikeCount = recentWindow.filter((msg) => !getMessageSender(msg).toLowerCase().includes('system')).length;
    const uniqueKeys = new Set(recentWindow.map((msg) => `${getMessageSender(msg)}|${String(msg.createdAt || '')}|${getMessageContent(msg).trim()}`));
    const duplicateCount = recentWindow.length - uniqueKeys.size;
    const actionableTextCount = recentWindow.filter((msg) => isActionableMessage(msg) && getMessageType(msg).toLowerCase().includes('text')).length;
    const highNoise = recentWindow.length ? emptyLikeCount >= Math.ceil(recentWindow.length / 2) : false;
    const highDuplicate = duplicateCount >= 2;
    const lacksActionableText = actionableTextCount === 0;
    const suggestion = highNoise
      ? '高噪音，建议先看“只看可判断”并优先阅读人工文本消息。'
      : highDuplicate
        ? '高重复，建议优先看最近非重复文本消息。'
        : lacksActionableText
          ? '缺少可判断文本，建议先看图片/文件或回到会话基本信息交叉判断。'
          : '消息结构较稳定，可直接按时间顺序查看最近人工文本消息。';
    return {
      total: recentWindow.length,
      textCount,
      imageCount,
      fileCount,
      emptyLikeCount,
      humanLikeCount,
      duplicateCount,
      actionableTextCount,
      mostlyHuman: recentWindow.length ? humanLikeCount >= Math.ceil(recentWindow.length / 2) : false,
      highNoise,
      highDuplicate,
      lacksActionableText,
      suggestion
    };
  })();
  const currentMapping = {
    mappingStatus: detail?.mappingStatus || detail?.mapping_status || latestAudit?.mappingStatus || latestAction?.mappingStatus,
    patientId: detail?.patientId || detail?.primary_customer_id || latestAudit?.toPatientId || latestAction?.toPatientId || latestAction?.fromPatientId,
    matchedBy: detail?.matchedBy || detail?.mapping_matched_by || latestAudit?.matchedBy || latestAction?.matchedBy,
    bindingType: detail?.bindingType || latestAudit?.bindingType,
    primaryCustomerId: detail?.primaryCustomerId || detail?.primary_customer_id || latestAction?.customerId || latestAudit?.toPatientId
  };

  useEffect(() => {
    setEditableCurrentProblem('');
    setEditableCurrentStatus('');
    setEditableCurrentNeeds('');
    setEditableCurrentNextSteps('');
    setQuickFeedbackNotes('');
    setArchiveCorrectionType('add');
  }, [patientDetail?.id, patientDetail?.patientId]);
  const workbenchEntryIdentity = String(patientDetail?.name || patientDetail?.patientName || detail?.conversationName || detail?.platformChatId || conversationId);
  const workbenchEntryStatus = formatValue('mappingStatus', currentProblemState);
  const workbenchEntryReason = [
    insightRisks.length ? `风险：${insightRisks.slice(0, 2).map((item) => String(item)).join('；')}` : '',
    insightConcerns.length ? `顾虑：${insightConcerns.slice(0, 2).map((item) => String(item)).join('；')}` : '',
    latestPendingAction ? `存在待处理动作：${String(latestPendingAction.summary || latestPendingAction.actionType || '-')}` : ''
  ].filter(Boolean).join('｜') || '当前暂无明显风险，但建议继续观察会话推进情况。';
  const workbenchEntryNextStep = [
    actionSuggestion?.actionText ? String(actionSuggestion.actionText) : '',
    insightNextActions.length ? String(insightNextActions[0]) : '',
    businessFeedbackNextSteps.length ? String(businessFeedbackNextSteps[0]) : ''
  ].filter(Boolean)[0] || '先查看最近消息与动作反馈，再决定是否继续跟进。';

  return (
    <div className="detail-page workbench-detail-page">
      <div className="detail-header">
        <button className="ghost-btn" onClick={onBack}>← 返回</button>
        <div>
          <h2>单患者页</h2>
          <p>只保留患者档案、本次提炼结果、人工修正与保存三块。</p>
        </div>
      </div>

      <div className="workbench-layout single-patient-page-layout">
        <aside className="workbench-side">
          <section className="panel workbench-judgement-panel">
            <div className="section-head">
              <div>
                <h2>患者档案</h2>
                <p>当前稳定档案内容。</p>
              </div>
              <button className="ghost-btn" type="button" onClick={() => void generateInsight()} disabled={insightLoading || mode !== 'real' || !token.trim()}>
                {insightLoading ? '生成中...' : '刷新提炼'}
              </button>
            </div>
            {insightLoading && <div className="info-box">正在整理患者档案...</div>}
            {insightError && <div className="error-box">{insightError}</div>}
            <div className="insight-card compact">
              <div className="insight-list-block">
                <span>基本情况</span>
                <p>{String(profileData?.basicInfo || (`当前患者档案已识别出基础身份信息：姓名为 ${String(patientDetail?.name || patientDetail?.patientName || detail?.patient_name || detail?.patientName || '-')}，患者标识为 ${String(patientDetail?.id || patientDetail?.patientId || detail?.patient_id || detail?.patientId || '-')}。` + (patientDetail?.gender ? ` 性别为 ${String(patientDetail.gender)}。` : '') + (patientDetail?.mobile ? ` 已留存联系方式 ${String(patientDetail.mobile)}。` : '') + (patientDetail?.diabetesType ? ` 当前健康背景里已记录 ${String(patientDetail.diabetesType)}。` : '') + ` 当前档案信息主要来自 ${String(detail?.chat_type || detail?.chatType || '-')} 场景，并结合最近关联会话与提炼结果持续补充。现阶段基础身份信息相对明确，但更完整的生活背景和长期管理信息仍需继续补充。`))}</p>
              </div>
              <div className="insight-list-block">
                <span>个人画像</span>
                <p>{String(profileData?.personaSummary || profileData?.preferences || patientDetail?.preferences || '从当前掌握的信息看，这位患者的人物画像还不够完整。现阶段只能初步判断其沟通上并不排斥继续互动，但更具体的沟通风格、生活习惯、管理接受度和长期偏好，仍需要结合后续私聊与群聊内容继续补充。')}</p>
                {!!(profileData?.sourceConversations || (Array.isArray(patientDetail?.recentConversations) && (patientDetail?.recentConversations as Array<Record<string, unknown>>).length)) && (
                  <p>{profileData?.sourceConversations ? `当前已沉淀的来源会话包括：${String(profileData.sourceConversations)}。` : `当前已关联 ${Math.min(((patientDetail?.recentConversations as Array<Record<string, unknown>> | undefined)?.length || 0), 3)} 个最近会话来源，可继续从私聊与群聊互动里补充患者画像。`}</p>
                )}
              </div>
              <div className="insight-list-block">
                <span>近期问题</span>
                <p>{String(profileData?.recentIssueSummary || (currentProblemValue ? `从最近几轮互动来看，患者当前最值得关注的问题是“${currentProblemValue}”。目前整体判断为“${currentStatusValue}”，说明这位患者还处在需要继续补充信息和逐步确认重点问题的阶段。${currentNeedsAndConcerns.length ? ` 现阶段已经暴露出的关注点或顾虑主要有：${currentNeedsAndConcerns.slice(0, 3).join('；')}。` : ''}` : '从目前互动内容来看，还没有形成足够清晰的近期问题判断，现阶段更适合继续通过私聊和群聊补充患者近期困扰、表达重点和真实需求。'))}</p>
                {!!(profileData?.communicationSummary || patientDetail?.latestInsight) && (
                  <p>{profileData?.communicationSummary ? `最近一次已沉淀的沟通摘要：${String(profileData.communicationSummary)}` : `最近一次系统提炼摘要：${String((((patientDetail?.latestInsight as Record<string, unknown>)?.summaryText)) || '-')}`}</p>
                )}
              </div>
              <div className="insight-list-block">
                <span>历史沟通提炼</span>
                <p>{String(profileData?.communicationSummary || (businessFeedbackSummary && businessFeedbackSummary !== '-' ? businessFeedbackSummary : '当前历史沟通提炼还比较薄，后续需要从多轮私聊和群聊里继续沉淀。'))}</p>
                <p>{String(profileData?.sourceConversations || '')}</p>
              </div>
              <div className="insight-list-block">
                <span>跟进重点</span>
                <p>{String(profileData?.followupPlan || (currentNextStepValues.length ? `当前更适合把跟进重点放在这些方向上：${currentNextStepValues.slice(0, 3).join('；')}。整体上不建议过早给过重方案，现阶段更重要的是继续确认患者近期问题、补充画像信息，并逐步把后续管理重点说清楚。` : '当前还没有形成足够明确的跟进重点，现阶段更适合先补足患者近期问题、沟通偏好和画像信息，再决定下一步怎么推进。'))}</p>
                {!!(profileData?.followupFocus || patientDetail?.latestInsight) && (
                  <p>{profileData?.followupFocus ? `当前已沉淀的跟进方向：${String(profileData.followupFocus)}` : `最近一次提炼给出的后续方向是：${String((((patientDetail?.latestInsight as Record<string, unknown>)?.summaryText)) || '-')}`}</p>
                )}
              </div>
              <div className="insight-list-block">
                <span>档案更新时间</span>
                <ul>
                  <li>最近提炼时间：{formatValue('generatedAt', insight?.generatedAt)}</li>
                  <li>最近人工修正时间：{formatValue('createdAt', profileData?.profileUpdatedAt || lastFeedbackSnapshot?.submittedAt)}</li>
                  <li>最近来源会话数：{profileData?.sourceConversations ? String(profileData.sourceConversations).split('；').filter(Boolean).length : (Array.isArray(patientDetail?.recentConversations) ? (patientDetail?.recentConversations as Array<Record<string, unknown>>).length : 0)}</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h2>本次提炼结果</h2>
                <p>只看这次新增了哪些可沉淀的信息。</p>
              </div>
            </div>
            {businessFeedbackLoading && <div className="info-box">正在整理本次新增内容...</div>}
            {businessFeedbackError && <div className="error-box">{businessFeedbackError}</div>}
            <div className="workbench-feedback-card judgement-feedback-card judgement-feedback-card-muted">
              <div className="insight-list-block">
                <span>本次新增基本信息</span>
                <p>{String(detail?.conversation_name || detail?.conversationName || detail?.platform_chat_id || detail?.platformChatId) ? `本次互动主要来自 ${String(detail?.conversation_name || detail?.conversationName || detail?.platform_chat_id || detail?.platformChatId)} 这一会话场景，目前没有看到更明确的新身份信息补充。` : '本次互动里暂时没有新增更明确的基本身份信息。'}</p>
              </div>
              <div className="insight-list-block">
                <span>本次新增喜好习惯</span>
                <p>{businessFeedbackNeeds.length ? `本次互动中提炼到的偏好或习惯线索主要包括：${businessFeedbackNeeds.slice(0, 2).map((item) => String(item)).join('；')}。` : '本次互动里还没有明确新增的喜好习惯信息。'}</p>
              </div>
              <div className="insight-list-block">
                <span>本次新增问题 / 顾虑</span>
                <p>{[...businessFeedbackNeeds, ...businessFeedbackRisks].length ? `本次互动新增的问题或顾虑主要包括：${[...businessFeedbackNeeds, ...businessFeedbackRisks].slice(0, 4).map((item) => String(item)).join('；')}。` : '本次互动里还没有提炼出更明确的新问题或新顾虑。'}</p>
              </div>
              <div className="insight-list-block">
                <span>本次新增沟通线索</span>
                <p>{businessFeedbackSummary && businessFeedbackSummary !== '-' ? String(businessFeedbackSummary) : '本次互动里还没有形成更具体的沟通线索摘要。'}</p>
              </div>
              <div className="insight-list-block">
                <span>本次新增跟进建议</span>
                <p>{businessFeedbackNextSteps.length ? `根据这次互动，后续建议重点跟进：${businessFeedbackNextSteps.slice(0, 4).map((item) => String(item)).join('；')}。` : '本次互动里暂时没有新增更明确的跟进建议。'}</p>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h2>业务路由处理</h2>
                <p>触发AI分析，自动路由到群管理机器人或个人医生助手。</p>
              </div>
            </div>

            {businessRoutingProcessing && <div className="info-box">业务路由处理中...</div>}
            {businessRoutingError && <div className="error-box">{businessRoutingError}</div>}
            {businessRoutingResult && (
              <div className="info-box">
                <strong>处理结果:</strong>
                <pre>{JSON.stringify(businessRoutingResult, null, 2)}</pre>
              </div>
            )}

            <div className="workbench-action-block">
              <div className="workbench-action-card">
                <div className="quick-feedback-form">
                  <div className="quick-feedback-form-title">消息选择</div>
                  <div className="quick-feedback-grid">
                    <label className="quick-feedback-notes detail-item-wide">
                      <span>选择消息ID</span>
                      <div className="message-selection">
                        <input
                          value={selectedMessageId}
                          onChange={(e) => setSelectedMessageId(e.target.value)}
                          placeholder="输入消息ID，或从下拉列表选择"
                        />
                        {messages.length > 0 && (
                          <select
                            value={selectedMessageId}
                            onChange={(e) => setSelectedMessageId(e.target.value)}
                            className="message-dropdown"
                          >
                            <option value="">-- 选择消息 --</option>
                            {messages.slice(0, 20).map((msg, index) => {
                              const msgId = String(msg.id || msg.messageId || msg.message_id || `msg-${index}`);
                              const content = getMessageContent(msg).trim();
                              const sender = getMessageSender(msg);
                              const preview = content.length > 50 ? content.substring(0, 50) + '...' : content;
                              return (
                                <option key={msgId} value={msgId}>
                                  {msgId} - {sender}: {preview}
                                </option>
                              );
                            })}
                          </select>
                        )}
                      </div>
                    </label>
                    <label>
                      <span>处理器类型</span>
                      <select
                        value={selectedHandlerType}
                        onChange={(e) => setSelectedHandlerType(e.target.value as 'group-customer-service' | 'medical-assistant')}
                      >
                        <option value="group-customer-service">群管理机器人</option>
                        <option value="medical-assistant">个人医生助手</option>
                      </select>
                    </label>
                  </div>

                  <div className="quick-feedback-form-title">处理操作</div>
                  <div className="workbench-action-buttons">
                    <button
                      type="button"
                      disabled={mode !== 'real' || !token.trim() || !selectedMessageId || businessRoutingProcessing}
                      onClick={() => processMessageBusinessRouting(selectedMessageId)}
                    >
                      处理单条消息（自动路由）
                    </button>
                    <button
                      type="button"
                      disabled={mode !== 'real' || !token.trim() || businessRoutingProcessing}
                      onClick={() => processConversationBusinessRouting()}
                    >
                      处理整个会话
                    </button>
                    <button
                      type="button"
                      disabled={mode !== 'real' || !token.trim() || !selectedMessageId || businessRoutingProcessing}
                      onClick={() => processMessageWithSpecificHandler(selectedMessageId, selectedHandlerType)}
                    >
                      使用指定处理器处理
                    </button>
                  </div>

                  <div className="info-box">
                    <strong>说明:</strong>
                    <ul>
                      <li><strong>处理单条消息（自动路由）:</strong> 根据消息的聊天类型自动路由到群管理机器人（群聊）或个人医生助手（私聊）</li>
                      <li><strong>处理整个会话:</strong> 批量处理会话中的所有消息（最多50条）</li>
                      <li><strong>使用指定处理器处理:</strong> 手动指定使用群管理机器人或个人医生助手处理消息</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="section-head">
              <div>
                <h2>人工修正与保存</h2>
                <p>按患者档案模型逐项修正后，再确认写入。</p>
              </div>
            </div>
            {(pendingActionsLoading || actionHistoryLoading) && <div className="info-box">正在加载保存相关信息...</div>}
            {(pendingActionsError || actionHistoryError) && <div className="error-box">{pendingActionsError || actionHistoryError}</div>}
            <div className="workbench-action-block">
              <div className="workbench-action-card">
                <div className="quick-feedback-form">
                  <div className="quick-feedback-form-title">逐项修正后写入档案</div>
                  <div className="quick-feedback-grid">
                    <label className="quick-feedback-notes detail-item-wide">
                      <span>核心问题</span>
                      <input value={editableCurrentProblem} onChange={(e) => setEditableCurrentProblem(e.target.value)} placeholder="填写修正后的核心问题" />
                    </label>
                    <label>
                      <span>当前状态</span>
                      <input value={editableCurrentStatus} onChange={(e) => setEditableCurrentStatus(e.target.value)} placeholder="填写修正后的当前状态" />
                    </label>
                    <label className="quick-feedback-notes detail-item-wide">
                      <span>喜好习惯 / 主要顾虑</span>
                      <input value={editableCurrentNeeds} onChange={(e) => setEditableCurrentNeeds(e.target.value)} placeholder="填写修正后的喜好习惯或主要顾虑，多个用；分隔" />
                    </label>
                    <label className="quick-feedback-notes detail-item-wide">
                      <span>跟进重点</span>
                      <input value={editableCurrentNextSteps} onChange={(e) => setEditableCurrentNextSteps(e.target.value)} placeholder="填写修正后的跟进重点，多个用；分隔" />
                    </label>
                    <label>
                      <span>修正类型</span>
                      <select value={archiveCorrectionType} onChange={(e) => setArchiveCorrectionType(e.target.value as ArchiveCorrectionType)}>
                        {ARCHIVE_CORRECTION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="quick-feedback-notes detail-item-wide">
                      <span>修正说明</span>
                      <input value={quickFeedbackNotes} onChange={(e) => setQuickFeedbackNotes(e.target.value)} placeholder="填写这次具体改了什么，以及是否要写入档案" />
                    </label>
                  </div>
                  <div className="workbench-action-buttons">
                    <button type="button" disabled={mode !== 'real' || !token.trim() || !(patientDetail?.id || patientDetail?.patientId || detail?.primary_customer_id || detail?.primaryCustomerId || selectedPendingAction?.patientId) || actionSubmitLoading} onClick={() => void submitSelectedActionFeedback()}>
                      确认写入档案
                    </button>
                  </div>
                </div>
                {actionSubmitError && <div className="error-box">{actionSubmitError}</div>}
                {actionSubmitMessage && <div className="info-box">{actionSubmitMessage}</div>}
                {lastFeedbackSnapshot && (
                  <div className="feedback-return-card">
                    <div className="feedback-return-title">最近一次保存结果</div>
                    <div className="feedback-return-grid">
                      <div><span>修正类型</span><strong>{archiveCorrectionLabelMap[String(lastFeedbackSnapshot.correctionType || 'add') as ArchiveCorrectionType] || '-'}</strong></div>
                      <div><span>保存结果</span><strong className={`status-inline-badge ${getFeedbackStatusBadgeClass(lastFeedbackSnapshot.status)}`}>{formatValue('feedbackStatus', lastFeedbackSnapshot.status)}</strong></div>
                      <div><span>提交时间</span><strong>{formatValue('createdAt', lastFeedbackSnapshot.submittedAt)}</strong></div>
                      <div className="detail-item-wide"><span>修正说明</span><strong>{String(lastFeedbackSnapshot.notes || '-')}</strong></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

        </aside>
      </div>

    </div>
  );
}

function PatientListPage({
  data,
  onOpenPatient
}: {
  data: DashboardData;
  onOpenPatient: (conversationId: string) => void;
}) {
  const rows = ((data.tables.byConversation || []) as Array<Record<string, unknown>>).map((row) => {
    const conversationId = String(row.conversationId || row.customerId || '');
    const isConflict = data.tables.latestConflictCustomers.some((item: any) => item.conversationId === conversationId);
    const isUnmapped = data.tables.latestUnmappedCustomers.some((item: any) => item.conversationId === conversationId);
    const status = isConflict ? '优先查看' : isUnmapped ? '待补信息' : '继续跟进';
    const patientId = String(row.patientId || row.customerId || row.primaryCustomerId || '-');
    const conversationName = String(row.conversationName || row.platformChatId || row.conversationId || '-');
    const patientName = String(
      row.patientName
      || row.customerName
      || (patientId && patientId !== '-' ? `患者 ${patientId.slice(0, 8)}` : '')
      || '未命名患者'
    );
    return {
      conversationId,
      patientName,
      patientId,
      conversationName,
      summary: String(row.latestInsightSummary || row.summaryText || row.latestInsight || '最近还没有提炼出明确内容'),
      status
    };
  });

  return (
    <section className="panel">
      <div className="section-head">
        <div>
          <h2>患者列表</h2>
          <p>选择一个患者，进入右侧单患者页查看与修正档案。</p>
        </div>
      </div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>患者姓名</th>
                <th>患者标识</th>
                <th>会话信息</th>
                <th>最近互动摘要</th>
                <th>当前状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.conversationId}-${index}`}>
                  <td>{row.patientName}</td>
                  <td>{row.patientId}</td>
                  <td>{row.conversationName}</td>
                  <td>{row.summary}</td>
                  <td>{row.status}</td>
                  <td>
                    <button className="ghost-btn" onClick={() => onOpenPatient(row.conversationId)}>
                      查看患者
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-title">现在还没有可展示的患者</div>
          <div className="empty-desc">可以先切到 real 模式，或先补齐一份标准样本。</div>
        </div>
      )}
    </section>
  );
}

export default function App() {
  const search = useMemo(() => new URLSearchParams(window.location.search), []);
  const [mode, setMode] = useState<Mode>(search.get('mode') === 'real' ? 'real' : 'mock');
  const [timePreset, setTimePreset] = useState<TimePreset>((search.get('timePreset') as TimePreset) || 'this_week');
  const [token, setToken] = useState(localStorage.getItem('wecom_governance_token') || '');
  const [payload, setPayload] = useState<DashboardPayload>(mockPayload as DashboardPayload);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trialBootstrapping, setTrialBootstrapping] = useState(false);
  const [view, setView] = useState<PageView>(search.get('view') === 'conversation-detail' ? 'conversation-detail' : 'dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState(search.get('conversationId') || 'wecom:private:HanCong');

  async function bootstrapTrialRun() {
    try {
      setTrialBootstrapping(true);
      setError('');
      const bootstrapRes = await fetch('/api/v1/workbench/trial-bootstrap', { method: 'POST' });
      const bootstrapJson = await bootstrapRes.json();
      if (!bootstrapRes.ok || !bootstrapJson.success) {
        throw new Error(bootstrapJson.error?.message || '标准试跑样本初始化失败');
      }
      const trialConversationId = String(bootstrapJson.data?.sample?.conversationId || 'wecom:private:HanCong');
      const loginRes = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: '13800000000', password: 'demo123456' })
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok || !loginJson.success || !loginJson.data?.accessToken) {
        throw new Error(loginJson.error?.message || '试跑 token 获取失败');
      }
      const nextToken = String(loginJson.data.accessToken);
      setToken(nextToken);
      setMode('real');
      setSelectedConversationId(trialConversationId);
      setView('conversation-detail');
    } catch (err) {
      setError(err instanceof Error ? err.message : '试跑入口初始化失败');
    } finally {
      setTrialBootstrapping(false);
    }
  }

  async function loadDashboard(currentMode = mode, currentPreset = timePreset, currentToken = token) {
    if (currentMode === 'mock') {
      setPayload(mockPayload as DashboardPayload);
      setError('');
      return;
    }

    if (!currentToken.trim()) {
      setError('real 模式需要先填写 Bearer token，当前无法请求真实接口。');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await apiGet(`/api/v1/wecom/mapping-governance/dashboard?timePreset=${currentPreset}&limit=10`, currentToken.trim());
      setPayload({ success: true, data: result, error: null } as DashboardPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('mode', mode);
    params.set('timePreset', timePreset);
    params.set('view', view);
    if (selectedConversationId) params.set('conversationId', selectedConversationId);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
  }, [mode, timePreset, view, selectedConversationId]);

  useEffect(() => {
    localStorage.setItem('wecom_governance_token', token);
  }, [token]);

  useEffect(() => {
    loadDashboard();
  }, [mode, timePreset, token]);

  const data = payload.data;

  if (view === 'conversation-detail') {
    return (
      <div className="app-shell">
        <ConversationDetailPage
          conversationId={selectedConversationId}
          data={data}
          mode={mode}
          token={token}
          onBack={() => setView('dashboard')}
          onRefreshDashboard={() => loadDashboard(mode, timePreset, token)}
        />
      </div>
    );
  }

  if (view === 'archive-management') {
    return (
      <div className="app-shell">
        <ArchiveManagement
          mode={mode}
          token={token}
        />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <h1>患者列表</h1>
          <p>从患者视角进入，选中一个患者后查看档案、提炼结果和人工修正内容。</p>
        </div>
        <div className="meta-box">
          <div>mode: {mode}</div>
          <div>timePreset: {data.meta.timePreset || timePreset}</div>
          <div>limit: {data.meta.limit}</div>
        </div>
      </header>

      <section className="panel toolbar-panel">
        <div className="section-head compact">
          <div>
            <h2>查询控制台</h2>
            <p>控制数据模式、时间范围和真实接口访问 token。</p>
          </div>
        </div>

        <div className="trial-entry-banner">
          <div>
            <strong>标准试跑入口</strong>
            <p>一键补齐标准样本、自动获取 token、直接跳到标准会话详情。</p>
          </div>
          <button className="trial-entry-btn" onClick={() => void bootstrapTrialRun()} disabled={trialBootstrapping}>
            {trialBootstrapping ? '初始化中...' : '一键进入标准试跑'}
          </button>
        </div>

        <div className="toolbar-row">
          <div className="toolbar-group">
            <span className="toolbar-label">数据模式</span>
            <button className={mode === 'mock' ? 'active' : ''} onClick={() => setMode('mock')}>mock</button>
            <button className={mode === 'real' ? 'active' : ''} onClick={() => setMode('real')}>real</button>
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">时间范围</span>
            {(['today', 'this_week', '7d'] as TimePreset[]).map((preset) => (
              <button key={preset} className={timePreset === preset ? 'active' : ''} onClick={() => setTimePreset(preset)}>
                {preset}
              </button>
            ))}
          </div>

          <div className="toolbar-group">
            <span className="toolbar-label">页面视图</span>
            <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>患者列表</button>
            <button className={view === 'archive-management' ? 'active' : ''} onClick={() => setView('archive-management')}>档案管理</button>
          </div>
        </div>

        <div className="toolbar-row token-row">
          <span className="toolbar-label">Bearer Token</span>
          <input
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="仅 real 模式需要"
          />
        </div>
        <div className="info-box">
          试跑入口：优先使用同域地址访问本页。Bearer Token 是后端接口访问令牌，不是大模型秘钥。当前标准获取方式：调用 `/api/v1/auth/login`，演示账号见 README / 试跑文档。
        </div>

        {loading && <div className="info-box">正在请求患者列表数据...</div>}
        {error && <div className="error-box">{error}</div>}
      </section>

      <PatientListPage
        data={data}
        onOpenPatient={(conversationId) => {
          setSelectedConversationId(conversationId);
          setView('conversation-detail');
        }}
      />
    </div>
  );
}
