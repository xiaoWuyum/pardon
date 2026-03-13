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
import { useToast } from '@/hooks/use-toast';
import type { AIProvider } from '@/types';
import { AlertTriangle, Settings2, TestTube, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface SettingsProps {
  provider: AIProvider;
  model: string;
  onSetModel: (model: string) => void;
  onTestConnection: () => Promise<void>;
  onClearAllData: () => void;
}

export function Settings({
  provider,
  model,
  onSetModel,
  onTestConnection,
  onClearAllData,
}: SettingsProps) {
  const [isClearDataDialogOpen, setIsClearDataDialogOpen] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const providerName = provider === 'deepseek' ? 'DeepSeek' : 'Gemini';

  const modelOptions: Array<{ id: string; name: string; provider: AIProvider }> = [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek' },
    { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', provider: 'gemini' },
  ];

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
    setIsTesting(true);
    try {
      await onTestConnection();
      toast({
        title: '连接成功',
        description: `${providerName} / ${model} 可以正常使用`,
      });
    } catch (err) {
      toast({
        title: '连接失败',
        description: err instanceof Error ? err.message : '请检查服务端环境变量是否配置正确',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
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
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">模型</h3>
              <Badge variant="secondary" className="text-xs">
                {providerName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              API Key 由服务端环境变量管理，前端页面不会展示或允许修改。
            </p>

            <div className="flex flex-wrap gap-2">
              {modelOptions.map((opt) => (
                <Button
                  key={opt.id}
                  variant={model === opt.id ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => onSetModel(opt.id)}
                >
                  {opt.name}
                </Button>
              ))}
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
