-- 企微项目业务路由功能测试数据
-- 执行方式: psql -h 127.0.0.1 -p 5432 -U postgres -d chronic_disease -f test-business-routing.sql

-- 1. 创建一个群聊会话用于测试群管理机器人
INSERT INTO wecom_conversations (conversation_id, chat_type, platform_chat_id, conversation_name, primary_customer_id, mapping_status, status, message_count, started_at, last_message_at, created_at, updated_at)
VALUES (
  'wecom:group:test-group',
  'group',
  'group123456',
  '糖尿病管理群',
  'customer-001',
  'mapped',
  'active',
  5,
  '2024-01-15T10:00:00Z',
  '2024-01-15T10:30:00Z',
  NOW(),
  NOW()
) ON CONFLICT (conversation_id) DO NOTHING;

-- 2. 插入测试消息数据

-- 群聊消息（用于测试群管理机器人）
-- 患者消息（customer角色）
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-group-1', 'group-msg-001', 'wecom:group:test-group', 'customer-001', 'customer', 'group', '我有糖尿病，最近血糖控制不好，早上空腹血糖8.5，需要调整用药吗？', '2024-01-15T10:05:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 医生消息（doctor角色）
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-group-2', 'group-msg-002', 'wecom:group:test-group', 'doctor-001', 'doctor', 'group', '建议您监测血糖一周，记录饮食和用药情况', '2024-01-15T10:10:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 患者回复
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-group-3', 'group-msg-003', 'wecom:group:test-group', 'customer-001', 'customer', 'group', '好的，我会记录。最近脚也有点麻，和糖尿病有关吗？', '2024-01-15T10:15:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 私聊消息（用于测试个人医生助手）- 使用现有的会话
-- 患者私聊消息
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-private-1', 'private-msg-001', 'wecom:private:HanCong', 'customer-002', 'customer', 'private', '医生您好，我最近血压有点高，150/95，需要吃药吗？', '2024-01-15T11:00:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 医生私聊回复
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-private-2', 'private-msg-002', 'wecom:private:HanCong', 'doctor-002', 'doctor', 'private', '建议先监测血压一周，每天早晚各一次，记录后我们再评估', '2024-01-15T11:05:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 患者追问
INSERT INTO wecom_messages (id, message_id, conversation_id, sender_id, sender_role, chat_type, content_text, sent_at) VALUES
('msg-private-3', 'private-msg-003', 'wecom:private:HanCong', 'customer-002', 'customer', 'private', '我有高血压家族史，父亲就是高血压患者', '2024-01-15T11:10:00Z')
ON CONFLICT (message_id) DO NOTHING;

-- 3. 创建对应的成员档案（用于测试档案更新）
-- 群聊用户档案
INSERT INTO member_archive (id, user_id, conversation_id, basic_info, core_problem, recent_issue_summary, updated_at, created_at)
VALUES (
  'archive-group-001',
  'customer-001',
  'wecom:group:test-group',
  '糖尿病患者，血糖控制不佳',
  '空腹血糖偏高，需要用药调整建议',
  '近期血糖控制不稳定，空腹血糖8.5',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  conversation_id = EXCLUDED.conversation_id,
  basic_info = EXCLUDED.basic_info,
  core_problem = EXCLUDED.core_problem,
  recent_issue_summary = EXCLUDED.recent_issue_summary,
  updated_at = NOW();

-- 私聊用户档案
INSERT INTO member_archive (id, user_id, conversation_id, basic_info, core_problem, recent_issue_summary, updated_at, created_at)
VALUES (
  'archive-private-001',
  'customer-002',
  'wecom:private:HanCong',
  '高血压患者，有家族病史',
  '血压偏高（150/95），需要用药评估',
  '近期血压升高，有高血压家族史',
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  conversation_id = EXCLUDED.conversation_id,
  basic_info = EXCLUDED.basic_info,
  core_problem = EXCLUDED.core_problem,
  recent_issue_summary = EXCLUDED.recent_issue_summary,
  updated_at = NOW();

-- 4. 输出验证信息
SELECT '=== 测试数据插入完成 ===' as message;
SELECT '群聊消息数量:' as label, COUNT(*) as count FROM wecom_messages WHERE conversation_id = 'wecom:group:test-group'
UNION ALL
SELECT '私聊消息数量:' as label, COUNT(*) as count FROM wecom_messages WHERE conversation_id = 'wecom:private:HanCong'
UNION ALL
SELECT '成员档案数量:' as label, COUNT(*) as count FROM member_archive;