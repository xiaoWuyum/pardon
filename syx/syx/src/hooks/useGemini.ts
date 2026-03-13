import type { AIProvider, AIResponse, CustomStyle } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useCallback, useState } from 'react';

const PROVIDER_STORAGE_KEY = 'ai-provider';
const GEMINI_API_KEY_STORAGE_KEY = 'gemini-api-key';
const DEEPSEEK_API_KEY_STORAGE_KEY = 'deepseek-api-key';

const builtInStylePrompts: Record<string, string> = {
  polite: 'polite and courteous, respectful tone',
  casual: 'casual and conversational, like talking to a friend',
  formal: 'formal and professional, business appropriate',
  humorous: 'humorous and light-hearted, with a touch of wit',
};

export function useGemini() {
  const [provider, setProviderState] = useState<AIProvider>(() => {
    const stored = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (stored === 'deepseek' || stored === 'gemini') {
      return stored as AIProvider;
    }
    // 默认从环境变量读取，如果没有则默认为 deepseek
    const envProvider = import.meta.env.VITE_AI_PROVIDER;
    return (envProvider === 'gemini' ? 'gemini' : 'deepseek') as AIProvider;
  });

  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || import.meta.env.VITE_GEMINI_API_KEY || '';
  });

  const [deepseekApiKey, setDeepseekApiKey] = useState<string>(() => {
    return localStorage.getItem(DEEPSEEK_API_KEY_STORAGE_KEY) || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProvider = useCallback((next: AIProvider) => {
    localStorage.setItem(PROVIDER_STORAGE_KEY, next);
    setProviderState(next);
  }, []);

  const apiKey = provider === 'gemini' ? geminiApiKey : deepseekApiKey;

  const saveApiKey = useCallback(
    (key: string, targetProvider: AIProvider = provider) => {
      if (targetProvider === 'gemini') {
        localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key);
        setGeminiApiKey(key);
        return;
      }
      localStorage.setItem(DEEPSEEK_API_KEY_STORAGE_KEY, key);
      setDeepseekApiKey(key);
    },
    [provider]
  );

  const clearApiKey = useCallback(
    (targetProvider: AIProvider = provider) => {
      if (targetProvider === 'gemini') {
        localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
        setGeminiApiKey('');
        return;
      }
      localStorage.removeItem(DEEPSEEK_API_KEY_STORAGE_KEY);
      setDeepseekApiKey('');
    },
    [provider]
  );

  const getStylePrompt = (styleId: string, customStyles: CustomStyle[]): string => {
    const customStyle = customStyles.find((s) => s.id === styleId);
    if (customStyle) {
      return customStyle.prompt;
    }
    return builtInStylePrompts[styleId] || styleId;
  };

  const getStyleName = (styleId: string, customStyles: CustomStyle[]): string => {
    const customStyle = customStyles.find((s) => s.id === styleId);
    if (customStyle) {
      return customStyle.name;
    }
    const nameMap: Record<string, string> = {
      polite: '礼貌',
      casual: '口语',
      formal: '正式',
      humorous: '幽默',
    };
    return nameMap[styleId] || styleId;
  };

  const generateText = useCallback(
    async (prompt: string): Promise<string> => {
      if (!apiKey) {
        throw new Error('请先设置 API Key');
      }

      if (provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' });
        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 1024,
            temperature: 0.7,
          },
        });
        return result.response.text();
      }

      const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: prompt }],
          temperature: 1.3,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg: string = payload?.error?.message || '';
        const lowered = msg.toLowerCase();
        if (lowered.includes('insufficient balance')) {
          throw new Error('DeepSeek 余额不足，请先在 DeepSeek 控制台充值后再试');
        }
        if (res.status === 401 || lowered.includes('invalid') || lowered.includes('api key')) {
          throw new Error('DeepSeek API Key 无效或权限不足，请检查 Key 是否正确');
        }
        if (res.status === 429 || lowered.includes('rate limit')) {
          throw new Error('请求太频繁，请稍后再试');
        }
        throw new Error(msg ? `DeepSeek 请求失败：${msg}` : `DeepSeek 请求失败：${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('DeepSeek 返回内容为空');
      }
      return content;
    },
    [apiKey, provider]
  );

  const generateDialogueResponses = useCallback(
    async (
      scene: string,
      tag: string,
      question: string,
      styles: string[] = ['polite', 'casual', 'formal'],
      customStyles: CustomStyle[] = []
    ): Promise<AIResponse[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const stylesConfig = styles.map((styleId) => ({
          id: styleId,
          name: getStyleName(styleId, customStyles),
          prompt: getStylePrompt(styleId, customStyles),
        }));

        const prompt = 
`You are a language assistant.
Context:
- Scene: ${scene}
- Tag/Topic: ${tag}
- User's question: "${question}"

Please provide ${styles.length} different responses for this, each with a different style:
${stylesConfig.map((s, i) => `${i + 1}. ${s.prompt} (style: ${s.name})`).join('\n')}

For each response, provide:
1. English response
2. Chinese translation

Format answer exactly like this:
---
STYLE: [style name]
ENGLISH: [english response]
CHINESE: [chinese translation]
---
(repeat for each style)

Keep responses natural and appropriate for the context.`;

        const text = await generateText(prompt);

        const responses: AIResponse[] = [];
        const blocks = text.split('---').filter((block) => block.trim());

        for (let i = 0; i < blocks.length && i < styles.length; i++) {
          const block = blocks[i];
          const styleNameMatch = block.match(/STYLE:\s*([^\n]+)/i);
          const englishMatch = block.match(/ENGLISH:\s*([^]+?)(?=CHINESE:|$)/i);
          const chineseMatch = block.match(/CHINESE:\s*([^]+?)(?=---|$)/i);

          if (englishMatch) {
            const styleName = styleNameMatch 
              ? styleNameMatch[1].trim() 
              : getStyleName(styles[i], customStyles);
            
            responses.push({
              id: `resp-${i}`,
              style: styles[i],
              styleName,
              content: englishMatch[1].trim(),
              translation: chineseMatch ? chineseMatch[1].trim() : undefined,
            });
          }
        }

        return responses;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '生成回答时出错';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [generateText]
  );

  const lookupVocabulary = useCallback(
    async (word: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const prompt = `You are an English dictionary for Chinese learners.

Please explain the word: "${word}"

Provide:
1. English definition (simple and clear)
2. 3-5 English synonyms (if applicable)
3. Chinese translation/definition
4. 2 example sentences in English with Chinese translations

Format exactly like this:
DEFINITION: [english definition]
SYNONYMS: [synonym1, synonym2, synonym3]
CHINESE: [chinese definition]
EXAMPLE1: [first example sentence]
EXAMPLE1_TRANS: [chinese translation]
EXAMPLE2: [second example sentence]
EXAMPLE2_TRANS: [chinese translation]`;

        const text = await generateText(prompt);

        const definitionMatch = text.match(/DEFINITION:\s*([^]+?)(?=SYNONYMS:|$)/i);
        const synonymsMatch = text.match(/SYNONYMS:\s*([^]+?)(?=CHINESE:|$)/i);
        const chineseMatch = text.match(/CHINESE:\s*([^]+?)(?=EXAMPLE1:|$)/i);
        const example1Match = text.match(/EXAMPLE1:\s*([^]+?)(?=EXAMPLE1_TRANS:|$)/i);
        const example2Match = text.match(/EXAMPLE2:\s*([^]+?)(?=EXAMPLE2_TRANS:|$)/i);

        const synonyms = synonymsMatch
          ? synonymsMatch[1]
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

        const examples = [];
        if (example1Match) {
          examples.push(example1Match[1].trim());
        }
        if (example2Match) {
          examples.push(example2Match[1].trim());
        }

        return {
          word,
          englishDefinition: definitionMatch
            ? definitionMatch[1].trim()
            : 'No definition found',
          chineseDefinition: chineseMatch
            ? chineseMatch[1].trim()
            : '未找到释义',
          synonyms: synonyms.slice(0, 5),
          examples,
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : '查询生词时出错';
        setError(errorMsg);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [generateText]
  );

  const testConnection = useCallback(async (): Promise<void> => {
    if (!apiKey) {
      throw new Error('请先设置 API Key');
    }
    const text = await generateText('Hello');
    if (!text.length) {
      throw new Error('响应为空');
    }
  }, [apiKey, generateText]);

  const isFromEnv = provider === 'gemini' 
    ? !localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) && !!import.meta.env.VITE_GEMINI_API_KEY
    : !localStorage.getItem(DEEPSEEK_API_KEY_STORAGE_KEY) && !!import.meta.env.VITE_DEEPSEEK_API_KEY;

  return {
    provider,
    setProvider,
    apiKey,
    isFromEnv,
    geminiApiKey,
    deepseekApiKey,
    saveApiKey,
    clearApiKey,
    isLoading,
    error,
    generateText,
    generateDialogueResponses,
    lookupVocabulary,
    testConnection,
  };
}
