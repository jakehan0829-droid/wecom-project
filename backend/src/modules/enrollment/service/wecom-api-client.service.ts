import { env } from '../../../infra/config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';
import { ERROR_CODES } from '../../../shared/constants/error-codes.js';

type WecomAccessTokenCache = {
  token: string;
  expireAt: number;
};

type WecomApiResult<T> = {
  ok: boolean;
  data?: T;
  errorCode?: number;
  errorMessage?: string;
  requestBody?: Record<string, unknown>;
};

type WecomSendMessageInput = {
  toUser?: string;
  toExternalUser?: string;
  content: string;
};

let accessTokenCache: WecomAccessTokenCache | null = null;

function ensureWecomCoreConfig() {
  if (!env.wecom.corpId || !env.wecom.agentId || !env.wecom.secret) {
    throw new AppError(400, ERROR_CODES.BAD_REQUEST, 'wecom core config missing');
  }
}

async function parseWecomJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, `invalid wecom json response: ${text}`);
  }
}

export async function getWecomAccessTokenService(forceRefresh = false): Promise<string> {
  ensureWecomCoreConfig();

  const now = Date.now();
  if (!forceRefresh && accessTokenCache && accessTokenCache.expireAt > now + 60_000) {
    return accessTokenCache.token;
  }

  const url = new URL('https://qyapi.weixin.qq.com/cgi-bin/gettoken');
  url.searchParams.set('corpid', env.wecom.corpId);
  url.searchParams.set('corpsecret', env.wecom.secret);

  const response = await fetch(url, { method: 'GET' });
  const json = await parseWecomJson<{ errcode: number; errmsg: string; access_token?: string; expires_in?: number }>(response);

  if (!response.ok || json.errcode !== 0 || !json.access_token) {
    throw new AppError(500, ERROR_CODES.INTERNAL_ERROR, `wecom gettoken failed: ${json.errcode} ${json.errmsg}`);
  }

  accessTokenCache = {
    token: json.access_token,
    expireAt: now + Math.max((json.expires_in || 7200) - 120, 60) * 1000
  };

  return accessTokenCache.token;
}

async function callWecomSendMessageApi(accessToken: string, body: Record<string, unknown>) {
  const url = new URL('https://qyapi.weixin.qq.com/cgi-bin/message/send');
  url.searchParams.set('access_token', accessToken);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const json = await parseWecomJson<{ errcode: number; errmsg: string; invaliduser?: string; invalidexternaluser?: string; msgid?: string }>(response);
  return { response, json };
}

export async function sendWecomAppMessageService(input: WecomSendMessageInput): Promise<WecomApiResult<{ msgId?: string }>> {
  ensureWecomCoreConfig();

  const body: Record<string, unknown> = {
    msgtype: 'text',
    agentid: Number(env.wecom.agentId),
    text: {
      content: input.content
    },
    safe: 0,
    enable_id_trans: 0,
    enable_duplicate_check: 0
  };

  if (input.toUser) {
    body.touser = input.toUser;
  }

  if (input.toExternalUser) {
    body.external_userid = input.toExternalUser;
  }

  let accessToken = await getWecomAccessTokenService(false);
  let { response, json } = await callWecomSendMessageApi(accessToken, body);

  if (json.errcode === 42001 || json.errcode === 40014) {
    accessToken = await getWecomAccessTokenService(true);
    ({ response, json } = await callWecomSendMessageApi(accessToken, body));
  }

  if (!response.ok || json.errcode !== 0) {
    return {
      ok: false,
      errorCode: json.errcode,
      errorMessage: json.errmsg,
      requestBody: body
    };
  }

  return {
    ok: true,
    data: {
      msgId: json.msgid
    },
    requestBody: body
  };
}
