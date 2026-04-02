import { createHash } from 'node:crypto';
import { env } from '../src/infra/config/env.js';
import { encryptWecomMessage, buildWecomSignature } from '../src/modules/wecom-intelligence/service/wecom-crypto.service.js';

// 生成测试参数
function generateTestParams() {
  const token = env.wecom.token;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 10);

  // 企业微信期望的echostr是一个随机明文，需要加密
  const plainEchoStr = 'test_echo_' + Date.now();
  const echostr = encryptWecomMessage(plainEchoStr);

  // 生成签名 (msg_signature)
  const msgSignature = buildWecomSignature(token, timestamp, nonce, echostr);

  return {
    msg_signature: msgSignature,
    timestamp,
    nonce,
    echostr,
    plainEchoStr
  };
}

async function testVerifyEndpoint(params) {
  const { msg_signature, timestamp, nonce, echostr } = params;

  const url = new URL('http://localhost:3000/api/v1/wecom/webhook');
  url.searchParams.append('msg_signature', msg_signature);
  url.searchParams.append('timestamp', timestamp);
  url.searchParams.append('nonce', nonce);
  url.searchParams.append('echostr', echostr);

  console.log('测试URL:', url.toString());

  try {
    const response = await fetch(url, { method: 'GET' });
    const text = await response.text();

    console.log('响应状态:', response.status);
    console.log('响应内容:', text);

    return { success: response.ok, status: response.status, body: text };
  } catch (error) {
    console.error('请求失败:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('企业微信Webhook验证端点测试');
  console.log('============================\n');

  console.log('环境配置:');
  console.log('token:', env.wecom.token);
  console.log('aesKey:', env.wecom.aesKey ? `${env.wecom.aesKey.substring(0, 10)}...` : '空');
  console.log('corpId:', env.wecom.corpId);
  console.log('');

  // 生成测试参数
  const params = generateTestParams();
  console.log('生成的测试参数:');
  console.log('msg_signature:', params.msg_signature);
  console.log('timestamp:', params.timestamp);
  console.log('nonce:', params.nonce);
  console.log('echostr:', params.echostr);
  console.log('plainEchoStr:', params.plainEchoStr);
  console.log('');

  // 测试端点
  console.log('发送验证请求...');
  const result = await testVerifyEndpoint(params);

  if (result.success) {
    console.log('\n✅ 验证成功!');
    console.log('返回的明文应该与原始明文一致:', params.plainEchoStr);
    console.log('实际返回:', result.body);
    console.log('匹配:', result.body.trim() === params.plainEchoStr.trim());
  } else {
    console.log('\n❌ 验证失败!');
    console.log('状态码:', result.status);
    console.log('错误:', result.error || result.body);
  }
}

main().catch(console.error);