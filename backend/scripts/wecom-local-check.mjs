import { buildWecomSignature, encryptWecomMessage, isValidWecomEncodingAesKey } from '../dist/modules/wecom-intelligence/service/wecom-crypto.service.js';
import { env } from '../dist/infra/config/env.js';

function usage() {
  console.log(`Usage:
  node scripts/wecom-local-check.mjs verify-url
  node scripts/wecom-local-check.mjs encrypted-body
`);
}

function resolveLocalWecomConfig() {
  const demoMode = process.env.WECOM_LOCAL_DEMO_MODE === '1';
  const token = !env.wecom.token || env.wecom.token === 'replace_me'
    ? (demoMode ? 'openclaw-demo-token' : env.wecom.token)
    : env.wecom.token;
  const aesKey = isValidWecomEncodingAesKey(env.wecom.aesKey)
    ? env.wecom.aesKey
    : (demoMode ? 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG' : env.wecom.aesKey);
  const corpId = !env.wecom.corpId || env.wecom.corpId === 'replace_me'
    ? (demoMode ? 'wwopenclawdemo001' : env.wecom.corpId)
    : env.wecom.corpId;
  const agentId = !env.wecom.agentId || env.wecom.agentId === 'replace_me'
    ? (demoMode ? '1000002' : env.wecom.agentId)
    : env.wecom.agentId;

  const errors = [];
  if (!corpId || corpId === 'replace_me') {
    errors.push('WECOM_CORP_ID 未配置');
  }
  if (!agentId || agentId === 'replace_me') {
    errors.push('WECOM_AGENT_ID 未配置');
  }
  if (!token || token === 'replace_me') {
    errors.push('WECOM_TOKEN 未配置');
  }
  if (!isValidWecomEncodingAesKey(aesKey)) {
    errors.push('WECOM_AES_KEY 未配置为合法企微 EncodingAESKey');
  }

  if (errors.length) {
    console.error('[wecom-local-check] 配置未就绪：');
    for (const item of errors) {
      console.error(`- ${item}`);
    }
    console.error('可选：设置 WECOM_LOCAL_DEMO_MODE=1 使用开发态样本参数。');
    process.exit(2);
  }

  return { token, aesKey, corpId, agentId, demoMode };
}

function buildVerifyUrlSample(config) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = 'openclaw-local-nonce';
  const echostrPlain = 'openclaw-wecom-url-check-ok';
  const echostr = encryptWecomMessage(echostrPlain, { aesKey: config.aesKey, corpId: config.corpId });
  const msg_signature = buildWecomSignature(config.token, timestamp, nonce, echostr);

  console.log(JSON.stringify({
    mode: config.demoMode ? 'demo' : 'real-config',
    query: { msg_signature, timestamp, nonce, echostr },
    expectedPlainTextResponse: echostrPlain
  }, null, 2));
}

function buildEncryptedBodySample(config) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = 'openclaw-local-nonce';
  const xml = `<xml>
<ToUserName><![CDATA[${config.corpId}]]></ToUserName>
<FromUserName><![CDATA[wm_test_external_user]]></FromUserName>
<CreateTime>${timestamp}</CreateTime>
<MsgType><![CDATA[text]]></MsgType>
<Content><![CDATA[企微联调测试消息]]></Content>
<MsgId>mid_openclaw_local_001</MsgId>
<ChatId><![CDATA[chat_openclaw_local_001]]></ChatId>
<ChatType><![CDATA[group]]></ChatType>
<ChatName><![CDATA[OpenClaw联调群]]></ChatName>
<ExternalUserID><![CDATA[wo_external_001]]></ExternalUserID>
<SenderName><![CDATA[联调客户]]></SenderName>
</xml>`;

  const encrypt = encryptWecomMessage(xml, { aesKey: config.aesKey, corpId: config.corpId });
  const msg_signature = buildWecomSignature(config.token, timestamp, nonce, encrypt);
  const body = `<xml>
<ToUserName><![CDATA[${config.corpId}]]></ToUserName>
<Encrypt><![CDATA[${encrypt}]]></Encrypt>
<AgentID><![CDATA[${config.agentId}]]></AgentID>
</xml>`;

  console.log(JSON.stringify({
    mode: config.demoMode ? 'demo' : 'real-config',
    query: { msg_signature, timestamp, nonce },
    body,
    expectedPlainTextResponse: 'success'
  }, null, 2));
}

const command = process.argv[2];
if (!command) {
  usage();
  process.exit(1);
}

const config = resolveLocalWecomConfig();

if (command === 'verify-url') {
  buildVerifyUrlSample(config);
} else if (command === 'encrypted-body') {
  buildEncryptedBodySample(config);
} else {
  usage();
  process.exit(1);
}
