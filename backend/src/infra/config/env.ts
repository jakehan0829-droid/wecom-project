import 'dotenv/config';

export const env = {
  appName: process.env.APP_NAME || 'chronic-disease-mvp',
  appHost: process.env.APP_HOST || '0.0.0.0',
  appPort: Number(process.env.APP_PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'chronic_disease',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379)
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'replace_me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  wecom: {
    corpId: process.env.WECOM_CORP_ID || '',
    agentId: process.env.WECOM_AGENT_ID || '',
    secret: process.env.WECOM_SECRET || '',
    token: process.env.WECOM_TOKEN || '',
    aesKey: process.env.WECOM_AES_KEY || ''
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'mock',
    model: process.env.AI_MODEL || 'gpt-4o',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://api.openai.com/v1'
  }
};
