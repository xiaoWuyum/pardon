import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { useAppStore } from '@/hooks/useAppStore';
import { useGemini } from '@/hooks/useGemini';
import { useIsMobile } from '@/hooks/use-mobile';
import { CollectionManager } from '@/sections/CollectionManager';
import { DialogueAssistant } from '@/sections/DialogueAssistant';
import { SceneManager } from '@/sections/SceneManager';
import { Settings as SettingsPanel } from '@/sections/Settings';
import { VocabularyLookup } from '@/sections/VocabularyLookup';
import type { Scene, Tag } from '@/types';
import {
    BookOpen,
    Bookmark,
    CheckCircle,
    Languages,
    Menu,
    MessageSquare,
    Settings,
    XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';

type TabType = 'dialogue' | 'vocabulary' | 'collection' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dialogue');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const {
    state,
    isLoaded,
    addScene,
    updateScene,
    deleteScene,
    addTag,
    updateTag,
    deleteTag,
    addCustomStyle,
    deleteCustomStyle,
    addCollection,
    updateCollection,
    deleteCollection,
    addVocabularyQuery,
  } = useAppStore();

  const { 
    provider, 
    setProvider, 
    apiKey, 
    isFromEnv,
    saveApiKey, 
    clearApiKey, 
    testConnection,
    generateText 
  } = useGemini();

  const autoSelectTag = useCallback(
    async (text: string): Promise<{ scene: Scene; tag: Tag }> => {
      const trimmed = text.trim();
      const normalize = (v: string) => v.trim().replace(/^["'“”]+|["'“”]+$/g, '');

      let scene =
        selectedScene ||
        state.scenes.find((s) => s.name === '日常用语') ||
        state.scenes[0] ||
        addScene('日常用语');

      const suggestTagByHeuristic = () => {
        const cleaned = trimmed
          .replace(/[\r\n]+/g, ' ')
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!cleaned) return '对话';
        return cleaned.slice(0, 12);
      };

      const suggestTagByAI = async () => {
        const prompt = `你是一个中文标签生成器。
请根据用户输入生成一个简短标签（中文 2-8 字），概括主题。
只输出标签文本，不要解释，不要加引号。

用户输入：${trimmed}`;

        if (!apiKey) {
          return suggestTagByHeuristic();
        }

        try {
          const text = await generateText(prompt);
          return normalize(text.split('\n')[0] || '');
        } catch (err) {
          console.error('AI tag generation failed:', err);
          return suggestTagByHeuristic();
        }
      };

      const suggested = (await suggestTagByAI()) || suggestTagByHeuristic();
      const tagName = suggested.trim().slice(0, 12) || '对话';

      const existingTag = state.tags.find(
        (t) => t.sceneId === scene.id && t.name.toLowerCase() === tagName.toLowerCase()
      );
      const tag = existingTag || addTag(scene.id, tagName);

      setSelectedScene(scene);
      setSelectedTag(tag);

      return { scene, tag };
    },
    [addScene, addTag, apiKey, provider, selectedScene, state.scenes, state.tags]
  );

  const handleAddCollection = (
    type: 'phrase' | 'grammar' | 'vocabulary',
    content: string,
    translation?: string,
    note?: string,
    context?: string,
    tags?: string[]
  ) => {
    addCollection(type, content, translation, note, context, tags);
  };

  const handleAddVocabulary = (data: {
    word: string;
    englishDefinition: string;
    chineseDefinition: string;
    synonyms: string[];
    examples: string[];
  }) => {
    addVocabularyQuery(
      data.word,
      data.englishDefinition,
      data.chineseDefinition,
      data.synonyms,
      data.examples
    );
  };

  const handleClearAllData = () => {
    localStorage.removeItem('english-learning-assistant-v2');
    localStorage.removeItem('gemini-api-key');
    localStorage.removeItem('deepseek-api-key');
    localStorage.removeItem('ai-provider');
  };

  const tabs = [
    { id: 'dialogue' as TabType, name: '对话助手', icon: MessageSquare },
    { id: 'vocabulary' as TabType, name: '生词查询', icon: BookOpen },
    { id: 'collection' as TabType, name: '我的收藏', icon: Bookmark },
    { id: 'settings' as TabType, name: '设置', icon: Settings },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'dialogue':
        return (
          <DialogueAssistant
            selectedScene={selectedScene}
            selectedTag={selectedTag}
            apiKey={apiKey}
            generateText={generateText}
            customStyles={state.customStyles}
            onAutoSelectTag={autoSelectTag}
            onAddCollection={handleAddCollection}
            onAddCustomStyle={addCustomStyle}
            onDeleteCustomStyle={deleteCustomStyle}
          />
        );
      case 'vocabulary':
        return (
          <VocabularyLookup
            apiKey={apiKey}
            generateText={generateText}
            onAddVocabulary={handleAddVocabulary}
            onAddCollection={handleAddCollection}
          />
        );
      case 'collection':
        return (
          <CollectionManager
            collections={state.collections}
            onUpdateCollection={updateCollection}
            onDeleteCollection={deleteCollection}
          />
        );
      case 'settings':
        return (
          <SettingsPanel
            provider={provider}
            onSetProvider={setProvider}
            apiKey={apiKey}
            isFromEnv={isFromEnv}
            onSaveApiKey={saveApiKey}
            onClearApiKey={clearApiKey}
            onTestConnection={testConnection}
            onClearAllData={handleClearAllData}
          />
        );
      default:
        return null;
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航栏 */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <Languages className="h-6 w-6 text-primary" />
                    <h1 className="font-bold text-lg">英语学习助手</h1>
                  </div>
                </div>
                <div className="p-4">
                  <SceneManager
                    scenes={state.scenes}
                    tags={state.tags}
                    selectedScene={selectedScene}
                    selectedTag={selectedTag}
                    onSelectScene={(scene) => {
                      setSelectedScene(scene);
                      setSelectedTag(null);
                    }}
                    onSelectTag={setSelectedTag}
                    onAddScene={addScene}
                    onUpdateScene={updateScene}
                    onDeleteScene={deleteScene}
                    onAddTag={addTag}
                    onUpdateTag={updateTag}
                    onDeleteTag={deleteTag}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Languages className="h-6 w-6 text-primary" />
              <h1 className="font-bold text-lg hidden sm:block">英语学习助手</h1>
            </div>
          </div>

          {/* API 状态指示器 */}
          <div className="flex items-center gap-3">
            {apiKey ? (
              <Badge variant="secondary" className="gap-1.5">
                <CheckCircle className="h-3 w-3 text-green-500" />
                <span className="hidden sm:inline">
                  {provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} 已连接
                </span>
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1.5">
                <XCircle className="h-3 w-3" />
                <span className="hidden sm:inline">
                  未设置 {provider === 'deepseek' ? 'DeepSeek' : 'Gemini'} API
                </span>
              </Badge>
            )}

            {/* 桌面端标签导航 */}
            <nav className="hidden md:flex items-center gap-1">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-2"
                  onClick={() => setActiveTab(tab.id)}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.name}
                </Button>
              ))}
            </nav>

            <div className="md:hidden">
              <Button
                variant={activeTab === 'settings' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setActiveTab('settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <div className="flex">
        {/* 左侧边栏 - 场景管理（仅桌面端显示） */}
        <aside className="hidden lg:block w-72 border-r bg-card min-h-[calc(100vh-3.5rem)] p-4">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              场景与标签
            </h2>
            <SceneManager
              scenes={state.scenes}
              tags={state.tags}
              selectedScene={selectedScene}
              selectedTag={selectedTag}
              onSelectScene={(scene) => {
                setSelectedScene(scene);
                setSelectedTag(null);
              }}
              onSelectTag={setSelectedTag}
              onAddScene={addScene}
              onUpdateScene={updateScene}
              onDeleteScene={deleteScene}
              onAddTag={addTag}
              onUpdateTag={updateTag}
              onDeleteTag={deleteTag}
            />
          </div>
        </aside>

        {/* 右侧内容区 */}
        <main className="flex-1 p-4 pb-24 md:pb-4 lg:p-6 lg:pb-6 max-w-4xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card md:hidden">
        <div className="flex items-stretch h-16">
          <Button
            variant={activeTab === 'collection' ? 'secondary' : 'ghost'}
            className="flex-1 h-full rounded-none flex flex-col gap-1"
            onClick={() => setActiveTab('collection')}
          >
            <Bookmark className="h-5 w-5" />
            <span className="text-xs">收藏</span>
          </Button>
          <Button
            variant={activeTab === 'dialogue' ? 'secondary' : 'ghost'}
            className="flex-1 h-full rounded-none flex flex-col gap-1"
            onClick={() => setActiveTab('dialogue')}
          >
            <MessageSquare className="h-5 w-5" />
            <span className="text-xs">对话</span>
          </Button>
          <Button
            variant={activeTab === 'vocabulary' ? 'secondary' : 'ghost'}
            className="flex-1 h-full rounded-none flex flex-col gap-1"
            onClick={() => setActiveTab('vocabulary')}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-xs">生词</span>
          </Button>
        </div>
      </nav>

      <Toaster position={isMobile ? 'top-center' : 'bottom-right'} />
    </div>
  );
}

export default App;
