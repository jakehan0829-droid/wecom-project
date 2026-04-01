import fs from 'fs';
import { encryptWecomMessage, buildWecomSignature } from '../dist/modules/wecom-intelligence/service/wecom-crypto.service.js';

const inputXmlPath = process.argv[2];
const outputEnvelopePath = process.argv[3];
const outputQueryPath = process.argv[4];

if (!inputXmlPath || !outputEnvelopePath || !outputQueryPath) {
  console.error('Usage: node scripts/build-wecom-envelope.mjs <input-xml> <output-envelope> <output-query-json>');
  process.exit(1);
}

const corpId = process.env.WECOM_CORP_ID || 'wwfa91cc69d04c070a';
const aesKey = process.env.WECOM_AES_KEY || 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG';
const token = process.env.WECOM_TOKEN || 'openclaw-demo-token';
const agentId = process.env.WECOM_AGENT_ID || '1000002';
const timestamp = process.env.WECOM_TEST_TIMESTAMP || '1774769000';
const nonce = process.env.WECOM_TEST_NONCE || 'openclaw-local-nonce';

const xml = fs.readFileSync(inputXmlPath, 'utf8');
const encrypt = encryptWecomMessage(xml, { corpId, aesKey });
const msg_signature = buildWecomSignature(token, timestamp, nonce, encrypt);
const envelope = `<xml>\n<ToUserName><![CDATA[${corpId}]]></ToUserName>\n<Encrypt><![CDATA[${encrypt}]]></Encrypt>\n<AgentID><![CDATA[${agentId}]]></AgentID>\n</xml>`;

fs.writeFileSync(outputEnvelopePath, envelope);
fs.writeFileSync(outputQueryPath, JSON.stringify({ msg_signature, timestamp, nonce }, null, 2));
