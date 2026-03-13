import { useState } from 'react';
import { Search, Bookmark, Loader2, BookOpen, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface VocabularyLookupProps {
  generateText: (prompt: string) => Promise<string>;
  onAddVocabulary: (data: {
    word: string;
    englishDefinition: string;
    chineseDefinition: string;
    synonyms: string[];
    examples: string[];
  }) => void;
  onAddCollection: (
    type: 'vocabulary',
    content: string,
    translation?: string,
    note?: string
  ) => void;
}

interface VocabularyResult {
  word: string;
  englishDefinition: string;
  chineseDefinition: string;
  synonyms: string[];
  examples: string[];
}

// 支持的语言
const languages = [
  { code: 'en', name: '英语', flag: '🇺🇸', prompt: 'English' },
  { code: 'ja', name: '日语', flag: '🇯🇵', prompt: 'Japanese' },
  { code: 'ko', name: '韩语', flag: '🇰🇷', prompt: 'Korean' },
  { code: 'fr', name: '法语', flag: '🇫🇷', prompt: 'French' },
  { code: 'de', name: '德语', flag: '🇩🇪', prompt: 'German' },
  { code: 'es', name: '西班牙语', flag: '🇪🇸', prompt: 'Spanish' },
  { code: 'it', name: '意大利语', flag: '🇮🇹', prompt: 'Italian' },
  { code: 'pt', name: '葡萄牙语', flag: '🇵🇹', prompt: 'Portuguese' },
  { code: 'ru', name: '俄语', flag: '🇷🇺', prompt: 'Russian' },
  { code: 'th', name: '泰语', flag: '🇹🇭', prompt: 'Thai' },
];

export function VocabularyLookup({
  generateText,
  onAddVocabulary,
  onAddCollection,
}: VocabularyLookupProps) {
  const [word, setWord] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VocabularyResult | null>(null);
  const [collectionDialog, setCollectionDialog] = useState<{
    isOpen: boolean;
    content: string;
    translation?: string;
  }>({ isOpen: false, content: '' });
  const [collectionNote, setCollectionNote] = useState('');
  const { toast } = useToast();

  const getErrorMessage = (error: any): string => {
    const errorStr = error instanceof Error ? error.message : String(error);
    
    if (errorStr.includes('Quota exceeded') || errorStr.includes('quota')) {
      return 'API 配额已用完。免费版或试用额度可能有使用限制，请稍后再试或升级套餐。';
    }
    if (errorStr.includes('API key not valid') || errorStr.includes('invalid')) {
      return '服务端鉴权失败，请检查环境变量是否配置正确。';
    }
    if (errorStr.includes('429') || errorStr.includes('rate limit')) {
      return '请求太频繁，请稍后再试。';
    }
    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return '网络连接失败，请检查网络设置。';
    }
    return `查询失败：${errorStr}`;
  };

  const lookupWord = async () => {
    if (!word.trim()) {
      toast({
        title: '请输入单词',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const prompt = `You are a ${selectedLanguage.prompt} dictionary for Chinese learners.

Please explain the ${selectedLanguage.prompt} word: "${word.trim()}"

Provide:
1. Definition in simple ${selectedLanguage.prompt}
2. 3-5 synonyms in ${selectedLanguage.prompt} (if applicable)
3. Chinese translation/definition
4. 2 example sentences in ${selectedLanguage.prompt} with Chinese translations

Format exactly like this:
DEFINITION: [definition in ${selectedLanguage.prompt}]
SYNONYMS: [synonym1, synonym2, synonym3]
CHINESE: [chinese definition]
EXAMPLE1: [first example sentence]
EXAMPLE1_TRANS: [chinese translation]
EXAMPLE2: [second example sentence]
EXAMPLE2_TRANS: [chinese translation]`;

      const text = await generateText(prompt);

      // 解析响应
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

      const parsedResult: VocabularyResult = {
        word: word.trim(),
        englishDefinition: definitionMatch
          ? definitionMatch[1].trim()
          : 'No definition found',
        chineseDefinition: chineseMatch
          ? chineseMatch[1].trim()
          : '未找到释义',
        synonyms: synonyms.slice(0, 5),
        examples,
      };

      setResult(parsedResult);
      onAddVocabulary(parsedResult);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: '查询失败',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openCollectionDialog = (content: string, translation?: string) => {
    setCollectionDialog({ isOpen: true, content, translation });
    setCollectionNote('');
  };

  const saveCollection = () => {
    onAddCollection(
      'vocabulary',
      collectionDialog.content,
      collectionDialog.translation,
      collectionNote || undefined
    );
    setCollectionDialog({ isOpen: false, content: '' });
    toast({
      title: '已收藏',
      description: '可以在收藏夹中查看',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            生词查询
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 语言选择 */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">查询语言：</label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-lg">{selectedLanguage.flag}</span>
                  <span>{selectedLanguage.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => setSelectedLanguage(lang)}
                    className="gap-2"
                  >
                    <span className="text-lg">{lang.flag}</span>
                    <span className={selectedLanguage.code === lang.code ? 'font-medium' : ''}>
                      {lang.name}
                    </span>
                    {selectedLanguage.code === lang.code && (
                      <span className="ml-auto text-primary">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">输入{selectedLanguage.name}单词</label>
            <div className="flex gap-2">
              <Input
                placeholder={`例如：${selectedLanguage.code === 'en' ? 'accommodate' : selectedLanguage.code === 'ja' ? 'こんにちは' : 'bonjour'}`}
                value={word}
                onChange={(e) => setWord(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lookupWord()}
                disabled={isLoading}
              />
              <Button
                onClick={lookupWord}
                disabled={isLoading}
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 查询结果 */}
      {result && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <span className="text-lg">{selectedLanguage.flag}</span>
              {result.word}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() =>
                openCollectionDialog(
                  result.word,
                  result.chineseDefinition
                )
              }
            >
              <Bookmark className="h-4 w-4" />
              收藏
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 英文释义 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {selectedLanguage.name}释义
              </h4>
              <p className="text-base">{result.englishDefinition}</p>
            </div>

            {/* 近义词 */}
            {result.synonyms.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  近义词
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.synonyms.map((synonym, index) => (
                    <Badge key={index} variant="secondary">
                      {synonym}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 中文释义 */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                中文释义
              </h4>
              <p className="text-base">{result.chineseDefinition}</p>
            </div>

            {/* 例句 */}
            {result.examples.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  例句
                </h4>
                <ScrollArea className="h-[150px]">
                  <div className="space-y-3">
                    {result.examples.map((example, index) => (
                      <div
                        key={index}
                        className="p-3 bg-muted rounded-md space-y-1"
                      >
                        <p className="text-sm">{example}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1"
                          onClick={() => openCollectionDialog(example)}
                        >
                          <Bookmark className="h-3 w-3" />
                          收藏例句
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 收藏对话框 */}
      <Dialog
        open={collectionDialog.isOpen}
        onOpenChange={(open) =>
          setCollectionDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>收藏</DialogTitle>
            <DialogDescription>添加笔记（可选）</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="font-medium">{collectionDialog.content}</p>
              {collectionDialog.translation && (
                <p className="text-sm text-muted-foreground mt-1">
                  {collectionDialog.translation}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">笔记</label>
              <Input
                placeholder="添加一些备注..."
                value={collectionNote}
                onChange={(e) => setCollectionNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCollectionDialog({ isOpen: false, content: '' })
              }
            >
              取消
            </Button>
            <Button onClick={saveCollection}>收藏</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
