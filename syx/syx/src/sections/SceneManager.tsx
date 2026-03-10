import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronRight, Edit2, FolderOpen, Plus, Tag, Trash2 } from 'lucide-react';
import { useState } from 'react';

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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Scene, Tag as TagType } from '@/types';

interface SceneManagerProps {
  scenes: Scene[];
  tags: TagType[];
  selectedScene: Scene | null;
  selectedTag: TagType | null;
  onSelectScene: (scene: Scene | null) => void;
  onSelectTag: (tag: TagType | null) => void;
  onAddScene: (name: string, description?: string) => void;
  onUpdateScene: (id: string, updates: Partial<Scene>) => void;
  onDeleteScene: (id: string) => void;
  onAddTag: (sceneId: string, name: string) => void;
  onUpdateTag: (id: string, updates: Partial<TagType>) => void;
  onDeleteTag: (id: string) => void;
}

export function SceneManager({
  scenes,
  tags,
  selectedScene,
  selectedTag,
  onSelectScene,
  onSelectTag,
  onAddScene,
  onUpdateScene,
  onDeleteScene,
  onAddTag,
  onUpdateTag,
  onDeleteTag,
}: SceneManagerProps) {
  const [isAddSceneOpen, setIsAddSceneOpen] = useState(false);
  const [isEditSceneOpen, setIsEditSceneOpen] = useState(false);
  const [isAddTagOpen, setIsAddTagOpen] = useState(false);
  const [isEditTagOpen, setIsEditTagOpen] = useState(false);
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [newSceneName, setNewSceneName] = useState('');
  const [newSceneDesc, setNewSceneDesc] = useState('');
  const [editingScene, setEditingScene] = useState<Scene | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [editingTag, setEditingTag] = useState<TagType | null>(null);
  const [expandedScenes, setExpandedScenes] = useState<Set<string>>(new Set());

  const getTagsByScene = (sceneId: string) =>
    tags.filter((tag) => tag.sceneId === sceneId);

  const toggleSceneExpand = (sceneId: string) => {
    setExpandedScenes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleAddScene = () => {
    if (newSceneName.trim()) {
      onAddScene(newSceneName.trim(), newSceneDesc.trim() || undefined);
      setNewSceneName('');
      setNewSceneDesc('');
      setIsAddSceneOpen(false);
    }
  };

  const handleEditScene = (scene: Scene) => {
    setEditingScene(scene);
    setNewSceneName(scene.name);
    setNewSceneDesc(scene.description || '');
    setIsEditSceneOpen(true);
  };

  const handleUpdateScene = () => {
    if (editingScene && newSceneName.trim()) {
      onUpdateScene(editingScene.id, {
        name: newSceneName.trim(),
        description: newSceneDesc.trim() || undefined,
      });
      setNewSceneName('');
      setNewSceneDesc('');
      setEditingScene(null);
      setIsEditSceneOpen(false);
    }
  };

  const handleAddTag = () => {
    if (selectedScene && newTagName.trim()) {
      onAddTag(selectedScene.id, newTagName.trim());
      setNewTagName('');
      setIsAddTagOpen(false);
      // 自动展开场景
      setExpandedScenes((prev) => new Set(prev).add(selectedScene.id));
    }
  };

  const handleEditTag = (tag: TagType) => {
    setEditingTag(tag);
    setNewTagName(tag.name);
    setIsEditTagOpen(true);
  };

  const handleUpdateTag = () => {
    if (editingTag && newTagName.trim()) {
      onUpdateTag(editingTag.id, { name: newTagName.trim() });
      setNewTagName('');
      setEditingTag(null);
      setIsEditTagOpen(false);
    }
  };

  const handleSelectTag = (scene: Scene, tag: TagType) => {
    onSelectScene(scene);
    onSelectTag(tag);
  };

  return (
    <div className="space-y-3">
      {/* 场景列表 */}
      <div className="space-y-2">
        {scenes.map((scene) => {
          const sceneTags = getTagsByScene(scene.id);
          const isExpanded = expandedScenes.has(scene.id);
          const isSelected = selectedScene?.id === scene.id;

          return (
            <Collapsible
              key={scene.id}
              open={isExpanded}
              onOpenChange={() => toggleSceneExpand(scene.id)}
            >
              <div className="border rounded-lg overflow-hidden bg-card">
                {/* 场景头部 */}
                <CollapsibleTrigger asChild>
                  <div
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer transition-colors ${
                      isSelected && !selectedTag
                        ? 'bg-primary/10'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => onSelectScene(scene)}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <FolderOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate text-sm font-medium">{scene.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({sceneTags.length})
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditScene(scene)}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => setSceneToDelete(scene.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CollapsibleTrigger>

                {/* 标签列表 */}
                <CollapsibleContent>
                  <div className="border-t">
                    {sceneTags.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-muted-foreground text-center">
                        暂无标签
                      </div>
                    ) : (
                      sceneTags.map((tag) => (
                        <div
                          key={tag.id}
                          className={`flex items-center justify-between px-3 py-2 pl-9 cursor-pointer transition-colors ${
                            selectedTag?.id === tag.id
                              ? 'bg-secondary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => handleSelectTag(scene, tag)}
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span className="truncate text-sm">{tag.name}</span>
                          </div>
                          <div
                            className="flex items-center gap-0.5 opacity-0 hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => handleEditTag(tag)}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => setTagToDelete(tag.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                    {/* 添加标签按钮 */}
                    <div className="px-3 py-2 pl-9">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2 h-7 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          onSelectScene(scene);
                          setIsAddTagOpen(true);
                        }}
                      >
                        <Plus className="h-3 w-3" />
                        添加标签
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </div>

      {/* 添加场景按钮 */}
      <Dialog open={isAddSceneOpen} onOpenChange={setIsAddSceneOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            添加分类
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新分类</DialogTitle>
            <DialogDescription>创建一个新的对话场景分类</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">场景名称</label>
              <Input
                placeholder="例如：商务英语"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述（可选）</label>
              <Input
                placeholder="简要描述这个场景"
                value={newSceneDesc}
                onChange={(e) => setNewSceneDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSceneOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddScene}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加标签对话框 */}
      <Dialog open={isAddTagOpen} onOpenChange={setIsAddTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加新标签</DialogTitle>
            <DialogDescription>
              为 &quot;{selectedScene?.name}&quot; 添加一个标签
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标签名称</label>
              <Input
                placeholder="例如：取快递"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddTagOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddTag}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑场景对话框 */}
      <Dialog open={isEditSceneOpen} onOpenChange={setIsEditSceneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑场景</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">场景名称</label>
              <Input
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">描述</label>
              <Input
                value={newSceneDesc}
                onChange={(e) => setNewSceneDesc(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditSceneOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateScene}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑标签对话框 */}
      <Dialog open={isEditTagOpen} onOpenChange={setIsEditTagOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">标签名称</label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTagOpen(false)}>
              取消
            </Button>
            <Button onClick={handleUpdateTag}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除场景确认 */}
      <AlertDialog open={!!sceneToDelete} onOpenChange={() => setSceneToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除场景？</AlertDialogTitle>
            <AlertDialogDescription>
              删除场景将同时删除该场景下的所有标签。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (sceneToDelete) {
                  onDeleteScene(sceneToDelete);
                  if (selectedScene?.id === sceneToDelete) {
                    onSelectScene(null);
                    onSelectTag(null);
                  }
                  setSceneToDelete(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除标签确认 */}
      <AlertDialog open={!!tagToDelete} onOpenChange={() => setTagToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除标签？</AlertDialogTitle>
            <AlertDialogDescription>此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (tagToDelete) {
                  onDeleteTag(tagToDelete);
                  if (selectedTag?.id === tagToDelete) {
                    onSelectTag(null);
                  }
                  setTagToDelete(null);
                }
              }}
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
