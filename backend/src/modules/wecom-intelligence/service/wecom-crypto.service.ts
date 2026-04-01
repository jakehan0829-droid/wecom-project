import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../../../infra/config/env.js';
import { AppError } from '../../../shared/errors/app-error.js';

type VerifySignatureInput = {
  token: string;
  timestamp: string;
  nonce: string;
  encrypted: string;
  signature?: string;
};

type WecomCryptoConfig = {
  token?: string;
  aesKey?: string;
  corpId?: string;
};

type DecodedXmlMap = Record<string, string>;

function ensureWecomSecurityConfig(config?: WecomCryptoConfig) {
  const token = config?.token ?? env.wecom.token;
  const aesKey = config?.aesKey ?? env.wecom.aesKey;
  const corpId = config?.corpId ?? env.wecom.corpId;
  if (!token || !aesKey || !corpId) {
    throw new AppError(400, 'WECOM_SECURITY_CONFIG_MISSING', '企微安全配置缺失，需要 WECOM_TOKEN / WECOM_AES_KEY / WECOM_CORP_ID');
  }
}

export function isValidWecomEncodingAesKey(encodingAesKey: string) {
  const key = encodingAesKey.trim();
  if (!key || key === 'replace_me') {
    return false;
  }
  try {
    const padded = key.endsWith('=') ? key : `${key}=`;
    return Buffer.from(padded, 'base64').length === 32;
  } catch {
    return false;
  }
}

function normalizeEncodingAesKey(encodingAesKey: string) {
  const key = encodingAesKey.trim();
  const padded = key.endsWith('=') ? key : `${key}=`;
  const buffer = Buffer.from(padded, 'base64');
  if (buffer.length !== 32) {
    throw new AppError(400, 'INVALID_WECOM_AES_KEY', '企微 AES Key 非法');
  }
  return buffer;
}

function sha1Hex(parts: string[]) {
  return createHash('sha1')
    .update(parts.sort().join(''), 'utf8')
    .digest('hex');
}

export function verifyWecomMsgSignature(input: VerifySignatureInput) {
  if (!input.signature) {
    return false;
  }
  const expected = sha1Hex([input.token, input.timestamp, input.nonce, input.encrypted]);
  return expected === input.signature;
}

function pkcs7Unpad(buffer: Buffer) {
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 32) {
    throw new AppError(400, 'INVALID_WECOM_PADDING', '企微消息解密 padding 非法');
  }
  return buffer.subarray(0, buffer.length - pad);
}

function pkcs7Pad(buffer: Buffer) {
  const blockSize = 32;
  const remainder = buffer.length % blockSize;
  const padAmount = remainder === 0 ? blockSize : blockSize - remainder;
  const pad = Buffer.alloc(padAmount, padAmount);
  return Buffer.concat([buffer, pad]);
}

function readUInt32BE(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

function random16Bytes() {
  return randomBytes(16);
}

export function decryptWecomMessage(encryptedBase64: string, config?: WecomCryptoConfig) {
  ensureWecomSecurityConfig(config);
  const expectedCorpId = config?.corpId ?? env.wecom.corpId;
  const aesKey = config?.aesKey ?? env.wecom.aesKey;
  const key = normalizeEncodingAesKey(aesKey);
  const iv = key.subarray(0, 16);

  const decipher = createDecipheriv('aes-256-cbc', key, iv);
  decipher.setAutoPadding(false);

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final()
  ]);

  const plain = pkcs7Unpad(decrypted);
  const msgLength = readUInt32BE(plain, 16);
  const msgStart = 20;
  const msgEnd = msgStart + msgLength;
  const corpId = plain.subarray(msgEnd).toString('utf8');

  if (corpId !== expectedCorpId) {
    throw new AppError(400, 'INVALID_WECOM_CORP_ID', '企微消息 corpId 校验失败');
  }

  return plain.subarray(msgStart, msgEnd).toString('utf8');
}

export function encryptWecomMessage(plainText: string, config?: WecomCryptoConfig) {
  ensureWecomSecurityConfig(config);
  const aesKey = config?.aesKey ?? env.wecom.aesKey;
  const corpId = config?.corpId ?? env.wecom.corpId;
  const key = normalizeEncodingAesKey(aesKey);
  const iv = key.subarray(0, 16);
  const plainBuffer = Buffer.from(plainText, 'utf8');
  const corpIdBuffer = Buffer.from(corpId, 'utf8');
  const msgLengthBuffer = Buffer.alloc(4);
  msgLengthBuffer.writeUInt32BE(plainBuffer.length, 0);

  const payload = Buffer.concat([
    random16Bytes(),
    msgLengthBuffer,
    plainBuffer,
    corpIdBuffer
  ]);

  const cipher = createCipheriv('aes-256-cbc', key, iv);
  cipher.setAutoPadding(false);

  const encrypted = Buffer.concat([
    cipher.update(pkcs7Pad(payload)),
    cipher.final()
  ]);

  return encrypted.toString('base64');
}

export function extractXmlValue(xml: string, tag: string) {
  const cdataPattern = new RegExp(`<${tag}><!\\[CDATA\\[(.*?)\\]\\]><\\/${tag}>`, 's');
  const directPattern = new RegExp(`<${tag}>(.*?)<\\/${tag}>`, 's');
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) {
    return cdataMatch[1].trim();
  }
  const directMatch = xml.match(directPattern);
  return directMatch ? directMatch[1].trim() : '';
}

export function parseSimpleXml(xml: string, tags: string[]) {
  const result: DecodedXmlMap = {};
  for (const tag of tags) {
    result[tag] = extractXmlValue(xml, tag);
  }
  return result;
}

export function buildEncryptedXml(encrypt: string, signature: string, timestamp: string, nonce: string) {
  return `<xml>\n<Encrypt><![CDATA[${encrypt}]]></Encrypt>\n<MsgSignature><![CDATA[${signature}]]></MsgSignature>\n<TimeStamp>${timestamp}</TimeStamp>\n<Nonce><![CDATA[${nonce}]]></Nonce>\n</xml>`;
}

export function buildWecomSignature(token: string, timestamp: string, nonce: string, encrypted: string) {
  return sha1Hex([token, timestamp, nonce, encrypted]);
}

export function verifyWecomCallbackSignature(query: { msg_signature?: string; timestamp?: string; nonce?: string; echostr?: string }) {
  ensureWecomSecurityConfig();
  if (!query.msg_signature || !query.timestamp || !query.nonce || !query.echostr) {
    throw new AppError(400, 'INVALID_WECOM_VERIFY_QUERY', '企微 URL 校验参数不完整');
  }

  const ok = verifyWecomMsgSignature({
    token: env.wecom.token,
    timestamp: query.timestamp,
    nonce: query.nonce,
    encrypted: query.echostr,
    signature: query.msg_signature
  });

  if (!ok) {
    throw new AppError(400, 'INVALID_WECOM_SIGNATURE', '企微 URL 校验签名失败');
  }

  const echoStr = decryptWecomMessage(query.echostr);
  return {
    verified: true,
    mode: 'real_signature_validation',
    echoStr
  };
}
