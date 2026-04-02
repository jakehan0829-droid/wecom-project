import { env } from '../src/infra/config/env.js';
import { verifyWecomMsgSignature, buildWecomSignature } from '../src/modules/wecom-intelligence/service/wecom-crypto.service.js';
import { createHash } from 'node:crypto';

// 手动计算签名以调试
function manualSha1Hex(parts) {
  return createHash('sha1')
    .update(parts.sort().join(''), 'utf8')
    .digest('hex');
}

// 测试参数
const params = {
  msg_signature: '4465cf31010356bb1b7bcefd26f1a2c9fdaef27b',
  timestamp: '1775093213',
  nonce: 'gcpl2lf1',
  echostr: 'Pj6WTCqXUfnNpbUeVnwAgJoCVt618A6ZKU1ttQgI2wrqneVqqT8844al4Q6zFIlZANk7DoRQgNWDzTnmWPTBzQ=='
};

const token = env.wecom.token;

console.log('调试签名验证');
console.log('============\n');

console.log('token:', token);
console.log('timestamp:', params.timestamp);
console.log('nonce:', params.nonce);
console.log('echostr:', params.echostr);
console.log('期望的签名:', params.msg_signature);
console.log('');

// 使用库函数计算签名
const libSignature = buildWecomSignature(token, params.timestamp, params.nonce, params.echostr);
console.log('库函数计算的签名:', libSignature);
console.log('库函数签名匹配:', libSignature === params.msg_signature);
console.log('');

// 手动计算
const parts = [token, params.timestamp, params.nonce, params.echostr];
console.log('排序前的parts:', parts);
const sortedParts = parts.sort();
console.log('排序后的parts:', sortedParts);
const concatenated = sortedParts.join('');
console.log('拼接后的字符串:', concatenated);
console.log('');

const manualSignature = manualSha1Hex(parts);
console.log('手动计算的签名:', manualSignature);
console.log('手动签名匹配:', manualSignature === params.msg_signature);
console.log('');

// 使用verifyWecomMsgSignature验证
const isValid = verifyWecomMsgSignature({
  token,
  timestamp: params.timestamp,
  nonce: params.nonce,
  encrypted: params.echostr,
  signature: params.msg_signature
});

console.log('verifyWecomMsgSignature结果:', isValid);

// 检查编码问题：echostr是否包含URL编码问题？
console.log('\n检查URL编码:');
console.log('原始echostr:', params.echostr);
// 模拟URL编码解码
const urlEncoded = encodeURIComponent(params.echostr);
console.log('URL编码后:', urlEncoded);
const urlDecoded = decodeURIComponent(urlEncoded);
console.log('URL解码后:', urlDecoded);
console.log('解码后是否相等:', urlDecoded === params.echostr);

// 检查base64填充
console.log('\n检查base64填充:');
const base64Str = params.echostr;
console.log('base64长度:', base64Str.length);
console.log('是否以=结尾:', base64Str.endsWith('='));
console.log('base64字符集检查:', /^[A-Za-z0-9+/]+=*$/.test(base64Str));