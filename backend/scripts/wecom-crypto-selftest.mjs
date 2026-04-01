import { decryptWecomMessage, encryptWecomMessage } from '../dist/modules/wecom-intelligence/service/wecom-crypto.service.js';

const config = {
  corpId: 'wwfa91cc69d04c070a',
  aesKey: 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'
};

const samples = [
  'openclaw-wecom-url-check-ok',
  '<xml><Content><![CDATA[企微联调测试消息]]></Content></xml>',
  'short',
  'x'.repeat(32),
  'x'.repeat(33),
  'x'.repeat(64)
];

for (const sample of samples) {
  const encrypted = encryptWecomMessage(sample, config);
  const decrypted = decryptWecomMessage(encrypted, config);
  if (decrypted !== sample) {
    console.error(JSON.stringify({ ok: false, sample, encrypted, decrypted }, null, 2));
    process.exit(1);
  }
}

console.log(JSON.stringify({ ok: true, count: samples.length }, null, 2));
