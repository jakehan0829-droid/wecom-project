import { env } from '../config/env.js';

export const wecomClient = {
  corpId: env.wecom.corpId,
  agentId: env.wecom.agentId,
  async bindExternalUser(externalUserId: string) {
    return {
      ok: true,
      externalUserId
    };
  }
};
