import { AppError } from '../../../shared/errors/app-error.js';
import { db } from '../../../infra/db/pg.js';
import { aiModelService } from '../service/ai-model.service.js';

// 简单的业务路由指标收集
const businessRoutingMetrics = {
  totalProcessed: 0,
  successful: 0,
  failed: 0,
  archiveUpdates: 0,
  byHandlerType: {
    'group-customer-service': { processed: 0, successful: 0, failed: 0, archiveUpdates: 0 },
    'medical-assistant': { processed: 0, successful: 0, failed: 0, archiveUpdates: 0 },
    'auto-routed': { processed: 0, successful: 0, failed: 0, archiveUpdates: 0 }
  },
  lastUpdated: new Date().toISOString()
};

function updateMetrics(handlerType: 'group-customer-service' | 'medical-assistant' | 'auto-routed', success: boolean, archiveUpdated: boolean) {
  businessRoutingMetrics.totalProcessed++;
  if (success) {
    businessRoutingMetrics.successful++;
    businessRoutingMetrics.byHandlerType[handlerType].successful++;
  } else {
    businessRoutingMetrics.failed++;
    businessRoutingMetrics.byHandlerType[handlerType].failed++;
  }
  if (archiveUpdated) {
    businessRoutingMetrics.archiveUpdates++;
    businessRoutingMetrics.byHandlerType[handlerType].archiveUpdates++;
  }
  businessRoutingMetrics.byHandlerType[handlerType].processed++;
  businessRoutingMetrics.lastUpdated = new Date().toISOString();

  // 定期打印指标（每10次处理）
  if (businessRoutingMetrics.totalProcessed % 10 === 0) {
    console.log('[Business Routing Metrics]', JSON.stringify(businessRoutingMetrics, null, 2));
  }
}

function getMetrics() {
  return { ...businessRoutingMetrics };
}

// 获取会话中的所有消息ID
async function getConversationMessages(conversationId: string, limit: number) {
  const result = await db.query(
    `select message_id, sender_id, sender_role, content_text, sent_at, chat_type
       from wecom_messages
      where conversation_id = $1
        and content_text is not null
        and content_text != ''
      order by sent_at asc
      limit $2`,
    [conversationId, limit]
  );
  return result.rows;
}

/**
 * 处理单条消息的业务路由
 * 根据消息的聊天类型（群聊/私聊）自动路由到相应的业务处理逻辑
 */
