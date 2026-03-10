import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { AIResponse, CustomStyle, Scene, Tag } from '@/types';
import { Bookmark, Globe, Loader2, Plus, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';

interface DialogueAssistantProps {
  selectedScene: Scene | null;
  selectedTag: Tag | null;
  apiKey: string;
  generateText: (prompt: string) => Promise<string>;
  customStyles: CustomStyle[];
  onAutoSelectTag: (text: string) => Promise<{ scene: Scene; tag: Tag }>;
  onAddCollection: (
    type: 'phrase' | 'grammar' | 'vocabulary',
    content: string,
    translation?: string,
    note?: string,
    context?: string,
    tags?: string[]
  ) => void;
  onAddCustomStyle: (name: string, prompt: string) => void;
  onDeleteCustomStyle: (id: string) => void;
}

// 内置风格
const builtInStyles = [
  { id: 'polite', name: '礼貌', description: '礼貌客气的表达' },
  { id: 'casual', name: '口语', description: '日常口语化表达' },
  { id: 'formal', name: '正式', description: '正式场合用语' },
  { id: 'humorous', name: '幽默', description: '轻松幽默的表达' },
];

// 支持的语言
const languages = [
  { code: 'en-US', name: '英语 (美国)', flag: '🇺🇸', prompt: 'American English' },
  { code: 'en-GB', name: '英语 (英国)', flag: '🇬🇧', prompt: 'British English' },
  { code: 'en-AU', name: '英语 (澳洲)', flag: '🇦🇺', prompt: 'Australian English' },
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

export function DialogueAssistant({
  selectedScene,
  selectedTag,
  apiKey,
  generateText,
  customStyles,
  onAutoSelectTag,
  onAddCollection,
  onAddCustomStyle,
  onDeleteCustomStyle,
}: DialogueAssistantProps) {
  const [question, setQuestion] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['polite', 'casual']);
  const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<AIResponse[]>([]);
  const [collectionDialog, setCollectionDialog] = useState<{
    isOpen: boolean;
    content: string;
    translation?: string;
  }>({ isOpen: false, content: '' });
  const [collectionNote, setCollectionNote] = useState('');
  
  // 自定义风格对话框
  const [isAddStyleOpen, setIsAddStyleOpen] = useState(false);
  const [newStyleName, setNewStyleName] = useState('');
  const [newStylePrompt, setNewStylePrompt] = useState('');
  
  const { toast } = useToast();

  const allStyles = [
    ...builtInStyles,
    ...customStyles.map((s) => ({ id: s.id, name: s.name, description: s.prompt })),
  ];

  const handleStyleToggle = (styleId: string) => {
    setSelectedStyles((prev) =>
      prev.includes(styleId)
        ? prev.filter((s) => s !== styleId)
        : [...prev, styleId]
    );
  };

  const getErrorMessage = (error: any): string => {
    const errorStr = error instanceof Error ? error.message : String(error);
    
    if (errorStr.includes('Quota exceeded') || errorStr.includes('quota')) {
      return 'API 配额已用完。免费版或试用额度可能有使用限制，请稍后再试或升级套餐。';
    }
    if (errorStr.includes('API key not valid') || errorStr.includes('invalid')) {
      return 'API Key 无效，请检查设置中的 API Key 是否正确。';
    }
    if (errorStr.includes('429') || errorStr.includes('rate limit')) {
      return '请求太频繁，请稍后再试。';
    }
    if (errorStr.includes('network') || errorStr.includes('fetch')) {
      return '网络连接失败，请检查网络设置。';
    }
    return `请求失败：${errorStr}`;
  };

  const generateResponses = async () => {
    if (!question.trim()) {
      toast({
        title: '请输入问题',
        variant: 'destructive',
      });
      return;
    }
    if (selectedStyles.length === 0) {
      toast({
        title: '请至少选择一种回答风格',
        variant: 'destructive',
      });
      return;
    }
    if (!apiKey) {
      toast({
        title: '请先设置 API Key',
        description: '点击右上角的设置按钮',
        variant: 'destructive',
      });
      return;
    }

    let scene = selectedScene;
    let tag = selectedTag;
    if (!scene || !tag) {
      try {
        const ensured = await onAutoSelectTag(question);
        scene = ensured.scene;
        tag = ensured.tag;
      } catch (err) {
        toast({
          title: '生成标签失败',
          description: err instanceof Error ? err.message : String(err),
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);
    setResponses([]);

    try {
      const styleConfigs = selectedStyles.map((styleId) => {
        const builtIn = builtInStyles.find((s) => s.id === styleId);
        if (builtIn) {
          const promptMap: Record<string, string> = {
            polite: 'polite and courteous, respectful tone',
            casual: 'casual and conversational, like talking to a friend',
            formal: 'formal and professional, business appropriate',
            humorous: 'humorous and light-hearted, with a touch of wit',
          };
          return { id: styleId, name: builtIn.name, prompt: promptMap[styleId] };
        }
        const custom = customStyles.find((s) => s.id === styleId);
        return { id: styleId, name: custom?.name || styleId, prompt: custom?.prompt || styleId };
      });

      const isEnglish = selectedLanguage.code.startsWith('en');
      const targetLangName = isEnglish ? selectedLanguage.prompt : selectedLanguage.name;
      const translationLang = isEnglish ? 'Chinese' : 'Chinese (中文)';

      const prompt = `You are a language assistant helping a Chinese user learn ${targetLangName}.

Context:
- Scene: ${scene.name}
- Tag/Topic: ${tag.name}
- User's question/situation: "${question}"
- Target language: ${targetLangName}

Please provide ${selectedStyles.length} different responses in ${targetLangName} for this situation, each with a different style:
${styleConfigs.map((s, i) => `${i + 1}. ${s.prompt} (style: ${s.name})`).join('\n')}

For each response, provide:
1. The response in ${targetLangName}
2. ${translationLang} translation

Format your answer exactly like this:
---
STYLE: [style name]
${targetLangName.toUpperCase()}: [response in ${targetLangName}]
CHINESE: [chinese translation]
---
(repeat for each style)

Keep responses natural and appropriate for the context.`;

      const text = await generateText(prompt);

      // 解析响应
      const parsedResponses: AIResponse[] = [];
      const blocks = text.split('---').filter((block) => block.trim());

      for (let i = 0; i < blocks.length && i < selectedStyles.length; i++) {
        const block = blocks[i];
        const styleNameMatch = block.match(/STYLE:\s*([^\n]+)/i);
        const responseMatch = block.match(new RegExp(`${targetLangName.toUpperCase().replace(/\s+/g, '\\s*')}:\\s*([^]+?)(?=CHINESE:|$)`, 'i'));
        const chineseMatch = block.match(/CHINESE:\s*([^]+?)(?=---|$)/i);

        if (responseMatch) {
          const styleName = styleNameMatch
            ? styleNameMatch[1].trim()
            : styleConfigs[i]?.name || selectedStyles[i];

          parsedResponses.push({
            id: `resp-${i}`,
            style: selectedStyles[i],
            styleName,
            content: responseMatch[1].trim(),
            translation: chineseMatch ? chineseMatch[1].trim() : undefined,
          });
        }
      }

      if (parsedResponses.length === 0) {
        throw new Error('无法解析 AI 响应，请重试');
      }

      setResponses(parsedResponses);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      toast({
        title: '生成回答失败',
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
      'phrase',
      collectionDialog.content,
      collectionDialog.translation,
      collectionNote || undefined,
      undefined,
      selectedTag ? [selectedTag.name] : undefined
    );
    setCollectionDialog({ isOpen: false, content: '' });
    toast({
      title: '已收藏',
      description: '可以在收藏夹中查看',
    });
  };

  const handleAddCustomStyle = () => {
    if (newStyleName.trim() && newStylePrompt.trim()) {
      onAddCustomStyle(newStyleName.trim(), newStylePrompt.trim());
      setNewStyleName('');
      setNewStylePrompt('');
      setIsAddStyleOpen(false);
      toast({
        title: '自定义风格已添加',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            对话助手
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 场景标签信息 */}
          <div className="flex items-center gap-2 text-sm flex-wrap">
            {selectedScene ? (
              <>
                <Badge variant="secondary">{selectedScene.name}</Badge>
                {selectedTag && (
                  <>
                    <span className="text-muted-foreground">/</span>
                    <Badge variant="outline">{selectedTag.name}</Badge>
                  </>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">请先选择场景和标签</span>
            )}
          </div>

          {/* 语言和风格选择 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium">回答风格</label>
                
                {/* 语言选择下拉菜单 */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2 h-8">
                      <Globe className="h-4 w-4" />
                      <span className="text-lg">{selectedLanguage.flag}</span>
                      <span className="text-xs">{selectedLanguage.name}</span>
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
              
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs"
                onClick={() => setIsAddStyleOpen(true)}
              >
                <Plus className="h-3 w-3" />
                添加风格
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {allStyles.map((style) => (
                <div
                  key={style.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 border rounded-full hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`style-${style.id}`}
                    checked={selectedStyles.includes(style.id)}
                    onCheckedChange={() => handleStyleToggle(style.id)}
                    className="h-4 w-4"
                  />
                  <label
                    htmlFor={`style-${style.id}`}
                    className="text-sm cursor-pointer select-none"
                    title={style.description}
                  >
                    {style.name}
                  </label>
                  {customStyles.some((s) => s.id === style.id) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 ml-1"
                      onClick={() => onDeleteCustomStyle(style.id)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 问题输入 - 增大尺寸 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">输入情境或问题</label>
            <Textarea
              placeholder={`例如：我想去取快递，但是不知道快递单号，应该怎么说？（将生成${selectedLanguage.name}回答）`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
            <div className="flex justify-end">
              <Button
                onClick={generateResponses}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                生成{selectedLanguage.name}回答
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 回答列表 */}
      {responses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-lg">{selectedLanguage.flag}</span>
              回答建议
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {responses.map((response) => (
                  <div
                    key={response.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">{response.styleName}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1"
                        onClick={() =>
                          openCollectionDialog(
                            response.content,
                            response.translation
                          )
                        }
                      >
                        <Bookmark className="h-4 w-4" />
                        收藏
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-base font-medium">{response.content}</p>
                      {response.translation && (
                        <p className="text-sm text-muted-foreground">
                          {response.translation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* 添加自定义风格对话框 */}
      <Dialog open={isAddStyleOpen} onOpenChange={setIsAddStyleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加自定义风格</DialogTitle>
            <DialogDescription>
              创建你自己的回答风格
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">风格名称</label>
              <Input
                placeholder="例如：简洁、委婉、直接..."
                value={newStyleName}
                onChange={(e) => setNewStyleName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">风格描述（英文）</label>
              <Textarea
                placeholder="例如：brief and concise, get straight to the point"
                value={newStylePrompt}
                onChange={(e) => setNewStylePrompt(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                用英文描述你想要的风格特点，AI 会根据这个描述生成回答
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddStyleOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddCustomStyle}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 收藏对话框 */}
      <Dialog
        open={collectionDialog.isOpen}
        onOpenChange={(open) =>
          setCollectionDialog((prev) => ({ ...prev, isOpen: open }))
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>收藏词组</DialogTitle>
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
