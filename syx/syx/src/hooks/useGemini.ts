import type { AIProvider, AIResponse, CustomStyle } from '@/types';
import { useCallback, useState } from 'react';

const MODEL_STORAGE_KEY = 'ai-model';

const builtInStylePrompts: Record<string, string> = {
  polite: 'polite and courteous, respectful tone',
  casual: 'casual and conversational, like talking to a friend',
  formal: 'formal and professional, business appropriate',
  humorous: 'humorous and light-hearted, with a touch of wit',
};

export function useGemini() {
  const [model, setModelState] = useState<string>(() => {
    const stored = localStorage.getItem(MODEL_STORAGE_KEY);
    if (stored) return stored;
    return import.meta.env.VITE_AI_MODEL || 'deepseek-chat';
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setModel = useCallback((next: string) => {
    localStorage.setItem(MODEL_STORAGE_KEY, next);
    setModelState(next);
  }, []);

  const provider: AIProvider = model.startsWith('gemini-') ? 'gemini' : 'deepseek';

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
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          temperature: 0.7,
          maxTokens: 1024,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        const msg: string = payload?.error?.message || '';
        const lowered = msg.toLowerCase();
        if (res.status === 429 || lowered.includes('rate limit')) {
          throw new Error('请求太频繁，请稍后再试');
        }
        throw new Error(msg || `请求失败：${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as any;
      const content = data?.content;
      if (typeof content !== 'string' || !content.trim()) {
        throw new Error('返回内容为空');
      }
      return content;
    },
    [model]
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
    const text = await generateText('Hello');
    if (!text.length) {
      throw new Error('响应为空');
    }
  }, [generateText]);

  return {
    provider,
    model,
    setModel,
    isLoading,
    error,
    generateText,
    generateDialogueResponses,
    lookupVocabulary,
    testConnection,
  };
}