export async function processMessageWithBusinessRouting(payload: {
  messageId: string;
}) {
  const startTime = Date.now();
  console.log(`[Business Routing] Starting message processing for messageId: ${payload.messageId}`);

  if (!payload.messageId) {
    console.error('[Business Routing] Missing required field: messageId');
    throw new AppError(400, 'INVALID_INPUT', '缺少必要字段：messageId');
  }

  try {
    const result = await aiModelService.processMessageWithBusinessRouting(payload.messageId);
    const duration = Date.now() - startTime;
    const success = result.success !== false; // 假设成功除非明确标记为false
    const archiveUpdated = result.archiveUpdated || false;
    console.log(`[Business Routing] Message processing completed in ${duration}ms, success: ${success}, archiveUpdated: ${archiveUpdated}`);
    // 更新指标
    updateMetrics('auto-routed', success, archiveUpdated);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Business Routing] Message processing failed after ${duration}ms:`, error);
    // 更新指标（失败）
    updateMetrics('auto-routed', false, false);
    throw error;
  }
}

/**
 * 批量处理会话中的消息
 * 对会话中的所有消息应用业务路由逻辑
 */
export async function processConversationWithBusinessRouting(payload: {
  conversationId: string;
  messageLimit?: number;
}) {
  const startTime = Date.now();
  console.log(`[Business Routing] Starting conversation processing for conversationId: ${payload.conversationId}`);

  if (!payload.conversationId) {
    console.error('[Business Routing] Missing required field: conversationId');
    throw new AppError(400, 'INVALID_INPUT', '缺少必要字段：conversationId');
  }

  const messageLimit = payload.messageLimit || 50;

  try {
    // 获取会话中的所有消息
    const messages = await getConversationMessages(payload.conversationId, messageLimit);
    const totalMessages = messages.length;
    console.log(`[Business Routing] Found ${totalMessages} messages in conversation ${payload.conversationId}`);

    if (totalMessages === 0) {
      const duration = Date.now() - startTime;
      console.log(`[Business Routing] No messages to process in ${duration}ms`);
      updateMetrics('auto-routed', true, false);
      return {
        success: true,
        conversationId: payload.conversationId,
        totalMessages: 0,
        processedMessages: 0,
        groupCustomerServiceMessages: 0,
        medicalAssistantMessages: 0,
        memberArchivesUpdated: 0,
        patientProfilesUpdated: 0,
        processingSummary: 'No messages found to process'
      };
    }

    // 统计指标
    let processedMessages = 0;
    let groupCustomerServiceMessages = 0;
    let medicalAssistantMessages = 0;
    let memberArchivesUpdated = 0;
    let patientProfilesUpdated = 0;
    const processingErrors: Array<{ messageId: string; error: string }> = [];

    // 分批处理配置
    const BATCH_SIZE = 10;
    const BATCH_DELAY_MS = 100;

    // 延迟辅助函数
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // 按批次处理消息
    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(messages.length / BATCH_SIZE);

      console.log(`[Business Routing] Processing batch ${batchNumber}/${totalBatches} (${batch.length} messages)`);

      // 处理当前批次
      for (const message of batch) {
        try {
          let result;
          const isGroupChat = message.chat_type === 'group';

          if (isGroupChat) {
            // 群聊消息 - 使用群管理机器人逻辑
            console.log(`[Business Routing] Processing group message ${message.message_id} with group-customer-service`);
            const analysisInput = {
              messageId: message.message_id,
              conversationId: payload.conversationId,
              senderId: message.sender_id,
              senderRole: message.sender_role,
              content: message.content_text || '',
              timestamp: message.sent_at
            };
            result = await aiModelService.processGroupMessageForCustomerService(analysisInput);
            groupCustomerServiceMessages++;
          } else {
            // 私聊消息 - 使用个人医生助手逻辑
            console.log(`[Business Routing] Processing private message ${message.message_id} with medical-assistant`);
            const analysisInput = {
              messageId: message.message_id,
              conversationId: payload.conversationId,
              senderId: message.sender_id,
              senderRole: message.sender_role,
              content: message.content_text || '',
              timestamp: message.sent_at
            };
            result = await aiModelService.processPrivateMessageForMedicalAssistant(analysisInput);
            medicalAssistantMessages++;
          }

          // 更新档案统计
          if (result.archiveUpdated) {
            if (result.archiveType === 'member') {
              memberArchivesUpdated++;
            } else if (result.archiveType === 'patient') {
              patientProfilesUpdated++;
            }
          }

          processedMessages++;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[Business Routing] Failed to process message ${message.message_id}:`, error);
          processingErrors.push({
            messageId: message.message_id,
            error: errorMessage
          });
        }
      }

      // 如果不是最后一个批次，添加延迟
      if (i + BATCH_SIZE < messages.length) {
        console.log(`[Business Routing] Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await delay(BATCH_DELAY_MS);
      }
    }

    const duration = Date.now() - startTime;
    const success = processingErrors.length === 0;
    const archiveUpdated = memberArchivesUpdated > 0 || patientProfilesUpdated > 0;

    console.log(`[Business Routing] Conversation processing completed in ${duration}ms, ` +
      `processed ${processedMessages}/${totalMessages} messages, ` +
      `archive updates: ${memberArchivesUpdated} member, ${patientProfilesUpdated} patient, ` +
      `errors: ${processingErrors.length}`);

    // 更新指标
    updateMetrics('auto-routed', success, archiveUpdated);

    return {
      success,
      conversationId: payload.conversationId,
      totalMessages,
      processedMessages,
      groupCustomerServiceMessages,
      medicalAssistantMessages,
      memberArchivesUpdated,
      patientProfilesUpdated,
      processingErrors: processingErrors.length > 0 ? processingErrors : undefined,
      processingSummary: `Processed ${processedMessages} of ${totalMessages} messages with ${processingErrors.length} errors`
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Business Routing] Conversation processing failed after ${duration}ms:`, error);
    // 更新指标（失败）
    updateMetrics('auto-routed', false, false);
    throw error;
  }
}

