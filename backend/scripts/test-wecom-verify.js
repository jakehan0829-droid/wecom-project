import { createHash } from 'node:crypto';
import { env } from '../src/infra/config/env.js';

// 企业微信签名算法
function sha1Hex(parts) {
  return createHash('sha1')
    .update(parts.sort().join(''), 'utf8')
    .digest('hex');
}

// 生成测试签名
function generateWecomSignature(token, timestamp, nonce, encrypted) {
  return sha1Hex([token, timestamp, nonce, encrypted]);
}

// 从环境变量获取配置
const config = {
  token: env.wecom.token,
  aesKey: env.wecom.aesKey,
  corpId: env.wecom.corpId
};

console.log('当前配置:');
console.log('token:', config.token);
console.log('aesKey:', config.aesKey ? `${config.aesKey.substring(0, 10)}...` : '空');
console.log('corpId:', config.corpId);

// 测试参数
const timestamp = '1712000000';
const nonce = '123456';
const echostr = 'test_echostr_plain';

// 生成签名
const signature = generateWecomSignature(config.token, timestamp, nonce, echostr);

console.log('\n测试签名生成:');
console.log('timestamp:', timestamp);
console.log('nonce:', nonce);
console.log('echostr:', echostr);
console.log('生成的签名:', signature);

// 验证签名
const verifyParts = [config.token, timestamp, nonce, echostr];
const verifySignature = sha1Hex(verifyParts);
console.log('验证签名:', verifySignature);
console.log('签名匹配:', signature === verifySignature);

// 测试加密解密功能
try {
  const { encryptWecomMessage, decryptWecomMessage } = await import('../src/modules/wecom-intelligence/service/wecom-crypto.service.js');

  console.log('\n测试加密解密:');
  const plainText = 'test_message_' + Date.now();
  console.log('原始明文:', plainText);

  const encrypted = encryptWecomMessage(plainText);
  console.log('加密结果:', encrypted);

  const decrypted = decryptWecomMessage(encrypted);
  console.log('解密结果:', decrypted);
  console.log('解密成功:', decrypted === plainText);

  // 测试用加密后的echostr生成签名
  const encryptedEchostr = encrypted;
  const encryptedSignature = generateWecomSignature(config.token, timestamp, nonce, encryptedEchostr);
  console.log('\n使用加密echostr的签名:', encryptedSignature);

} catch (error) {
  console.error('加密解密测试失败:', error.message);
}