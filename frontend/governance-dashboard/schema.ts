export const governanceDashboardSections = [
  {
    key: 'cards',
    title: '治理动作统计',
    type: 'cards',
    source: 'data.cards',
    items: [
      { key: 'totalActions', label: '总治理动作数' },
      { key: 'manualConfirmTotal', label: '手工确认数' },
      { key: 'manualUnconfirmTotal', label: '撤销确认数' },
      { key: 'reassignTotal', label: '改绑数' },
      { key: 'promoteBindingTotal', label: '提升为绑定数' },
      { key: 'conversationTouchedTotal', label: '触达会话数' }
    ]
  },
  {
    key: 'byAction',
    title: '动作分布',
    type: 'chart',
    source: 'data.charts.byAction'
  },
  {
    key: 'byMatchedBy',
    title: '命中来源分布',
    type: 'chart',
    source: 'data.charts.byMatchedBy'
  },
  {
    key: 'byConversation',
    title: '最近活跃治理会话',
    type: 'table',
    source: 'data.tables.byConversation',
    columns: ['conversationId', 'platformChatId', 'total', 'lastActionAt']
  },
  {
    key: 'recentActions',
    title: '最近治理动作',
    type: 'table',
    source: 'data.tables.recentActions',
    columns: ['createdAt', 'action', 'conversationId', 'fromPatientId', 'toPatientId', 'matchedBy', 'operatorNote']
  },
  {
    key: 'latestUnmappedCustomers',
    title: '未映射对象',
    type: 'table',
    source: 'data.tables.latestUnmappedCustomers'
  },
  {
    key: 'latestConflictCustomers',
    title: '冲突对象',
    type: 'table',
    source: 'data.tables.latestConflictCustomers'
  }
] as const;
