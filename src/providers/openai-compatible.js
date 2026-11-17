'use strict';

/* OpenAI-compatible provider. Transport is injected; no Obsidian import. */

const { validateProviderConfig, resolveEndpoint, normalizeProviderConfig, providerFingerprint } = require('../core/translation/request.js');
const { PROMPT_VERSION, buildTranslationMessages, cleanModelText } = require('../core/translation/prompt.js');
const { safeErrorText } = require('../core/translation/redact.js');

function error(code, message, retryable) {
  return { ok: false, error: { code: code, message: message, retryable: !!retryable } };
}

function createOpenAICompatibleProvider(options) {
  const opts = options || {};
  const rawConfig = opts.config || {};
  const config = normalizeProviderConfig(rawConfig);
  const request = opts.request;
  const promptVersion = opts.promptVersion || PROMPT_VERSION;
  const fingerprint = providerFingerprint(config, promptVersion);

  async function chat(messages, input) {
    const v = validateProviderConfig(config);
    if (!v.ok) return error(v.code, v.message, false);
    if (typeof request !== 'function') return error('MISSING_TRANSPORT', '没有可用的 HTTP 传输层', false);
    if (!Array.isArray(messages) || !messages.length) return error('EMPTY_MESSAGES', '消息为空', false);
    const headers = Object.assign({ 'Content-Type': 'application/json' }, config.headers || {});
    if (config.apiKey) headers.Authorization = 'Bearer ' + config.apiKey;
    const payload = {
      model: config.model,
      messages: messages,
      temperature: config.temperature,
      max_tokens: config.maxTokens,
      stream: false
    };
    let res;
    try {
      res = await request({
        url: resolveEndpoint(config.baseUrl, config.endpoint),
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload),
        signal: input && input.signal
      });
    } catch (e) {
      return error('REQUEST_FAILED', safeErrorText(e), true);
    }
    if (!res) return error('EMPTY_RESPONSE', '模型没有返回响应', true);
    if (res.status === 401 || res.status === 403) return error('AUTH_FAILED', '认证失败（HTTP ' + res.status + '）', false);
    if (res.status === 429) return error('RATE_LIMITED', '请求过于频繁（HTTP 429）', true);
    if (res.status < 200 || res.status >= 300) return error('HTTP_ERROR', '模型返回 HTTP ' + res.status, res.status >= 500);
    let data = res.json;
    if (!data && res.text) {
      try { data = JSON.parse(res.text); } catch (e) { return error('INVALID_JSON', '模型响应不是 JSON', true); }
    }
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const textOut = cleanModelText(typeof content === 'string' ? content : '');
    if (!textOut) return error('EMPTY_CONTENT', '模型返回空内容', true);
    return { ok: true, text: textOut };
  }

  async function translate(input) {
    const text = String((input && input.text) || '').trim();
    if (!text) return error('EMPTY_SOURCE', '源句为空', false);
    const target = String((input && input.targetLanguage) || 'zh-CN').trim() || 'zh-CN';
    return chat(buildTranslationMessages({ text: text, targetLanguage: target, context: input && input.context, grammarContext: input && input.grammarContext }), input);
  }

  return {
    id: 'openai-compatible',
    label: 'OpenAI-compatible',
    fingerprint: fingerprint,
    capabilities: {
      temperature: true,
      maxTokens: true,
      streaming: false,
      cancel: 'logical',
      structuredOutput: false
    },
    config: config,
    chat: chat,
    translate: translate
  };
}

module.exports = { createOpenAICompatibleProvider };
