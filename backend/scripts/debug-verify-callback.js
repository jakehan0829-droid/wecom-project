import { env } from '../src/infra/config/env.js';
import { verifyWecomCallbackSignature } from '../src/modules/wecom-intelligence/service/wecom-crypto.service.js';
import { encryptWecomMessage, buildWecomSignature } from '../src/modules/wecom-intelligence/service/wecom-crypto.service.js';

async function test() {
  console.log('直接测试verifyWecomCallbackSignature');
  console.log('环境变量:');
  console.log('token:', env.wecom.token);
  console.log('aesKey:', env.wecom.aesKey ? '已设置' : '空');
  console.log('corpId:', env.wecom.corpId);
  console.log('');

  // 生成测试参数
  const token = env.wecom.token;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = Math.random().toString(36).substring(2, 10);
  const plainEchoStr = 'test_echo_' + Date.now();
  const echostr = encryptWecomMessage(plainEchoStr);
  const msgSignature = buildWecomSignature(token, timestamp, nonce, echostr);

  console.log('测试参数:');
  console.log('timestamp:', timestamp);
  console.log('nonce:', nonce);
  console.log('plainEchoStr:', plainEchoStr);
  console.log('echostr:', echostr);
  console.log('msgSignature:', msgSignature);
  console.log('');

  try {
    console.log('调用verifyWecomCallbackSignature...');
    const result = verifyWecomCallbackSignature({
      msg_signature: msgSignature,
      timestamp,
      nonce,
      echostr
    });

    console.log('✅ 验证成功!');
    console.log('结果:', result);
    console.log('echoStr:', result.echoStr);
    console.log('匹配原始明文:', result.echoStr === plainEchoStr);
  } catch (error) {
    console.log('❌ 验证失败!');
    console.log('错误:', error.message);
    console.log('错误代码:', error.code);
    console.log('堆栈:', error.stack);
  }
}

test().catch(console.error);