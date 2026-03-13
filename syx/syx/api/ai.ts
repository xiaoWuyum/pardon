import { GoogleGenerativeAI } from '@google/generative-ai';

type Json = Record<string, unknown>;

function readBody(req: any): Promise<Json> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer | string) => {
      data += String(chunk);
    });
    req.on('end', () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function getEnv(name: string): string {
  const val = process.env[name];
  return typeof val === 'string' ? val : '';
}

const ALLOWED_MODELS = new Set([
  'deepseek-chat',
  'deepseek-reasoner',
  'gemini-2.0-flash-lite',
]);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ error: { message: 'Method Not Allowed' } }));
    return;
  }

  try {
    const body = await readBody(req);
    const prompt = typeof body.prompt === 'string' ? body.prompt : '';
    const model = typeof body.model === 'string' ? body.model : 'deepseek-chat';
    const temperature =
      typeof body.temperature === 'number' ? body.temperature : 0.7;
    const maxTokens = typeof body.maxTokens === 'number' ? body.maxTokens : 1024;

    if (!prompt.trim()) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { message: 'prompt 不能为空' } }));
      return;
    }

    if (!ALLOWED_MODELS.has(model)) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { message: `不支持的模型：${model}` } }));
      return;
    }

    if (model.startsWith('gemini-')) {
      const apiKey = getEnv('GEMINI_API_KEY');
      if (!apiKey) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ error: { message: 'GEMINI_API_KEY 未配置' } }));
        return;
      }

      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const gemini = genAI.getGenerativeModel({ model });
        const result = await gemini.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ content: result.response.text() }));
        return;
      } catch (err: any) {
        const raw = err instanceof Error ? err.message : String(err || '');
        const lowered = raw.toLowerCase();
        const looksLikeNetwork =
          lowered.includes('fetch failed') ||
          lowered.includes('enotfound') ||
          lowered.includes('econnreset') ||
          lowered.includes('etimedout') ||
          lowered.includes('network');

        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(
          JSON.stringify({
            error: {
              message: looksLikeNetwork
                ? '无法连接 Gemini 接口（本地网络可能无法访问 Google 或需要代理/VPN）'
                : raw || 'Gemini 请求失败',
            },
          })
        );
        return;
      }
    }

    const apiKey = getEnv('DEEPSEEK_API_KEY');
    if (!apiKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { message: 'DEEPSEEK_API_KEY 未配置' } }));
      return;
    }

    const upstream = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const payload: any = await upstream.json().catch(() => null);
    if (!upstream.ok) {
      const msg: string = payload?.error?.message || '';
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { message: msg || 'DeepSeek 请求失败' } }));
      return;
    }

    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ error: { message: 'DeepSeek 返回内容为空' } }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ content }));
  } catch (err: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: { message: err instanceof Error ? err.message : '服务异常' },
      })
    );
  }
}
