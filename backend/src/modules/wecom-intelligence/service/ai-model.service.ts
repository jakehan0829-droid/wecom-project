import { randomUUID } from 'node:crypto';
import OpenAI from 'openai';
import { db } from '../../../infra/db/pg.js';
import type { MemberArchiveRecord } from '../../archive/service/archive.service.js';
import {
  upsertMemberArchiveService,
  upsertPatientProfileService,
  getPatientProfileService,
  getArchiveForAIContext,
  type PatientProfileRecord
} from '../../archive/service/archive.service.js';
import { lookupCustomerMapping, type CustomerMappingLookupResult } from './patient-mapping.service.js';
import { sendWecomGroupMessageService } from '../../enrollment/service/wecom-api-client.service.js';
import { sendWecomTextMessageService } from '../../enrollment/service/wecom-message-sender.service.js';

// AI模型配置
interface AIModelConfig {
  provider: 'mock' | 'openai' | 'anthropic';
  model: string;
  apiKey?: string;
  baseUrl?: string;
}

// 消息分析输入
export interface MessageAnalysisInput {
  messageId: string;
  conversationId: string;
  senderId: string;
  senderRole: string;
  content: string;
  timestamp: string;
  conversationContext?: Array<{
    senderRole: string;
    content: string;
    timestamp: string;
  }>;
}

// 分析结果
export interface MessageAnalysisResult {
  messageId: string;
  conversationId: string;
  senderId: string;

  // 互动理解
  understanding: {
    userQuestion: string | null;
    userState: string | null;
    newNeeds: string[];
    concerns: string[];
    risks: string[];
    informationWorthy: string[];
  };

  // 信息提炼
  extraction: {
    basicInfoUpdates: Record<string, string>;
    newRequirements: string[];
    keyStateChanges: string[];
    riskPoints: string[];
    followupItems: string[];
  };

  // 档案更新建议
  archiveUpdates: {
    memberArchiveUpdates: Record<string, string>;
    patientArchiveUpdates: Record<string, string>;
  };

  // AI生成的回复文本（直接发给用户）
  replyText: string | null;
  // 是否需要转给真人助理
  needsHumanHandoff: boolean;

  confidence: number;
  analysisTimestamp: string;
}

// 档案分析输入
export interface ArchiveAnalysisInput {
  archiveType: 'member' | 'patient';
  archiveId: string;
  currentArchive: Record<string, unknown>;
  recentConversations: Array<{
    conversationId: string;
    messages: Array<{
      senderRole: string;
      content: string;
      timestamp: string;
    }>;
  }>;
}

// 档案分析结果
export interface ArchiveAnalysisResult {
  archiveType: string;
  archiveId: string;

  // 档案完善建议
  improvements: {
    basicInfo: string | null;
    preferences: string | null;
    coreProblem: string | null;
    communicationSummary: string | null;
    followupFocus: string | null;
    personaSummary: string | null;
    recentIssueSummary: string | null;
    followupPlan: string | null;
  };

  // 关键洞察
  insights: string[];

  confidence: number;
  analysisTimestamp: string;
}

class AIModelService {
  private config: AIModelConfig;
  private openaiClient: OpenAI | null = null;