/**
 * 手动指定业务处理类型处理消息
 * 用于测试或特殊场景
 */
export async function processMessageWithSpecificHandler(payload: {
  messageId: string;
  handlerType: 'group-customer-service' | 'medical-assistant';
}) {
  const startTime = Date.now();
  console.log(`[Business Routing] Starting specific handler processing for messageId: ${payload.messageId}, handlerType: ${payload.handlerType}`);

  if (!payload.messageId || !payload.handlerType) {
    console.error('[Business Routing] Missing required fields: messageId or handlerType');
    throw new AppError(400, 'INVALID_INPUT', '缺少必要字段：messageId 或 handlerType');
  }

  try {
    // 获取消息详情
    const message = await aiModelService['getMessageDetails'](payload.messageId);
    if (!message) {
      console.error(`[Business Routing] Message not found: ${payload.messageId}`);
      throw new AppError(404, 'MESSAGE_NOT_FOUND', `消息 ${payload.messageId} 不存在`);
    }

    // 获取对话上下文
    const conversationContext = await aiModelService['getConversationContext'](
      message.conversation_id,
      message.sent_at,
      10
    );

    // 准备AI分析输入
    const analysisInput = {
      messageId: message.message_id,
      conversationId: message.conversation_id,
      senderId: message.sender_id,
      senderRole: message.sender_role,
      content: message.content_text || '',
      timestamp: message.sent_at,
      conversationContext: conversationContext.map(msg => ({
        senderRole: msg.sender_role,
        content: msg.content_text || '',
        timestamp: msg.sent_at
      }))
    };

    let result;
    if (payload.handlerType === 'group-customer-service') {
      console.log(`[Business Routing] Processing with group-customer-service handler`);
      result = await aiModelService.processGroupMessageForCustomerService(analysisInput);
    } else {
      console.log(`[Business Routing] Processing with medical-assistant handler`);
      result = await aiModelService.processPrivateMessageForMedicalAssistant(analysisInput);
    }

    const duration = Date.now() - startTime;
    const archiveUpdated = result.archiveUpdated || false;
    console.log(`[Business Routing] Specific handler processing completed in ${duration}ms, archiveUpdated: ${archiveUpdated}, archiveType: ${result.archiveType || 'none'}`);
    // 更新指标
    updateMetrics(payload.handlerType, true, archiveUpdated);

    return {
      success: true,
      messageId: payload.messageId,
      conversationId: message.conversation_id,
      handlerType: payload.handlerType,
      archiveUpdated: result.archiveUpdated,
      archiveType: result.archiveType,
      targetId: result.targetId,
      analysis: {
        understanding: result.analysis.understanding,
        extraction: result.analysis.extraction,
        confidence: result.analysis.confidence
      }
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Business Routing] Specific handler processing failed after ${duration}ms:`, error);
    throw error;
  }
}

/**
 * 获取消息的业务处理结果
 */
export async function getMessageBusinessProcessingResult(payload: {
  messageId: string;
}) {
  const startTime = Date.now();
  console.log(`[Business Routing] Getting processing result for message: ${payload.messageId}`);

  if (!payload.messageId) {
    console.error('[Business Routing] Missing required field: messageId');
    throw new AppError(400, 'INVALID_INPUT', '缺少必要字段：messageId');
  }

  try {
    // TODO: 从数据库查询业务处理结果
    // 目前先返回模拟数据
    console.log(`[Business Routing] Would get processing result for message ${payload.messageId}`);

    const duration = Date.now() - startTime;
    console.log(`[Business Routing] Processing result retrieval simulated in ${duration}ms`);

    return {
      messageId: payload.messageId,
      processed: false,
      processingStatus: 'not_processed',
      lastProcessedAt: null,
      businessHandler: null,
      archiveUpdated: false,
      archiveType: null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Business Routing] Processing result retrieval failed after ${duration}ms:`, error);
    throw error;
  }
}