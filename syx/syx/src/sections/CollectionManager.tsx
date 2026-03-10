import { useState } from 'react';
import {
  Bookmark,
  BookOpen,
  GraduationCap,
  MessageSquare,
  Trash2,
  Edit2,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import type { CollectionItem, CollectionType } from '@/types';

interface CollectionManagerProps {
  collections: CollectionItem[];
  onUpdateCollection: (id: string, updates: Partial<CollectionItem>) => void;
  onDeleteCollection: (id: string) => void;
}

const collectionTypes: { id: CollectionType; name: string; icon: React.ElementType }[] = [
  { id: 'phrase', name: '词组', icon: MessageSquare },
  { id: 'vocabulary', name: '生词', icon: BookOpen },
  { id: 'grammar', name: '语法', icon: GraduationCap },
];

export function CollectionManager({
  collections,
  onUpdateCollection,
  onDeleteCollection,
}: CollectionManagerProps) {
  const [activeTab, setActiveTab] = useState<CollectionType>('phrase');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const { toast } = useToast();

  const getCollectionsByType = (type: CollectionType) => {
    return collections
      .filter((item) => item.type === type)
      .filter(
        (item) =>
          searchQuery === '' ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.translation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.note?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => b.createdAt - a.createdAt);
  };

  const openEditDialog = (item: CollectionItem) => {
    setEditingItem(item);
    setEditNote(item.note || '');
  };

  const saveEdit = () => {
    if (editingItem) {
      onUpdateCollection(editingItem.id, { note: editNote });
      setEditingItem(null);
      toast({
        title: '已更新',
      });
    }
  };

  const confirmDelete = () => {
    if (deletingItemId) {
      onDeleteCollection(deletingItemId);
      setDeletingItemId(null);
      toast({
        title: '已删除',
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            我的收藏
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as CollectionType)}
          >
            <TabsList className="grid w-full grid-cols-3">
              {collectionTypes.map((type) => (
                <TabsTrigger key={type.id} value={type.id} className="gap-2">
                  <type.icon className="h-4 w-4" />
                  {type.name}
                  <Badge variant="secondary" className="ml-1">
                    {collections.filter((c) => c.type === type.id).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 搜索框 */}
            <div className="mt-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索收藏内容..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* 收藏列表 */}
            {collectionTypes.map((type) => (
              <TabsContent key={type.id} value={type.id} className="mt-4">
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {getCollectionsByType(type.id).map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium break-words">
                              {item.content}
                            </p>
                            {item.translation && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {item.translation}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditDialog(item)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => setDeletingItemId(item.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {item.note && (
                          <div className="text-sm bg-muted p-2 rounded">
                            <span className="text-muted-foreground">笔记: </span>
                            {item.note}
                          </div>
                        )}

                        {item.context && (
                          <div className="text-sm text-muted-foreground">
                            上下文: {item.context}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex gap-1">
                            {item.tags?.map((tag, index) => (
                              <Badge key={index} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <span>{formatDate(item.createdAt)}</span>
                        </div>
                      </div>
                    ))}

                    {getCollectionsByType(type.id).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? '没有找到匹配的收藏' : '暂无收藏'}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* 编辑对话框 */}
      <Dialog
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑笔记</DialogTitle>
            <DialogDescription>修改收藏的笔记内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {editingItem && (
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{editingItem.content}</p>
                {editingItem.translation && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {editingItem.translation}
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">笔记</label>
              <Input
                placeholder="添加笔记..."
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingItem(null)}>
              取消
            </Button>
            <Button onClick={saveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog
        open={!!deletingItemId}
        onOpenChange={() => setDeletingItemId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
