import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  Scene,
  Tag,
  CustomStyle,
  DialogueQuery,
  CollectionItem,
  VocabularyQuery,
  CollectionType,
  AppState,
} from '@/types';

const STORAGE_KEY = 'english-learning-assistant-v2';

const defaultState: AppState = {
  scenes: [],
  tags: [],
  customStyles: [],
  dialogueQueries: [],
  collections: [],
  vocabularyQueries: [],
};

// 初始化默认数据
const initializeDefaultData = (): AppState => {
  const dailyScene: Scene = {
    id: uuidv4(),
    name: '日常用语',
    description: '日常生活中的常用对话',
    createdAt: Date.now(),
  };

  const pickupTag: Tag = {
    id: uuidv4(),
    sceneId: dailyScene.id,
    name: '取快递',
    createdAt: Date.now(),
  };

  return {
    ...defaultState,
    scenes: [dailyScene],
    tags: [pickupTag],
  };
};

export function useAppStore() {
  const [state, setState] = useState<AppState>(defaultState);
  const [isLoaded, setIsLoaded] = useState(false);

  // 从 localStorage 加载数据
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setState(parsed);
      } catch {
        const defaultData = initializeDefaultData();
        setState(defaultData);
      }
    } else {
      const defaultData = initializeDefaultData();
      setState(defaultData);
    }
    setIsLoaded(true);
  }, []);

  // 保存到 localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoaded]);

  // 场景管理
  const addScene = useCallback((name: string, description?: string) => {
    const newScene: Scene = {
      id: uuidv4(),
      name,
      description,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      scenes: [...prev.scenes, newScene],
    }));
    return newScene;
  }, []);

  const updateScene = useCallback((id: string, updates: Partial<Scene>) => {
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.map((scene) =>
        scene.id === id ? { ...scene, ...updates } : scene
      ),
    }));
  }, []);

  const deleteScene = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      scenes: prev.scenes.filter((scene) => scene.id !== id),
      tags: prev.tags.filter((tag) => tag.sceneId !== id),
    }));
  }, []);

  // 标签管理
  const addTag = useCallback((sceneId: string, name: string) => {
    const newTag: Tag = {
      id: uuidv4(),
      sceneId,
      name,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }));
    return newTag;
  }, []);

  const updateTag = useCallback((id: string, updates: Partial<Tag>) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.map((tag) =>
        tag.id === id ? { ...tag, ...updates } : tag
      ),
    }));
  }, []);

  const deleteTag = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag.id !== id),
    }));
  }, []);

  const getTagsByScene = useCallback(
    (sceneId: string) => {
      return state.tags.filter((tag) => tag.sceneId === sceneId);
    },
    [state.tags]
  );

  // 自定义风格管理
  const addCustomStyle = useCallback((name: string, prompt: string) => {
    const newStyle: CustomStyle = {
      id: uuidv4(),
      name,
      prompt,
      createdAt: Date.now(),
    };
    setState((prev) => ({
      ...prev,
      customStyles: [...prev.customStyles, newStyle],
    }));
    return newStyle.id;
  }, []);

  const updateCustomStyle = useCallback((id: string, updates: Partial<CustomStyle>) => {
    setState((prev) => ({
      ...prev,
      customStyles: prev.customStyles.map((style) =>
        style.id === id ? { ...style, ...updates } : style
      ),
    }));
  }, []);

  const deleteCustomStyle = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      customStyles: prev.customStyles.filter((style) => style.id !== id),
    }));
  }, []);

  // 对话查询记录
  const addDialogueQuery = useCallback(
    (sceneId: string, tagId: string, question: string, responses: any[]) => {
      const newQuery: DialogueQuery = {
        id: uuidv4(),
        sceneId,
        tagId,
        question,
        responses,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        dialogueQueries: [newQuery, ...prev.dialogueQueries],
      }));
      return newQuery.id;
    },
    []
  );

  const deleteDialogueQuery = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      dialogueQueries: prev.dialogueQueries.filter((q) => q.id !== id),
    }));
  }, []);

  const getQueriesByTag = useCallback(
    (tagId: string) => {
      return state.dialogueQueries.filter((q) => q.tagId === tagId);
    },
    [state.dialogueQueries]
  );

  // 收藏管理
  const addCollection = useCallback(
    (
      type: CollectionType,
      content: string,
      translation?: string,
      note?: string,
      context?: string,
      tags: string[] = []
    ) => {
      const newItem: CollectionItem = {
        id: uuidv4(),
        type,
        content,
        translation,
        note,
        context,
        tags,
        createdAt: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        collections: [newItem, ...prev.collections],
      }));
      return newItem.id;
    },
    []
  );

  const updateCollection = useCallback(
    (id: string, updates: Partial<CollectionItem>) => {
      setState((prev) => ({
        ...prev,
        collections: prev.collections.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));
    },
    []
  );

  const deleteCollection = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      collections: prev.collections.filter((item) => item.id !== id),
    }));
  }, []);

  const getCollectionsByType = useCallback(
    (type: CollectionType) => {
      return state.collections.filter((item) => item.type === type);
    },
    [state.collections]
  );

  // 生词查询记录
  const addVocabularyQuery = useCallback(
    (
      word: string,
      englishDefinition: string,
      chineseDefinition: string,
      synonyms: string[],
      examples: string[]
    ) => {
      // 检查是否已存在
      const existingIndex = state.vocabularyQueries.findIndex(
        (v) => v.word.toLowerCase() === word.toLowerCase()
      );

      const newQuery: VocabularyQuery = {
        id: uuidv4(),
        word,
        englishDefinition,
        chineseDefinition,
        synonyms,
        examples,
        createdAt: Date.now(),
      };

      if (existingIndex >= 0) {
        // 更新现有记录
        setState((prev) => ({
          ...prev,
          vocabularyQueries: prev.vocabularyQueries.map((v, i) =>
            i === existingIndex ? newQuery : v
          ),
        }));
      } else {
        // 添加新记录
        setState((prev) => ({
          ...prev,
          vocabularyQueries: [newQuery, ...prev.vocabularyQueries],
        }));
      }
      return newQuery.id;
    },
    [state.vocabularyQueries]
  );

  const deleteVocabularyQuery = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      vocabularyQueries: prev.vocabularyQueries.filter((v) => v.id !== id),
    }));
  }, []);

  const searchVocabulary = useCallback(
    (word: string) => {
      return state.vocabularyQueries.find(
        (v) => v.word.toLowerCase() === word.toLowerCase()
      );
    },
    [state.vocabularyQueries]
  );

  return {
    state,
    isLoaded,
    // 场景
    addScene,
    updateScene,
    deleteScene,
    // 标签
    addTag,
    updateTag,
    deleteTag,
    getTagsByScene,
    // 自定义风格
    addCustomStyle,
    updateCustomStyle,
    deleteCustomStyle,
    // 对话查询
    addDialogueQuery,
    deleteDialogueQuery,
    getQueriesByTag,
    // 收藏
    addCollection,
    updateCollection,
    deleteCollection,
    getCollectionsByType,
    // 生词
    addVocabularyQuery,
    deleteVocabularyQuery,
    searchVocabulary,
  };
}