  constructor(config?: Partial<AIModelConfig>) {
    // 处理provider映射：openai-codex等openai变体都映射为openai
    let provider = process.env.AI_PROVIDER as string || 'mock';
    if (provider.startsWith('openai-')) {
      provider = 'openai';
    }

    this.config = {
      provider: provider as 'mock' | 'openai' | 'anthropic',
      model: process.env.AI_MODEL || 'gpt-4',
      apiKey: process.env.AI_API_KEY,
      baseUrl: process.env.AI_BASE_URL,
      ...config
    };

    // 初始化OpenAI客户端（如果provider是openai）
    if (this.config.provider === 'openai' && this.config.apiKey) {
      this.openaiClient = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: this.config.baseUrl
      });
    }
  }

  // 分析单条消息
  async analyzeMessage(input: MessageAnalysisInput): Promise<MessageAnalysisResult> {
    if (this.config.provider === 'mock') {
      return this.mockAnalyzeMessage(input);
    }

    if (this.config.provider === 'openai') {
      return this.openaiAnalyzeMessage(input);
    }

    // TODO: 集成Anthropic等其他AI模型
    throw new Error(`AI provider ${this.config.provider} not yet implemented`);
  }

  // 模拟消息分析（用于开发和测试）
  private async mockAnalyzeMessage(input: MessageAnalysisInput): Promise<MessageAnalysisResult> {
    const now = new Date().toISOString();

    // 简单的基于规则的分析
    const currentContent = input.content.toLowerCase();
    const isCustomer = input.senderRole === 'customer';

    // 如果有会话上下文，合并上下文内容以增强分析
    let combinedContent = currentContent;
    if (input.conversationContext && input.conversationContext.length > 0) {
      // 将上下文内容拼接起来，优先考虑客户的消息
      const contextTexts = input.conversationContext.map(ctx => ctx.content.toLowerCase());
      combinedContent = [...contextTexts, currentContent].join(' ');
    }

    const understanding = {
      userQuestion: currentContent.includes('?') ? this.extractQuestion(currentContent) : null,
      userState: this.assessUserState(combinedContent), // 使用合并内容评估用户状态
      newNeeds: this.extractNeeds(combinedContent),
      concerns: this.extractConcerns(combinedContent),
      risks: this.extractRisks(combinedContent),
      informationWorthy: this.extractWorthyInformation(combinedContent)
    };

    const extraction = {
      basicInfoUpdates: this.extractBasicInfo(combinedContent), // 从整个上下文提取基本信息
      newRequirements: understanding.newNeeds,
      keyStateChanges: understanding.userState ? [understanding.userState] : [],
      riskPoints: understanding.risks,
      followupItems: this.generateFollowupItems(understanding)
    };

    const archiveUpdates = {
      memberArchiveUpdates: isCustomer ? this.mapToMemberArchive(extraction) : {},
      patientArchiveUpdates: isCustomer ? this.mapToPatientArchive(extraction) : {}
    };

    // mock模式下生成示例回复
    const mockReply = isCustomer ? this.generateMockReply(currentContent, understanding) : null;

    return {
      messageId: input.messageId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      understanding,
      extraction,
      archiveUpdates,
      replyText: mockReply,
      needsHumanHandoff: false,
      confidence: 0.7,
      analysisTimestamp: now
    };
  }

  // 生成mock回复（开发测试用）
  private generateMockReply(content: string, understanding: MessageAnalysisResult['understanding']): string | null {
    if (!content.trim()) return null;
    if (understanding.risks.length > 0) {
      return `您好！您提到的情况需要关注，建议您及时就医或联系医生进行评估。如有紧急情况，请立即拨打急救电话。`;
    }
    if (understanding.userQuestion) {
      return `您好！感谢您的提问。关于您的问题，建议您保持健康的生活方式，如有具体疑问欢迎继续交流～`;
    }
    return `收到您的消息，感谢您的分享！如有健康方面的问题随时可以告诉我。`;
  }

  // OpenAI消息分析
  private async openaiAnalyzeMessage(input: MessageAnalysisInput): Promise<MessageAnalysisResult> {
    const now = new Date().toISOString();

    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    // 构建会话上下文
    const contextMessages = input.conversationContext || [];
    const allMessages = [...contextMessages, {
      senderRole: input.senderRole,
      content: input.content,
      timestamp: input.timestamp
    }];

    // 构建提示词（私聊时注入档案上下文）
    const archiveContext = (input as any)._archiveContext as string | undefined;
    const prompt = this.buildAnalysisPrompt(input, allMessages, archiveContext);

    try {
      const response = await this.openaiClient.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是"健康助手"，在企业微信群和私信中为慢病患者提供健康支持。
你的职责：
- 提供健康指导、科普知识、情绪疏导，引导患者养成良好生活习惯
- 发现患者新需求，提炼关键信息沉淀到档案
- 注意：你只提供健康建议，不提供医疗诊断或处方
- 群聊中严禁透露任何患者个人隐私信息，只能引用该用户在本群中亲自说过的内容
- 如遇到无法回答的运营/排班/医生信息等问题，在replyText中@真人助理

请以JSON格式返回分析结果，严格按照指定的结构。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error('Empty response from OpenAI');
      }

      // 解析JSON响应
      const parsedResult = JSON.parse(resultText);

      // 将OpenAI响应映射到MessageAnalysisResult结构
      return this.mapOpenAIResponseToAnalysisResult(parsedResult, input, now);

    } catch (error) {
      console.error('OpenAI analysis error:', error);
      // 失败时回退到模拟分析
      console.log('Falling back to mock analysis due to OpenAI error');
      return this.mockAnalyzeMessage(input);
    }
  }

  // 构建分析提示词（支持档案上下文注入）
  private buildAnalysisPrompt(
    input: MessageAnalysisInput,
    allMessages: Array<{senderRole: string, content: string, timestamp: string}>,
    archiveContext?: string
  ): string {
    const messageContext = allMessages.map(msg =>
      `[${msg.timestamp}] ${msg.senderRole}: ${msg.content}`
    ).join('\n');

    const archiveSection = archiveContext
      ? `\n用户健康背景（仅供参考，私聊可用，群聊中禁止透露）：\n${archiveContext}\n`
      : '';

    return `请分析以下医疗健康对话消息，并返回JSON格式的分析结果：

对话上下文：
${messageContext}
${archiveSection}
当前分析的消息ID：${input.messageId}
发送者角色：${input.senderRole}
发送者ID：${input.senderId}
对话ID：${input.conversationId}

请提供以下分析结果（JSON格式）：
1. understanding（理解部分）：
   - userQuestion：用户的主要问题或疑问（如果没有问题则为null）
   - userState：用户当前状态（如urgent/紧急, confused/困惑, satisfied/满意, dissatisfied/不满意, neutral/中性）
   - newNeeds：用户表达的新需求（字符串数组）
   - concerns：用户的担忧或顾虑（字符串数组）
   - risks：识别到的风险点（字符串数组）
   - informationWorthy：有价值的信息点（字符串数组）

2. extraction（信息提炼部分）：
   - basicInfoUpdates：从消息中提取的基本信息更新（键值对对象，如{"年龄": "45岁", "性别": "女性"}）
   - newRequirements：新发现的要求或需求（字符串数组）
   - keyStateChanges：关键状态变化（字符串数组）
   - riskPoints：风险点详情（字符串数组）
   - followupItems：需要跟进的事项（字符串数组）

3. archiveUpdates（档案更新建议）：
   - memberArchiveUpdates：成员档案更新建议（键值对对象）
   - patientArchiveUpdates：患者档案更新建议（键值对对象）

4. replyText：给用户的回复文本（字符串，如果不需要回复则为null）
   - 群聊场景：只能引用用户在本群中亲自说过的内容，不能透露档案隐私
   - 私聊场景：可以结合用户健康背景给出个性化建议
   - 遇到无法回答的运营/排班/医生信息问题时，回复中包含"@助理"请求真人协助

5. needsHumanHandoff：是否需要转给真人助理（布尔值）
   - 遇到紧急医疗情况、投诉、或AI无法处理的问题时设为true

6. confidence：分析置信度（0.0-1.0之间的浮点数）

请确保返回纯JSON，不要包含其他文本。`;
  }

  // 将OpenAI响应映射到分析结果结构
  private mapOpenAIResponseToAnalysisResult(
    openaiResponse: any,
    input: MessageAnalysisInput,
    timestamp: string
  ): MessageAnalysisResult {
    // 默认值
    const defaultResult: MessageAnalysisResult = {
      messageId: input.messageId,
      conversationId: input.conversationId,
      senderId: input.senderId,
      understanding: {
        userQuestion: null,
        userState: null,
        newNeeds: [],
        concerns: [],
        risks: [],
        informationWorthy: []
      },
      extraction: {
        basicInfoUpdates: {},
        newRequirements: [],
        keyStateChanges: [],
        riskPoints: [],
        followupItems: []
      },
      archiveUpdates: {
        memberArchiveUpdates: {},
        patientArchiveUpdates: {}
      },
      replyText: null,
      needsHumanHandoff: false,
      confidence: 0.7,
      analysisTimestamp: timestamp
    };

    try {
      // 映射understanding
      if (openaiResponse.understanding) {
        defaultResult.understanding = {
          userQuestion: openaiResponse.understanding.userQuestion || null,
          userState: openaiResponse.understanding.userState || null,
          newNeeds: Array.isArray(openaiResponse.understanding.newNeeds) ? openaiResponse.understanding.newNeeds : [],
          concerns: Array.isArray(openaiResponse.understanding.concerns) ? openaiResponse.understanding.concerns : [],
          risks: Array.isArray(openaiResponse.understanding.risks) ? openaiResponse.understanding.risks : [],
          informationWorthy: Array.isArray(openaiResponse.understanding.informationWorthy) ? openaiResponse.understanding.informationWorthy : []
        };
      }

      // 映射extraction
      if (openaiResponse.extraction) {
        defaultResult.extraction = {
          basicInfoUpdates: openaiResponse.extraction.basicInfoUpdates || {},
          newRequirements: Array.isArray(openaiResponse.extraction.newRequirements) ? openaiResponse.extraction.newRequirements : [],
          keyStateChanges: Array.isArray(openaiResponse.extraction.keyStateChanges) ? openaiResponse.extraction.keyStateChanges : [],
          riskPoints: Array.isArray(openaiResponse.extraction.riskPoints) ? openaiResponse.extraction.riskPoints : [],
          followupItems: Array.isArray(openaiResponse.extraction.followupItems) ? openaiResponse.extraction.followupItems : []
        };
      }

      // 映射archiveUpdates
      if (openaiResponse.archiveUpdates) {
        defaultResult.archiveUpdates = {
          memberArchiveUpdates: openaiResponse.archiveUpdates.memberArchiveUpdates || {},
          patientArchiveUpdates: openaiResponse.archiveUpdates.patientArchiveUpdates || {}
        };
      }

      // 映射confidence
      if (typeof openaiResponse.confidence === 'number') {
        defaultResult.confidence = Math.max(0.0, Math.min(1.0, openaiResponse.confidence));
      }

      // 映射replyText和needsHumanHandoff
      defaultResult.replyText = typeof openaiResponse.replyText === 'string' ? openaiResponse.replyText : null;
      defaultResult.needsHumanHandoff = openaiResponse.needsHumanHandoff === true;

      return defaultResult;
    } catch (error) {
      console.error('Error mapping OpenAI response:', error);
      return defaultResult;
    }
  }

  // 分析档案并生成完善建议
  async analyzeArchive(input: ArchiveAnalysisInput): Promise<ArchiveAnalysisResult> {
    if (this.config.provider === 'mock') {
      return this.mockAnalyzeArchive(input);
    }

    if (this.config.provider === 'openai') {
      return await this.openaiAnalyzeArchive(input);
    }

    throw new Error(`AI provider ${this.config.provider} not yet implemented`);
  }

  private async mockAnalyzeArchive(input: ArchiveAnalysisInput): Promise<ArchiveAnalysisResult> {
    const now = new Date().toISOString();

    // 模拟档案分析逻辑
    const recentMessages = input.recentConversations.flatMap(conv =>
      conv.messages.filter(msg => msg.senderRole === 'customer')
    );

    const latestMessages = recentMessages.slice(0, 3);
    const customerTexts = latestMessages.map(msg => msg.content).join(' ');

    return {
      archiveType: input.archiveType,
      archiveId: input.archiveId,
      improvements: {
        basicInfo: customerTexts.length > 50 ? this.summarizeBasicInfo(customerTexts) : null,
        preferences: this.extractPreferences(customerTexts),
        coreProblem: this.identifyCoreProblem(customerTexts),
        communicationSummary: this.assessCommunicationStyle(latestMessages),
        followupFocus: this.suggestFollowupFocus(customerTexts),
        personaSummary: this.generatePersonaSummary(customerTexts),
        recentIssueSummary: this.summarizeRecentIssues(latestMessages),
        followupPlan: this.createFollowupPlan(customerTexts)
      },
      insights: this.generateInsights(customerTexts),
      confidence: 0.6,
      analysisTimestamp: now
    };
  }

  // OpenAI档案分析
  async openaiAnalyzeArchive(input: ArchiveAnalysisInput): Promise<ArchiveAnalysisResult> {
    const now = new Date().toISOString();

    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // 构建档案分析提示词
      const prompt = this.buildArchiveAnalysisPrompt(input);

      const response = await this.openaiClient.chat.completions.create({
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的医疗健康档案分析师。
你的任务是分析患者或群成员的档案信息，基于最近的对话内容，提供档案完善建议和关键洞察。
请以JSON格式返回分析结果，严格按照指定的结构。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      const resultText = response.choices[0]?.message?.content;
      if (!resultText) {
        throw new Error('Empty response from OpenAI');
      }

      // 解析JSON响应
      const parsedResult = JSON.parse(resultText);

      // 将OpenAI响应映射到ArchiveAnalysisResult结构
      return this.mapOpenAIResponseToArchiveAnalysisResult(parsedResult, input, now);

    } catch (error) {
      console.error('OpenAI archive analysis error:', error);
      // 失败时回退到模拟分析
      console.log('Falling back to mock archive analysis due to OpenAI error');
      return this.mockAnalyzeArchive(input);
    }
  }

  // 构建档案分析提示词
  private buildArchiveAnalysisPrompt(input: ArchiveAnalysisInput): string {
    const archiveType = input.archiveType === 'member' ? '群成员档案' : '患者档案';

    // 构建最近对话上下文
    let conversationContext = '';
    if (input.recentConversations && input.recentConversations.length > 0) {
      conversationContext = '最近对话内容：\n';
      input.recentConversations.forEach((conv, idx) => {
        conversationContext += `\n会话 ${idx + 1}:\n`;
        conv.messages.forEach(msg => {
          conversationContext += `[${msg.timestamp}] ${msg.senderRole}: ${msg.content}\n`;
        });
      });
    }

    // 当前档案内容
    const currentArchive = JSON.stringify(input.currentArchive, null, 2);

    return `请分析以下${archiveType}，并返回JSON格式的完善建议：

档案ID：${input.archiveId}
档案类型：${archiveType}

当前档案内容：
${currentArchive}

${conversationContext}

请提供以下分析结果（JSON格式）：

1. improvements（完善建议）：
   - basicInfo：基本信息完善建议（如更详细的年龄、性别、病史等）
   - preferences：偏好与习惯完善建议
   - coreProblem：核心问题/需求完善建议
   - communicationSummary：沟通风格总结完善建议
   - followupFocus：后续跟进重点完善建议
   - personaSummary：人物画像总结完善建议
   - recentIssueSummary：近期问题摘要完善建议
   - followupPlan：跟进计划完善建议

2. insights（关键洞察）：
   - 字符串数组，包含重要的发现和洞察

3. confidence：分析置信度（0.0-1.0之间的浮点数）

请确保返回纯JSON，不要包含其他文本。`;
  }

  // 将OpenAI响应映射到档案分析结果结构
  private mapOpenAIResponseToArchiveAnalysisResult(
    openaiResponse: any,
    input: ArchiveAnalysisInput,
    timestamp: string
  ): ArchiveAnalysisResult {
    // 默认值
    const defaultResult: ArchiveAnalysisResult = {
      archiveType: input.archiveType,
      archiveId: input.archiveId,
      improvements: {
        basicInfo: null,
        preferences: null,
        coreProblem: null,
        communicationSummary: null,
        followupFocus: null,
        personaSummary: null,
        recentIssueSummary: null,
        followupPlan: null
      },
      insights: [],
      confidence: 0.7,
      analysisTimestamp: timestamp
    };

    try {
      // 映射improvements
      if (openaiResponse.improvements) {
        defaultResult.improvements = {
          basicInfo: openaiResponse.improvements.basicInfo || null,
          preferences: openaiResponse.improvements.preferences || null,
          coreProblem: openaiResponse.improvements.coreProblem || null,
          communicationSummary: openaiResponse.improvements.communicationSummary || null,
          followupFocus: openaiResponse.improvements.followupFocus || null,
          personaSummary: openaiResponse.improvements.personaSummary || null,
          recentIssueSummary: openaiResponse.improvements.recentIssueSummary || null,
          followupPlan: openaiResponse.improvements.followupPlan || null
        };
      }

      // 映射insights
      if (Array.isArray(openaiResponse.insights)) {
        defaultResult.insights = openaiResponse.insights;
      }

      // 映射confidence
      if (typeof openaiResponse.confidence === 'number') {
        defaultResult.confidence = Math.max(0.0, Math.min(1.0, openaiResponse.confidence));
      }

      return defaultResult;
    } catch (error) {
      console.error('Error mapping OpenAI archive response:', error);
      return defaultResult;
    }
  }

  // 辅助方法 - 模拟实现
  private extractQuestion(content: string): string {
    const sentences = content.split(/[.!?]+/).filter(s => s.includes('?'));
    return sentences[0]?.trim() || content.substring(0, 100);
  }

  private assessUserState(content: string): string {
    if (content.includes('着急') || content.includes('急') || content.includes('尽快')) return 'urgent';
    if (content.includes('困惑') || content.includes('不明白') || content.includes('怎么')) return 'confused';
    if (content.includes('满意') || content.includes('好') || content.includes('谢谢')) return 'satisfied';
    if (content.includes('不满') || content.includes('不好') || content.includes('问题')) return 'dissatisfied';
    return 'neutral';
  }

  private extractNeeds(content: string): string[] {
    const needs: string[] = [];
    if (content.includes('咨询') || content.includes('了解')) needs.push('信息咨询');
    if (content.includes('预约') || content.includes('时间')) needs.push('预约服务');
    if (content.includes('价格') || content.includes('费用')) needs.push('价格咨询');
    if (content.includes('症状') || content.includes('不舒服')) needs.push('症状咨询');
    return needs;
  }

  private extractConcerns(content: string): string[] {
    const concerns: string[] = [];
    if (content.includes('担心') || content.includes('忧虑')) concerns.push('健康担忧');
    if (content.includes('副作用') || content.includes('风险')) concerns.push('治疗风险');
    if (content.includes('时间') || content.includes('太长')) concerns.push('时间成本');
    if (content.includes('费用') || content.includes('贵')) concerns.push('费用问题');
    return concerns;
  }

  private extractRisks(content: string): string[] {
    const risks: string[] = [];
    if (content.includes('严重') || content.includes('恶化')) risks.push('病情恶化风险');
    if (content.includes('停药') || content.includes('停止')) risks.push('治疗中断风险');
    if (content.includes('错误') || content.includes('不对')) risks.push('信息错误风险');
    return risks;
  }

  private extractWorthyInformation(content: string): string[] {
    const info: string[] = [];
    if (content.includes('年龄') || content.includes('岁')) info.push('年龄信息');
    if (content.includes('病史') || content.includes('诊断')) info.push('病史信息');
    if (content.includes('用药') || content.includes('药物')) info.push('用药信息');
    if (content.includes('症状') || content.includes('感觉')) info.push('症状描述');
    return info;
  }

  private extractBasicInfo(content: string): Record<string, string> {
    const updates: Record<string, string> = {};
    const ageMatch = content.match(/(\d+)岁/);
    if (ageMatch) updates['年龄'] = ageMatch[1];

    if (content.includes('男性') || content.includes('男')) updates['性别'] = '男性';
    if (content.includes('女性') || content.includes('女')) updates['性别'] = '女性';

    // 医疗相关信息提取
    const medicalInfo = this.extractMedicalInformation(content);
    Object.assign(updates, medicalInfo);

    return updates;
  }

  // 提取医疗信息：主诉、既往史、用药情况等
  private extractMedicalInformation(content: string): Record<string, string> {
    const medical: Record<string, string> = {};

    // 主诉提取（主要症状）
    const chiefComplaint = this.extractChiefComplaint(content);
    if (chiefComplaint) medical['主诉'] = chiefComplaint;

    // 既往病史
    const medicalHistory = this.extractMedicalHistory(content);
    if (medicalHistory) medical['既往史'] = medicalHistory;

    // 用药情况
    const medicationInfo = this.extractMedicationInfo(content);
    if (medicationInfo) medical['用药情况'] = medicationInfo;

    // 生活管理
    const lifestyleInfo = this.extractLifestyleInfo(content);
    if (lifestyleInfo) medical['生活管理'] = lifestyleInfo;

    // 就诊意愿
    const visitIntention = this.extractVisitIntention(content);
    if (visitIntention) medical['就诊意愿'] = visitIntention;

    // 情绪指标
    const emotionIndicators = this.extractEmotionIndicators(content);
    if (emotionIndicators) medical['情绪指标'] = emotionIndicators;

    // 血糖相关
    const glucoseInfo = this.extractGlucoseInfo(content);
    if (glucoseInfo) medical['血糖信息'] = glucoseInfo;

    // 血压相关
    const bloodPressureInfo = this.extractBloodPressureInfo(content);
    if (bloodPressureInfo) medical['血压信息'] = bloodPressureInfo;

    // 体重相关
    const weightInfo = this.extractWeightInfo(content);
    if (weightInfo) medical['体重信息'] = weightInfo;

    return medical;
  }

  // 提取主诉（主要症状）
  private extractChiefComplaint(content: string): string | null {
    const symptomKeywords = [
      '头晕', '头痛', '恶心', '呕吐', '发热', '发烧', '咳嗽', '咳痰', '胸闷', '胸痛',
      '心悸', '心慌', '气短', '气喘', '呼吸困难', '腹痛', '腹泻', '拉肚子', '便秘', '尿频', '尿急', '尿痛',
      '乏力', '疲劳', '累', '失眠', '睡不好', '焦虑', '紧张', '抑郁', '情绪低落', '疼痛', '酸痛', '肿胀', '水肿', '麻木', '发麻', '瘙痒', '痒',
      '口干', '口苦', '耳鸣', '眼花', '视力模糊', '鼻塞', '流鼻涕', '打喷嚏', '喉咙痛', '咽痛', '吞咽困难',
      '关节痛', '腰痛', '背痛', '腿痛', '肌肉痛', '抽筋', '心绞痛', '心前区痛', '反酸', '烧心', '嗳气', '打嗝',
      '皮疹', '红肿', '淤血', '出血', '便血', '黑便', '血尿', '尿血', '咯血', '吐血'
    ];

    const foundSymptoms = symptomKeywords.filter(keyword => content.includes(keyword));
    if (foundSymptoms.length > 0) {
      // 去重并保留顺序
      const uniqueSymptoms = Array.from(new Set(foundSymptoms));
      return uniqueSymptoms.join('、');
    }

    // 通用症状描述
    const discomfortKeywords = ['不舒服', '不适', '难受', '不行', '不对劲', '不对劲'];
    for (const keyword of discomfortKeywords) {
      if (content.includes(keyword)) {
        const startIdx = content.indexOf(keyword);
        const contextStart = Math.max(0, startIdx - 30);
        const contextEnd = Math.min(content.length, startIdx + keyword.length + 30);
        const context = content.substring(contextStart, contextEnd).trim();
        return `不适感：${context}`;
      }
    }

    // 尝试提取症状描述模式，如“最近总是头痛”
    const symptomPattern = /(最近|这几天|今天|早上|下午|晚上)?(总是|经常|偶尔|有点)?(头痛|头晕|恶心|咳嗽|腹痛)/;
    const match = content.match(symptomPattern);
    if (match && match[3]) {
      return match[3];
    }

    return null;
  }

  // 提取既往病史
  private extractMedicalHistory(content: string): string | null {
    const historyKeywords = [
      '高血压', '糖尿病', '心脏病', '冠心病', '心肌梗塞', '心梗', '脑卒中', '中风', '脑梗', '肾病', '肝病', '肝炎', '肝硬化',
      '哮喘', '慢阻肺', '肺气肿', '支气管炎', '肺炎', '关节炎', '风湿', '骨质疏松', '骨折', '肿瘤', '癌症', '胃癌', '肺癌', '乳腺癌',
      '手术史', '过敏史', '青霉素过敏', '药物过敏', '食物过敏', '甲状腺', '甲亢', '甲减', '高血脂', '高胆固醇', '痛风', '高尿酸',
      '胃病', '胃炎', '胃溃疡', '肠炎', '结肠炎', '胰腺炎', '胆囊炎', '胆结石', '肾结石', '前列腺', '前列腺炎', '妇科病', '月经不调',
      '抑郁症', '焦虑症', '精神分裂', '癫痫', '帕金森', '阿尔茨海默', '老年痴呆', '白内障', '青光眼', '视网膜病变', '皮肤病', '湿疹', '牛皮癣',
      '艾滋病', '乙肝', '丙肝', '结核', '肺结核', '新冠肺炎', '新冠'
    ];

    const foundHistory = historyKeywords.filter(keyword => content.includes(keyword));
    if (foundHistory.length > 0) {
      const uniqueHistory = Array.from(new Set(foundHistory));
      return uniqueHistory.join('、');
    }

    // 年限提取，匹配“高血压3年”、“糖尿病十年”
    const yearPattern = /(\d+)[年]?(高血压|糖尿病|心脏病|冠心病|脑卒中|中风|肾病|肝病|哮喘|慢阻肺|关节炎|骨质疏松|肿瘤|癌症)/;
    const match = content.match(yearPattern);
    if (match) {
      return `${match[2]} ${match[1]}年`;
    }

    // 尝试匹配“有高血压”、“得过糖尿病”
    const hasPattern = /(有|得过|患有|诊断出)(高血压|糖尿病|心脏病|冠心病|脑卒中|中风)/;
    const hasMatch = content.match(hasPattern);
    if (hasMatch && hasMatch[2]) {
      return hasMatch[2];
    }

    return null;
  }

  // 提取用药情况
  private extractMedicationInfo(content: string): string | null {
    const medicationKeywords = [
      '胰岛素', '二甲双胍', '格列美脲', '格列齐特', '格列本脲', '阿卡波糖', '伏格列波糖', '罗格列酮', '吡格列酮', '西格列汀', '利拉鲁肽',
      '降压药', '硝苯地平', '氨氯地平', '依那普利', '卡托普利', '氯沙坦', '缬沙坦', '美托洛尔', '比索洛尔', '氢氯噻嗪', '螺内酯',
      '阿司匹林', '他汀', '阿托伐他汀', '瑞舒伐他汀', '辛伐他汀', '降脂药', '非诺贝特', '吉非罗齐',
      '抗生素', '青霉素', '头孢', '阿莫西林', '左氧氟沙星', '莫西沙星', '阿奇霉素', '克林霉素',
      '止痛药', '布洛芬', '对乙酰氨基酚', '扑热息痛', '双氯芬酸', '萘普生', '曲马多', '吗啡',
      '消炎药', '糖皮质激素', '泼尼松', '地塞米松', '氢化可的松', '非甾体抗炎药',
      '中药', '西药', '口服', '注射', '雾化', '吸入', '外用', '贴剂', '栓剂', '滴眼液', '滴耳液',
      '抗抑郁药', '舍曲林', '氟西汀', '帕罗西汀', '文拉法辛', '米氮平', '安眠药', '地西泮', '阿普唑仑', '佐匹克隆',
      '抗过敏药', '氯雷他定', '西替利嗪', '扑尔敏', '孟鲁司特', '哮喘药', '沙丁胺醇', '布地奈德', '茶碱'
    ];

    const foundMeds = medicationKeywords.filter(keyword => content.includes(keyword));
    if (foundMeds.length > 0) {
      const uniqueMeds = Array.from(new Set(foundMeds));
      return uniqueMeds.join('、');
    }

    // 剂量提取，匹配“早晚各一片”、“每次2粒”、“每天三次”
    const dosePatterns = [
      /([早晚睡前餐前餐后]?)(\d+)(mg|毫克|g|克|ml|毫升|片|粒|单位|滴)/,
      /(\d+)(mg|毫克|g|克|ml|毫升|片|粒|单位|滴)\s*[，,]?\s*([早晚睡前餐前餐后])/,
      /(每次|每天|每日|每餐|早晚各?)(\d+)(片|粒|毫升|mg|克)/
    ];

    for (const pattern of dosePatterns) {
      const doseMatch = content.match(pattern);
      if (doseMatch) {
        const time = doseMatch[1] || doseMatch[3] || '每日';
        const amount = doseMatch[2];
        const unit = doseMatch[3] || doseMatch[2]; // 调整索引
        return `${time}${amount}${unit}`;
      }
    }

    // 尝试匹配“吃药”、“服药”、“用药”
    if (content.includes('吃药') || content.includes('服药') || content.includes('用药') || content.includes('吃药')) {
      return '用药情况提及';
    }

    return null;
  }

  // 提取生活管理信息
  private extractLifestyleInfo(content: string): string | null {
    const lifestyleKeywords = [
      '饮食控制', '运动锻炼', '戒烟', '限酒', '戒酒', '作息规律', '睡眠质量', '早睡早起', '熬夜', '晚睡',
      '低盐', '低脂', '低糖', '低胆固醇', '高蛋白', '高纤维', '清淡饮食', '素食', '荤素搭配', '均衡饮食',
      '有氧运动', '无氧运动', '散步', '跑步', '慢跑', '快走', '游泳', '骑车', '骑行', '健身房', '瑜伽', '太极', '气功',
      '吸烟', '喝酒', '饮酒', '酗酒', '咖啡', '茶', '喝水', '饮水', '饮水量',
      '工作压力', '工作忙', '加班', '久坐', '长时间坐着', '缺乏运动', '运动不足', '体力活动',
      '旅游', '旅行', '休闲', '娱乐', '看电视', '玩手机', '上网', '游戏', '阅读', '学习',
      '家庭关系', '夫妻关系', '亲子关系', '社交', '朋友', '孤独', '独居'
    ];

    const foundLifestyle = lifestyleKeywords.filter(keyword => content.includes(keyword));
    if (foundLifestyle.length > 0) {
      const uniqueLifestyle = Array.from(new Set(foundLifestyle));
      return uniqueLifestyle.join('、');
    }

    // 饮食相关
    if (content.includes('吃') && (content.includes('控制') || content.includes('注意') || content.includes('少吃') || content.includes('多吃'))) {
      return '饮食控制';
    }

    // 运动相关
    if (content.includes('运动') || content.includes('锻炼') || content.includes('走路') || content.includes('散步') || content.includes('跑步') || content.includes('健身')) {
      return '运动锻炼';
    }

    // 睡眠相关
    if (content.includes('睡觉') || content.includes('睡眠') || content.includes('熬夜') || content.includes('失眠') || content.includes('早睡')) {
      return '睡眠管理';
    }

    // 烟酒相关
    if (content.includes('抽烟') || content.includes('吸烟') || content.includes('喝酒') || content.includes('饮酒')) {
      return '烟酒习惯';
    }

    return null;
  }

  // 提取就诊意愿
  private extractVisitIntention(content: string): string | null {
    if (content.includes('挂号') || content.includes('预约') || content.includes('看病') ||
        content.includes('就诊') || content.includes('复查')) {
      return '有就诊意愿';
    }

    if (content.includes('不想去') || content.includes('不愿意') || content.includes('害怕')) {
      return '就诊顾虑';
    }

    if (content.includes('再观察') || content.includes('等等看') || content.includes('再说')) {
      return '观望态度';
    }

    return null;
  }

  // 提取情绪指标
  private extractEmotionIndicators(content: string): string | null {
    const positiveWords = ['放心', '安心', '满意', '高兴', '开心', '快乐', '感谢', '谢谢', '好转', '改善', '好多了', '舒服', '舒适', '轻松', '乐观', '有信心', '希望', '期待'];
    const negativeWords = ['担心', '忧虑', '焦虑', '紧张', '害怕', '恐惧', '恐慌', '烦恼', '郁闷', '沮丧', '低落', '失望', '绝望', '痛苦', '难受', '痛苦', '伤心', '难过', '生气', '愤怒', '恼火', '烦躁', '急躁', '不耐烦', '无助', '孤独', '寂寞'];
    const urgentWords = ['着急', '紧急', '尽快', '马上', '立刻', '赶快', '赶紧', '即刻', '立即', '迫切'];

    const positiveCount = positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = negativeWords.filter(word => content.includes(word)).length;
    const urgentCount = urgentWords.filter(word => content.includes(word)).length;

    if (urgentCount > 0) return '紧急';
    if (negativeCount > positiveCount * 2) return '负面情绪较强';
    if (negativeCount > positiveCount) return '负面情绪';
    if (positiveCount > negativeCount * 2) return '正面情绪较强';
    if (positiveCount > negativeCount) return '正面情绪';
    if (negativeCount > 0) return '有些担忧';

    // 检测情绪描述短语
    if (content.includes('心情不好') || content.includes('情绪低落') || content.includes('很郁闷')) {
      return '情绪低落';
    }
    if (content.includes('心情很好') || content.includes('很开心') || content.includes('很高兴')) {
      return '情绪积极';
    }
    if (content.includes('压力大') || content.includes('压力很大') || content.includes('压力山大')) {
      return '压力较大';
    }
    if (content.includes('睡不着') || content.includes('失眠') || content.includes('睡不好')) {
      return '睡眠问题';
    }

    return null;
  }

  // 提取血糖信息
  private extractGlucoseInfo(content: string): string | null {
    const glucosePattern = /血糖[：:]?\s*(\d+(?:\.\d+)?)\s*(mmol\/L|mmol|mM)/i;
    const match = content.match(glucosePattern);
    if (match) {
      return `${match[1]}${match[2]}`;
    }

    // 简写
    if (content.includes('血糖高') || content.includes('血糖低')) {
      return content.includes('血糖高') ? '血糖偏高' : '血糖偏低';
    }

    return null;
  }

  // 提取血压信息
  private extractBloodPressureInfo(content: string): string | null {
    const bpPattern = /血压[：:]?\s*(\d+)\s*\/\s*(\d+)\s*(mmHg|mmhg)/i;
    const match = content.match(bpPattern);
    if (match) {
      return `${match[1]}/${match[2]}${match[3]}`;
    }

    return null;
  }

  // 提取体重信息
  private extractWeightInfo(content: string): string | null {
    const weightPattern = /体重[：:]?\s*(\d+(?:\.\d+)?)\s*(kg|公斤|千克)/i;
    const match = content.match(weightPattern);
    if (match) {
      return `${match[1]}${match[2]}`;
    }

    return null;
  }

  private generateFollowupItems(understanding: any): string[] {
    const items: string[] = [];
    if (understanding.userQuestion) items.push(`回答问题: ${understanding.userQuestion}`);
    if (understanding.newNeeds.length > 0) items.push(`跟进需求: ${understanding.newNeeds.join(', ')}`);
    if (understanding.risks.length > 0) items.push(`处理风险: ${understanding.risks.join(', ')}`);
    return items;
  }

  private mapToMemberArchive(extraction: any): Record<string, string> {
    const updates: Record<string, string> = {};
    if (Object.keys(extraction.basicInfoUpdates).length > 0) {
      updates['basicInfo'] = JSON.stringify(extraction.basicInfoUpdates);
    }
    if (extraction.newRequirements.length > 0) {
      updates['coreProblem'] = extraction.newRequirements.join('; ');
    }
    return updates;
  }

  private mapToPatientArchive(extraction: any): Record<string, string> {
    return this.mapToMemberArchive(extraction); // 暂时相同
  }

  private summarizeBasicInfo(content: string): string {
    return `从对话中提取的基本信息：${content.substring(0, 100)}...`;
  }

  private extractPreferences(content: string): string | null {
    if (content.includes('喜欢') || content.includes('偏好')) {
      return '从对话中识别出的用户偏好';
    }
    return null;
  }

  private identifyCoreProblem(content: string): string | null {
    if (content.includes('问题') || content.includes('困难')) {
      return '核心问题描述';
    }
    return null;
  }

  private assessCommunicationStyle(messages: any[]): string {
    if (messages.length === 0) return '暂无沟通数据';
    const avgLength = messages.reduce((sum, msg) => sum + msg.content.length, 0) / messages.length;
    if (avgLength < 20) return '简洁直接';
    if (avgLength > 100) return '详细描述';
    return '中等长度';
  }

  private suggestFollowupFocus(content: string): string | null {
    const needs = this.extractNeeds(content);
    if (needs.length > 0) return `重点关注: ${needs.join(', ')}`;
    return null;
  }

  private generatePersonaSummary(content: string): string | null {
    const state = this.assessUserState(content);
    return `用户状态: ${state}, 表达特点: ${content.length > 50 ? '详细' : '简洁'}`;
  }

  private summarizeRecentIssues(messages: any[]): string | null {
    if (messages.length === 0) return null;
    const issues = messages.filter(msg =>
      msg.content.includes('问题') || msg.content.includes('困难')
    );
    if (issues.length > 0) return `最近提到${issues.length}个问题`;
    return null;
  }

  private createFollowupPlan(content: string): string | null {
    const needs = this.extractNeeds(content);
    if (needs.length > 0) return `跟进计划: 1. 确认${needs[0]} 2. 提供解决方案`;
    return null;
  }

  private generateInsights(content: string): string[] {
    const insights: string[] = [];
    if (content.includes('长期') || content.includes('一直')) insights.push('用户可能为长期需求');
    if (content.includes('首次') || content.includes('第一次')) insights.push('用户可能为首次咨询');
    return insights;
  }

  // 保存分析结果到数据库
  async saveAnalysisResult(analysis: any): Promise<string> {
    const analysisId = `ai_analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.query(
      `insert into wecom_event_state (
        id, conversation_id, message_id, linked_customer_id,
        event_category, event_action, lifecycle_status,
        state_transition, payload_json, created_at
      ) values (
        $1, $2, $3, $4,
        'ai_analysis', 'message_processed', 'completed',
        'message_analyzed_to_archive_updated', $5::jsonb, now()
      )`,
      [
        analysisId,
        analysis.conversationId,
        analysis.messageId,
        analysis.senderId,
        JSON.stringify({
          analysis: {
            understanding: analysis.understanding,
            extraction: analysis.extraction,
            confidence: analysis.confidence,
            archiveUpdates: analysis.archiveUpdates
          },
          metadata: {
            analysisTimestamp: analysis.analysisTimestamp,
            model: 'ai_model_service'
          }
        })
      ]
    );

    return analysisId;
  }

  // 生成对话摘要
  async generateConversationSummary(conversationId: string, messages: any[]) {
    if (messages.length === 0) {
      return {
        summary: '暂无对话内容',
        keyTopics: [],
        customerSentiment: 'neutral'
      };
    }

    const customerMessages = messages.filter(msg => msg.content_text);
    const recentMessages = customerMessages.slice(-5); // 最近5条消息

    // 简单的摘要生成
    const topics = this.extractTopics(recentMessages.map(msg => msg.content_text));
    const sentiment = this.assessSentiment(recentMessages);

    return {
      summary: `对话包含${customerMessages.length}条客户消息，最近讨论：${topics.join(', ')}`,
      keyTopics: topics,
      customerSentiment: sentiment,
      messageCount: customerMessages.length,
      lastMessageTime: messages[messages.length - 1]?.sent_at
    };
  }

  // 提取主题
  private extractTopics(messages: string[]): string[] {
    const topics: string[] = [];
    const allText = messages.join(' ').toLowerCase();

    if (allText.includes('血糖') || allText.includes('glucose')) topics.push('血糖管理');
    if (allText.includes('血压') || allText.includes('blood')) topics.push('血压管理');
    if (allText.includes('饮食') || allText.includes('吃')) topics.push('饮食咨询');
    if (allText.includes('运动') || allText.includes('锻炼')) topics.push('运动建议');
    if (allText.includes('药物') || allText.includes('用药')) topics.push('用药咨询');
    if (allText.includes('症状') || allText.includes('不舒服')) topics.push('症状描述');

    return topics.slice(0, 3); // 返回最多3个主题
  }

  // 评估情感
  private assessSentiment(messages: any[]): string {
    if (messages.length === 0) return 'neutral';

    const positiveWords = ['好', '谢谢', '满意', '感谢', '帮助'];
    const negativeWords = ['问题', '不好', '不满', '困难', '担心'];

    let positiveCount = 0;
    let negativeCount = 0;

    messages.forEach(msg => {
      const text = msg.content_text.toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) positiveCount++;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) negativeCount++;
      });
    });

    if (positiveCount > negativeCount * 2) return 'positive';
    if (negativeCount > positiveCount * 2) return 'negative';
    return 'neutral';
  }

  // 获取消息详情
  private async getMessageDetails(messageId: string) {
    const result = await db.query(
      `select id, message_id, conversation_id, sender_id, sender_role,
              content_text, sent_at, linked_customer_id, chat_type,
              (metadata_json->>'chatid')::text as chatid,
              (metadata_json->>'externalUserId')::text as external_user_id
         from wecom_messages
        where message_id = $1
        limit 1`,
      [messageId]
    );

    return result.rows[0];
  }

  // 获取对话上下文
  private async getConversationContext(conversationId: string, beforeTime: string, limit: number) {
    const result = await db.query(
      `select sender_role, content_text, sent_at
         from wecom_messages
        where conversation_id = $1
          and sent_at <= $2
          and content_text is not null
          and content_text != ''
        order by sent_at desc
        limit $3`,
      [conversationId, beforeTime, limit]
    );

    return result.rows.reverse(); // 返回时间顺序
  }

  // 获取客户消息
  private async getCustomerMessages(conversationId: string, limit: number) {
    const result = await db.query(
      `select id, message_id, sender_id, content_text, sent_at
         from wecom_messages
        where conversation_id = $1
          and sender_role = 'customer'
          and content_text is not null
          and content_text != ''
        order by sent_at asc
        limit $2`,
      [conversationId, limit]
    );

    return result.rows;
  }

  // 根据消息ID分析消息并更新档案
  async analyzeMessageAndUpdateArchives(messageId: string) {
    try {
      // 获取消息详情
      const message = await this.getMessageDetails(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // 获取对话上下文（最近的消息）
      const conversationContext = await this.getConversationContext(
        message.conversation_id,
        message.sent_at,
        10 // 获取最近10条消息作为上下文
      );

      // 准备AI分析输入
      const analysisInput: MessageAnalysisInput = {
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

      // 执行AI分析并更新档案
      const { analysis, archiveUpdated } = await processMessageAndUpdateArchive(analysisInput);

      // 如果AI分析建议更新档案，并且发送者是客户，则更新成员档案
      let memberArchiveUpdated = false;
      if (message.sender_role === 'customer' && analysis.archiveUpdates.memberArchiveUpdates) {
        memberArchiveUpdated = await this.updateMemberArchiveFromAnalysis(
          message.sender_id,
          message.conversation_id,
          analysis
        );
      }

      return {
        success: true,
        analysisId: analysis.messageId, // 注意：这里应该返回保存的分析ID，但processMessageAndUpdateArchive没有返回analysisId
        messageId: message.message_id,
        conversationId: message.conversation_id,
        archiveUpdated: archiveUpdated || memberArchiveUpdated,
        analysis: {
          understanding: analysis.understanding,
          extraction: analysis.extraction,
          confidence: analysis.confidence
        }
      };

    } catch (error) {
      console.error(`Error analyzing message ${messageId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        messageId
      };
    }
  }

  // 根据AI分析结果更新成员档案（从message-analysis.service.ts迁移）
  private async updateMemberArchiveFromAnalysis(
    userId: string,
    conversationId: string,
    analysis: any
  ): Promise<boolean> {
    try {
      const updates: Record<string, string> = {};

      // 从AI分析结果中提取档案更新信息
      const aiUpdates = analysis.archiveUpdates?.memberArchiveUpdates || {};

      // 如果有基础信息更新
      if (aiUpdates.basicInfo) {
        updates.basicInfo = aiUpdates.basicInfo;
      }

      // 如果有核心问题更新
      if (aiUpdates.coreProblem) {
        updates.coreProblem = aiUpdates.coreProblem;
      }

      // 从提取结果中获取其他信息
      const extraction = analysis.extraction;
      if (extraction.newRequirements?.length > 0) {
        updates.coreProblem = updates.coreProblem
          ? `${updates.coreProblem}; ${extraction.newRequirements.join('; ')}`
          : extraction.newRequirements.join('; ');
      }

      if (extraction.keyStateChanges?.length > 0) {
        updates.recentIssueSummary = extraction.keyStateChanges.join('; ');
      }

      if (extraction.followupItems?.length > 0) {
        updates.followupPlan = extraction.followupItems.join('\n');
      }

      // 如果有任何更新，则保存到档案
      if (Object.keys(updates).length > 0) {
        // 添加会话ID到来源会话列表
        updates.conversationId = conversationId;

        await upsertMemberArchiveService(userId, updates, 'ai_model');
        return true;
      }

      return false;

    } catch (error) {
      console.error(`Error updating member archive for user ${userId}:`, error);
      return false;
    }
  }

  // 根据企微用户ID获取患者ID
  private async getPatientIdByWecomUserId(wecomUserId: string, conversationId?: string): Promise<string | null> {
    try {
      const mappingResult = await lookupCustomerMapping(wecomUserId, conversationId);
      if (mappingResult?.status === 'matched') {
        return mappingResult.mapping.patientId;
      }
      return null;
    } catch (error) {
      console.error(`Error looking up patient mapping for wecom user ${wecomUserId}:`, error);
      return null;
    }
  }

  // 群管理机器人业务逻辑：处理群聊消息并更新成员档案
  async processGroupMessageForCustomerService(messageInput: MessageAnalysisInput): Promise<{
    analysis: MessageAnalysisResult;
    archiveUpdated: boolean;
    archiveType: 'member' | 'patient';
    targetId: string; // user_id 或 patient_id
  }> {
    const analysis = await this.analyzeMessage(messageInput);
    let archiveUpdated = false;
    let archiveType: 'member' | 'patient' = 'member';
    let targetId = messageInput.senderId;

    // 群管理机器人主要更新成员档案（针对群成员）
    if (messageInput.senderRole === 'customer' && analysis.archiveUpdates.memberArchiveUpdates) {
      const updates = analysis.archiveUpdates.memberArchiveUpdates;
      if (Object.keys(updates).length > 0) {
        try {
          // 构建档案更新payload
          const payload: Record<string, string> = {};

          // 映射已知字段
          if (updates.basicInfo) {
            payload.basicInfo = updates.basicInfo;
          }
          if (updates.coreProblem) {
            payload.coreProblem = updates.coreProblem;
          }
          // 可以添加其他字段映射
          if (updates.emotionIndicators) {
            payload.preferences = updates.emotionIndicators;
          }
          if (updates.lifestyleInfo) {
            payload.followupFocus = updates.lifestyleInfo;
          }

          // 更新成员档案
          await upsertMemberArchiveService(
            messageInput.senderId,
            {
              conversationId: messageInput.conversationId,
              ...payload
            },
            'ai-group-customer-service'
          );

          console.log(`[Group Customer Service] Updated member archive for ${messageInput.senderId}:`, payload);
          archiveUpdated = true;
          archiveType = 'member';
          targetId = messageInput.senderId;
        } catch (error) {
          console.error('[Group Customer Service] Failed to update member archive:', error);
        }
      }
    }

    // 保存分析结果
    try {
      await this.saveAnalysisResult(analysis);
    } catch (error) {
      console.error('[Group Customer Service] Failed to save analysis result:', error);
    }

    // 发送AI回复到群聊（群聊用chatId，不用senderId）
    if (analysis.replyText && messageInput.senderRole === 'customer') {
      const chatId = (messageInput as any)._chatId as string | undefined;
      if (chatId) {
        try {
          await sendWecomGroupMessageService({ chatId, content: analysis.replyText });
          console.log(`[Group Customer Service] Sent reply to group ${chatId}`);
        } catch (error) {
          console.error('[Group Customer Service] Failed to send group reply:', error);
        }
      }
    }

    return { analysis, archiveUpdated, archiveType, targetId };
  }

  // 个人医生助手业务逻辑：处理私聊消息并更新患者档案
  async processPrivateMessageForMedicalAssistant(messageInput: MessageAnalysisInput): Promise<{
    analysis: MessageAnalysisResult;
    archiveUpdated: boolean;
    archiveType: 'member' | 'patient';
    targetId: string; // user_id 或 patient_id
    patientId: string | null;
  }> {
    // 私聊前先加载档案上下文注入AI
    const archiveContext = await getArchiveForAIContext(messageInput.senderId);
    const enrichedInput = archiveContext
      ? { ...messageInput, _archiveContext: archiveContext }
      : messageInput;

    const analysis = await this.analyzeMessage(enrichedInput);
    let archiveUpdated = false;
    let archiveType: 'member' | 'patient' = 'member';
    let targetId = messageInput.senderId;
    let patientId: string | null = null;

    // 个人医生助手主要更新患者档案
    if (messageInput.senderRole === 'customer') {
      // 尝试获取患者ID
      patientId = await this.getPatientIdByWecomUserId(messageInput.senderId, messageInput.conversationId);

      if (patientId) {
        // 有患者ID，更新患者档案
        const updates = analysis.archiveUpdates.memberArchiveUpdates || {};
        if (Object.keys(updates).length > 0) {
          try {
            // 构建患者档案更新payload
            const payload: Record<string, string> = {};

            // 映射已知字段到患者档案
            if (updates.basicInfo) {
              payload.basicInfo = updates.basicInfo;
            }
            if (updates.coreProblem) {
              payload.coreProblem = updates.coreProblem;
            }
            if (updates.emotionIndicators) {
              payload.preferences = updates.emotionIndicators;
            }
            if (updates.lifestyleInfo) {
              payload.followupFocus = updates.lifestyleInfo;
            }

            // 从extraction中提取医疗相关信息
            const extraction = analysis.extraction;
            const medicalInfo = this.extractMedicalInformation(messageInput.content);

            // 将医疗信息合并到basicInfo
            if (Object.keys(medicalInfo).length > 0) {
              const existingBasicInfo = payload.basicInfo ? JSON.parse(payload.basicInfo) : {};
              payload.basicInfo = JSON.stringify({ ...existingBasicInfo, ...medicalInfo });
            }

            // 更新患者档案
            await upsertPatientProfileService(
              patientId,
              {
                ...payload,
                sourceConversations: messageInput.conversationId
              },
              'ai-medical-assistant'
            );

            console.log(`[Medical Assistant] Updated patient profile for ${patientId} (wecom user: ${messageInput.senderId}):`, payload);
            archiveUpdated = true;
            archiveType = 'patient';
            targetId = patientId;
          } catch (error) {
            console.error('[Medical Assistant] Failed to update patient profile:', error);
          }
        }
      } else {
        // 没有患者ID，回退到更新成员档案
        console.log(`[Medical Assistant] No patient mapping found for wecom user ${messageInput.senderId}, falling back to member archive`);

        const updates = analysis.archiveUpdates.memberArchiveUpdates || {};
        if (Object.keys(updates).length > 0) {
          try {
            const payload: Record<string, string> = {};
            if (updates.basicInfo) payload.basicInfo = updates.basicInfo;
            if (updates.coreProblem) payload.coreProblem = updates.coreProblem;

            await upsertMemberArchiveService(
              messageInput.senderId,
              {
                conversationId: messageInput.conversationId,
                ...payload
              },
              'ai-medical-assistant-fallback'
            );

            archiveUpdated = true;
            archiveType = 'member';
            targetId = messageInput.senderId;
          } catch (error) {
            console.error('[Medical Assistant] Failed to update member archive as fallback:', error);
          }
        }
      }
    }

    // 保存分析结果
    try {
      await this.saveAnalysisResult(analysis);
    } catch (error) {
      console.error('[Medical Assistant] Failed to save analysis result:', error);
    }

    // 发送AI回复（外部联系人用externalUserId，内部员工用senderId）
    if (analysis.replyText && messageInput.senderRole === 'customer') {
      try {
        const externalUserId = (messageInput as any)._externalUserId as string | undefined;
        const receiverType = externalUserId ? 'external_user' : 'wecom_user';
        const receiverId = externalUserId || messageInput.senderId;
        await sendWecomTextMessageService({
          receiverType,
          receiverId,
          message: analysis.replyText
        });
        console.log(`[Medical Assistant] Sent reply to ${receiverType} ${receiverId}`);
      } catch (error) {
        console.error('[Medical Assistant] Failed to send private reply:', error);
      }
    }

    return { analysis, archiveUpdated, archiveType, targetId, patientId };
  }

  // 根据消息ID自动路由到适当的业务处理（群聊或私聊）
  async processMessageWithBusinessRouting(messageId: string): Promise<{
    success: boolean;
    messageId: string;
    conversationId: string;
    chatType: string;
    businessHandler: 'group-customer-service' | 'medical-assistant' | 'unknown';
    archiveUpdated: boolean;
    archiveType: 'member' | 'patient' | 'none';
    targetId?: string;
    error?: string;
  }> {
    try {
      // 获取消息详情
      const message = await this.getMessageDetails(messageId);
      if (!message) {
        throw new Error(`Message ${messageId} not found`);
      }

      // 获取对话上下文
      const conversationContext = await this.getConversationContext(
        message.conversation_id,
        message.sent_at,
        10
      );

      // 准备AI分析输入
      const analysisInput: MessageAnalysisInput = {
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
      let businessHandler: 'group-customer-service' | 'medical-assistant' | 'unknown' = 'unknown';
      let archiveUpdated = false;
      let archiveType: 'member' | 'patient' | 'none' = 'none';
      let targetId: string | undefined;

      // 根据聊天类型路由到不同的业务处理
      if (message.chat_type === 'group') {
        businessHandler = 'group-customer-service';
        // 群聊时把chatId附加到input，供发送回复使用
        const groupInput = { ...analysisInput, _chatId: message.chatid || message.conversation_id };
        const processingResult = await this.processGroupMessageForCustomerService(groupInput);
        result = processingResult.analysis;
        archiveUpdated = processingResult.archiveUpdated;
        archiveType = processingResult.archiveType;
        targetId = processingResult.targetId;
      } else if (message.chat_type === 'private') {
        businessHandler = 'medical-assistant';
        // 私聊时把externalUserId附加到input，外部联系人需要用此ID发消息
        const privateInput = message.external_user_id
          ? { ...analysisInput, _externalUserId: message.external_user_id }
          : analysisInput;
        const processingResult = await this.processPrivateMessageForMedicalAssistant(privateInput);
        result = processingResult.analysis;
        archiveUpdated = processingResult.archiveUpdated;
        archiveType = processingResult.archiveType;
        targetId = processingResult.targetId;
      } else {
        // 未知聊天类型，使用默认处理
        const defaultResult = await processMessageAndUpdateArchive(analysisInput);
        result = defaultResult.analysis;
        archiveUpdated = defaultResult.archiveUpdated;
        archiveType = archiveUpdated ? 'member' : 'none';
        targetId = archiveUpdated ? message.sender_id : undefined;
      }

      return {
        success: true,
        messageId: message.message_id,
        conversationId: message.conversation_id,
        chatType: message.chat_type,
        businessHandler,
        archiveUpdated,
        archiveType,
        targetId
      };

    } catch (error) {
      console.error(`Error processing message ${messageId} with business routing:`, error);
      return {
        success: false,
        messageId,
        conversationId: '',
        chatType: '',
        businessHandler: 'unknown',
        archiveUpdated: false,
        archiveType: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// 导出类和单例实例
export { AIModelService };
export const aiModelService = new AIModelService();

// 工具函数：处理消息并更新档案
export async function processMessageAndUpdateArchive(messageInput: MessageAnalysisInput): Promise<{
  analysis: MessageAnalysisResult;
  archiveUpdated: boolean;
}> {
  const analysis = await aiModelService.analyzeMessage(messageInput);

  let archiveUpdated = false;

  // 如果分析结果包含档案更新，并且发送者是客户，则更新档案
  if (messageInput.senderRole === 'customer' && analysis.archiveUpdates.memberArchiveUpdates) {
    const updates = analysis.archiveUpdates.memberArchiveUpdates;
    if (Object.keys(updates).length > 0) {
      try {
        // 构建档案更新payload
        const payload: Record<string, string> = {};

        // 映射已知字段
        if (updates.basicInfo) {
          payload.basicInfo = updates.basicInfo;
        }
        if (updates.coreProblem) {
          payload.coreProblem = updates.coreProblem;
        }
        // 可以添加其他字段映射，例如将情绪指标映射到preferences
        if (updates.emotionIndicators) {
          payload.preferences = updates.emotionIndicators;
        }
        if (updates.lifestyleInfo) {
          // 生活管理信息可以放到communicationSummary或followupFocus
          payload.followupFocus = updates.lifestyleInfo;
        }

        // 调用archive service更新成员档案
        await upsertMemberArchiveService(
          messageInput.senderId,
          {
            conversationId: messageInput.conversationId,
            ...payload
          },
          'ai-system'
        );

        console.log(`[AI Analysis] Updated member archive for ${messageInput.senderId}:`, payload);
        archiveUpdated = true;
      } catch (error) {
        console.error('[AI Analysis] Failed to update archive:', error);
        // 可以选择抛出错误或保持archiveUpdated为false
      }
    }
  }

  // 保存分析结果到数据库
  try {
    await aiModelService.saveAnalysisResult(analysis);
  } catch (error) {
    console.error('[AI Analysis] Failed to save analysis result:', error);
    // 不抛出错误，继续流程
  }

  return { analysis, archiveUpdated };
}