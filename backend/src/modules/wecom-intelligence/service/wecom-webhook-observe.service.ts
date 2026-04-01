type WebhookObserveStage =
  | 'verify_request'
  | 'verify_success'
  | 'verify_fail'
  | 'receive_request'
  | 'receive_normalized'
  | 'receive_success'
  | 'receive_fail';

type ObservePayload = Record<string, unknown>;

function redact(value: string | undefined) {
  if (!value) return undefined;
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

export function logWecomWebhookObserve(stage: WebhookObserveStage, payload: ObservePayload) {
  const event = {
    ts: new Date().toISOString(),
    scope: 'wecom_webhook',
    stage,
    ...payload
  };

  console.log('[wecom-webhook]', JSON.stringify(event));
}

export function buildWecomWebhookObserveContext(input: {
  query?: Record<string, unknown>;
  normalized?: Record<string, unknown>;
  requestBodyType?: string;
}) {
  const query = input.query || {};
  const normalized = input.normalized || {};

  return {
    msgSignatureMasked: typeof query.msg_signature === 'string' ? redact(query.msg_signature) : undefined,
    timestamp: typeof query.timestamp === 'string' ? query.timestamp : undefined,
    nonceMasked: typeof query.nonce === 'string' ? redact(query.nonce) : undefined,
    echostrPresent: typeof query.echostr === 'string' ? true : undefined,
    requestBodyType: input.requestBodyType,
    msgid: typeof normalized.msgid === 'string' ? normalized.msgid : undefined,
    chatid: typeof normalized.chatid === 'string' ? normalized.chatid : undefined,
    sender: typeof normalized.sender === 'string' ? normalized.sender : undefined,
    externalUserId: typeof normalized.externalUserId === 'string' ? normalized.externalUserId : undefined,
    msgtype: typeof normalized.msgtype === 'string' ? normalized.msgtype : undefined,
    event: typeof normalized.event === 'string' ? normalized.event : undefined,
    changeType: typeof normalized.changeType === 'string' ? normalized.changeType : undefined,
    lifecycleStatus: typeof normalized.lifecycleStatus === 'string' ? normalized.lifecycleStatus : undefined,
    rawXml: typeof normalized.rawXml === 'string' ? true : false
  };
}
