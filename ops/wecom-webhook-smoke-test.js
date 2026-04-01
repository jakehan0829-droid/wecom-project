import {
  buildWecomSignature,
  encryptWecomMessage
} from '../backend/dist/modules/wecom-intelligence/service/wecom-crypto.service.js';
import '../backend/dist/infra/config/env.js';

const baseUrl = process.env.WECOM_WEBHOOK_BASE_URL || 'http://127.0.0.1:3000/api/v1/wecom/webhook';
const token = process.env.WECOM_TOKEN;

if (!token) {
  console.error('missing WECOM_TOKEN in env');
  process.exit(1);
}

function nowSec() {
  return String(Math.floor(Date.now() / 1000));
}

async function main() {
  const timestamp = nowSec();
  const nonce = 'local-smoke-test';

  const plainXml = '<xml><ToUserName><![CDATA[wwfa91cc69d04c070a]]></ToUserName><FromUserName><![CDATA[external_user_demo]]></FromUserName><CreateTime>1710000000</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[smoke test from local script]]></Content><MsgId>smoke-local-001</MsgId><ChatId><![CDATA[external_user_demo]]></ChatId><ChatType><![CDATA[single]]></ChatType><SenderName><![CDATA[Smoke Test]]></SenderName><ExternalUserID><![CDATA[external_user_demo]]></ExternalUserID></xml>';

  const encrypted = encryptWecomMessage(plainXml);
  const signature = buildWecomSignature(token, timestamp, nonce, encrypted);
  const body = `<xml><Encrypt><![CDATA[${encrypted}]]></Encrypt></xml>`;

  const url = `${baseUrl}?msg_signature=${encodeURIComponent(signature)}&timestamp=${encodeURIComponent(timestamp)}&nonce=${encodeURIComponent(nonce)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'text/xml'
    },
    body
  });

  const text = await response.text();
  console.log(JSON.stringify({
    url,
    status: response.status,
    body: text
  }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
