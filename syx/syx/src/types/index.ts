// 场景类型
export interface Scene {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
}

// 标签类型
export interface Tag {
  id: string;
  sceneId: string;
  name: string;
  createdAt: number;
}

// 内置回答风格
export type BuiltInResponseStyle = 'polite' | 'casual' | 'formal' | 'humorous';

export type AIProvider = 'gemini' | 'deepseek';

// 自定义风格
export interface CustomStyle {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
}

// 回答风格（内置或自定义）
export type ResponseStyle = BuiltInResponseStyle | string;

export interface ResponseStyleConfig {
  id: ResponseStyle;
  name: string;
  description: string;
  isCustom?: boolean;
}

// AI 生成的回答
export interface AIResponse {
  id: string;
  style: ResponseStyle;
  styleName: string;
  content: string;
  translation?: string;
}

// 对话查询记录
export interface DialogueQuery {
  id: string;
  sceneId: string;
  tagId: string;
  question: string;
  responses: AIResponse[];
  createdAt: number;
}

// 收藏项类型
export type CollectionType = 'phrase' | 'grammar' | 'vocabulary';

export interface CollectionItem {
  id: string;
  type: CollectionType;
  content: string;
  translation?: string;
  note?: string;
  context?: string;
  tags: string[];
  createdAt: number;
}

// 生词查询记录
export interface VocabularyQuery {
  id: string;
  word: string;
  englishDefinition: string;
  chineseDefinition: string;
  synonyms: string[];
  examples: string[];
  createdAt: number;
}

// 应用状态
export interface AppState {
  scenes: Scene[];
  tags: Tag[];
  customStyles: CustomStyle[];
  dialogueQueries: DialogueQuery[];
  collections: CollectionItem[];
  vocabularyQueries: VocabularyQuery[];
}
