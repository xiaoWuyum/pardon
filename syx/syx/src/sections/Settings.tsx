import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { AIProvider } from '@/types';
import { AlertTriangle, ExternalLink, Key, Settings2, TestTube, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SettingsProps {
  provider: AIProvider;
  onSetProvider: (provider: AIProvider) => void;
  apiKey: string;
  isFromEnv?: boolean;
  onSaveApiKey: (key: string) => void;
  onClearApiKey: () => void;
  onTestConnection: () => Promise<void>;
  onClearAllData: () => void;
}

export function Settings({
  provider,
  onSetProvider,
  apiKey,
  isFromEnv,
  onSaveApiKey,
  onClearApiKey,
  onTestConnection,
  onClearAllData,
}: SettingsProps) {
  const [inputKey, setInputKey] = useState(apiKey);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setInputKey(apiKey);
  }, [apiKey, provider]);

  const providerName = provider === 'deepseek' ? 'DeepSeek' : 'Gemini';
  const apiKeyUrl =
    provider === 'deepseek'
      ? 'https://platform.deepseek.com/api_keys'
      : 'https://aistudio.google.com/app/apikey';

  const handleSaveKey = () => {
    if (inputKey.trim()) {
      onSaveApiKey(inputKey.trim());
      setIsKeyDialogOpen(false);
      toast({
        title: 'API Key 已保存',
      });
    }
  };

  const handleClearKey = () => {
    onClearApiKey();
    setInputKey('');
    toast({
      title: 'API Key 已清除',
    });
  };

  const handleClearAllData = () => {
    onClearAllData();
    setIsClearDataDialogOpen(false);
    toast({
      title: '所有数据已清除',
      description: '页面将刷新以应用更改',
    });
    setTimeout(() => window.location.reload(), 1500);
  };

  const testConnection = async () => {
    if (!apiKey) {
      toast({
        title: '请先设置 API Key',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      await onTestConnection();
      toast({
        title: '连接成功',
        description: `${providerName} API 可以正常使用`,
      });
    } catch (err) {
      toast({
        title: '连接失败',
        description: err instanceof Error ? err.message : '请检查 API Key 是否正确',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.slice(0, 4) + '••••••••' + key.slice(-4);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            设置
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* API Key 设置 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-medium">AI 提供方</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant={provider === 'gemini' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => onSetProvider('gemini')}
                >
                  Gemini
                </Button>
                <Button
                  variant={provider === 'deepseek' ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => onSetProvider('deepseek')}
                >
                  DeepSeek
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-medium">{providerName} API Key</h3>
              {apiKey && (
                <Badge variant={isFromEnv ? "outline" : "secondary"} className="text-xs">
                  {isFromEnv ? '来自环境变量' : '已设置'}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              需要 {providerName} API Key 才能使用 AI 功能。
              <a
                href={apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline ml-1 inline-flex items-center gap-1"
              >
                获取 API Key
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>

            {apiKey ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <code className="bg-muted px-3 py-2 rounded text-sm flex-1">
                    {maskApiKey(apiKey)}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsKeyDialogOpen(true)}
                  >
                    修改
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearKey}
                  >
                    清除
                  </Button>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-2"
                  onClick={testConnection}
                  disabled={isTesting}
                >
                  <TestTube className="h-4 w-4" />
                  {isTesting ? '测试中...' : '测试连接'}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsKeyDialogOpen(true)}
              >
                <Key className="h-4 w-4 mr-2" />
                设置 API Key
              </Button>
            )}
          </div>

          {/* 数据管理 */}
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-destructive" />
              <h3 className="font-medium text-destructive">危险区域</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              清除所有本地存储的数据，包括场景、标签、收藏等。此操作不可撤销。
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setIsClearDataDialogOpen(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              清除所有数据
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Key 对话框 */}
      <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>设置 {providerName} API Key</DialogTitle>
            <DialogDescription>
              输入你的 {providerName} API Key
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="输入 API Key..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              type="password"
            />
            <p className="text-xs text-muted-foreground">
              API Key 将保存在你的浏览器本地存储中，不会上传到任何服务器。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsKeyDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSaveKey}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 清除数据确认对话框 */}
      <AlertDialog
        open={isClearDataDialogOpen}
        onOpenChange={setIsClearDataDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认清除所有数据？</AlertDialogTitle>
            <AlertDialogDescription>
              这将删除所有场景、标签、收藏和查询记录。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAllData}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认清除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
