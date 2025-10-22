// 表情包定义
export interface Emoji {
  id: string;
  name: string;
  type: 'unicode' | 'image';
  value: string; // unicode表情或图片路径
  category: 'emotion' | 'action' | 'object' | 'symbol';
}

// 默认表情包列表
const defaultEmojis: Emoji[] = [
  // 表情类
  { id: 'smile', name: '微笑', type: 'unicode', value: '😊', category: 'emotion' },
  { id: 'laugh', name: '大笑', type: 'unicode', value: '😂', category: 'emotion' },
  { id: 'love', name: '爱心', type: 'unicode', value: '❤️', category: 'emotion' },
  { id: 'cool', name: '酷', type: 'unicode', value: '😎', category: 'emotion' },
  { id: 'angry', name: '生气', type: 'unicode', value: '😠', category: 'emotion' },
  { id: 'sad', name: '伤心', type: 'unicode', value: '😢', category: 'emotion' },
  { id: 'surprised', name: '惊讶', type: 'unicode', value: '😲', category: 'emotion' },
  { id: 'confused', name: '困惑', type: 'unicode', value: '😕', category: 'emotion' },
  
  // 动作类
  { id: 'clap', name: '鼓掌', type: 'unicode', value: '👏', category: 'action' },
  { id: 'thumbsup', name: '点赞', type: 'unicode', value: '👍', category: 'action' },
  { id: 'thumbsdown', name: '踩', type: 'unicode', value: '👎', category: 'action' },
  { id: 'wave', name: '挥手', type: 'unicode', value: '👋', category: 'action' },
  { id: 'ok', name: 'OK', type: 'unicode', value: '👌', category: 'action' },
  { id: 'victory', name: '胜利', type: 'unicode', value: '✌️', category: 'action' },
  
  // 物体类
  { id: 'gift', name: '礼物', type: 'unicode', value: '🎁', category: 'object' },
  { id: 'star', name: '星星', type: 'unicode', value: '⭐', category: 'object' },
  { id: 'fire', name: '火焰', type: 'unicode', value: '🔥', category: 'object' },
  { id: 'heart', name: '心形', type: 'unicode', value: '♥️', category: 'object' },
  { id: 'flower', name: '花朵', type: 'unicode', value: '🌸', category: 'object' },
  
  // 符号类
  { id: 'exclamation', name: '感叹号', type: 'unicode', value: '❗', category: 'symbol' },
  { id: 'question', name: '问号', type: 'unicode', value: '❓', category: 'symbol' },
  { id: 'number1', name: '1', type: 'unicode', value: '1️⃣', category: 'symbol' },
  { id: 'number2', name: '2', type: 'unicode', value: '2️⃣', category: 'symbol' },
  { id: 'number3', name: '3', type: 'unicode', value: '3️⃣', category: 'symbol' }
];

// 表情包管理类 - 增强版，支持动态表情管理
export class EmojiManager {
  private emojis: Emoji[] = [...defaultEmojis];
  private customEmojiSets: Map<string, Emoji[]> = new Map(); // 存储自定义表情集
  private emojiAliases: Map<string, string> = new Map(); // 表情别名映射
  
  // 获取所有表情包
  getAllEmojis(): Emoji[] {
    // 合并默认表情和所有自定义表情集
    const allEmojis = [...this.emojis];
    this.customEmojiSets.forEach(emojiSet => {
      allEmojis.push(...emojiSet);
    });
    return allEmojis;
  }
  
  // 根据类别获取表情包
  getEmojisByCategory(category: Emoji['category'] | 'all'): Emoji[] {
    const allEmojis = this.getAllEmojis();
    if (category === 'all') {
      return allEmojis;
    }
    return allEmojis.filter(emoji => emoji.category === category);
  }
  
  // 检查表情集是否存在
  hasEmojiSet(setName: string): boolean {
    return this.customEmojiSets.has(setName);
  }
  
  // 获取指定表情集
  getEmojiSet(setName: string): Emoji[] | undefined {
    return this.customEmojiSets.get(setName);
  }
  
  // 根据ID查找表情
  findEmojiById(id: string): Emoji | undefined {
    const allEmojis = this.getAllEmojis();
    return allEmojis.find(emoji => emoji.id === id);
  }
  
  // 根据名称查找表情
  findEmojiByName(name: string): Emoji | undefined {
    // 检查别名映射
    const actualName = this.emojiAliases.get(name) || name;
    
    // 查找表情
    const allEmojis = this.getAllEmojis();
    return allEmojis.find(emoji => emoji.name === actualName);
  }
  
  // 添加自定义表情
  addEmoji(emoji: Emoji): void {
    // 确保ID唯一性
    const existingIndex = this.emojis.findIndex(e => e.id === emoji.id || e.name === emoji.name);
    if (existingIndex >= 0) {
      // 更新现有表情
      this.emojis[existingIndex] = emoji;
    } else {
      // 添加新表情
      this.emojis.push(emoji);
    }
  }
  
  // 批量添加表情
  addEmojis(emojis: Emoji[]): void {
    emojis.forEach(emoji => this.addEmoji(emoji));
  }
  
  // 加载自定义表情集
  loadEmojiSet(setName: string, emojis: Emoji[]): void {
    this.customEmojiSets.set(setName, emojis);
  }
  
  // 移除自定义表情集
  removeEmojiSet(setName: string): void {
    this.customEmojiSets.delete(setName);
  }
  
  // 添加表情别名
  addEmojiAlias(alias: string, emojiName: string): void {
    this.emojiAliases.set(alias, emojiName);
  }
  
  // 从服务器加载表情配置
  async loadEmojisFromServer(url: string): Promise<boolean> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load emojis: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.emojis) {
        this.addEmojis(data.emojis);
      }
      
      if (data.emojiSets) {
        Object.entries(data.emojiSets).forEach(([setName, emojis]) => {
          this.loadEmojiSet(setName, emojis as Emoji[]);
        });
      }
      
      if (data.aliases) {
        Object.entries(data.aliases).forEach(([alias, emojiName]) => {
          this.addEmojiAlias(alias, emojiName as string);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to load emojis from server:', error);
      return false;
    }
  }
  
  // 保存表情配置到本地存储
  saveToStorage(): void {
    const config = {
      customEmojis: this.emojis.filter(e => !defaultEmojis.some(de => de.id === e.id)),
      emojiSets: Object.fromEntries(this.customEmojiSets),
      aliases: Object.fromEntries(this.emojiAliases)
    };
    localStorage.setItem('emojiConfig', JSON.stringify(config));
  }
  
  // 从本地存储加载表情配置
  loadFromStorage(): void {
    const stored = localStorage.getItem('emojiConfig');
    if (stored) {
      try {
        const config = JSON.parse(stored);
        if (config.customEmojis) {
          this.addEmojis(config.customEmojis);
        }
        if (config.emojiSets) {
          Object.entries(config.emojiSets).forEach(([setName, emojis]) => {
            this.loadEmojiSet(setName, emojis as Emoji[]);
          });
        }
        if (config.aliases) {
          Object.entries(config.aliases).forEach(([alias, emojiName]) => {
            this.addEmojiAlias(alias, emojiName as string);
          });
        }
      } catch (error) {
        console.error('Failed to load emoji config from storage:', error);
      }
    }
  }
}

// 全局表情包管理器实例
const emojiManager = new EmojiManager();

// 导出工具函数
export const getEmojisByCategory = (category: Emoji['category'] | 'all') => emojiManager.getEmojisByCategory(category);
export const hasEmojiSet = (setName: string) => emojiManager.hasEmojiSet(setName);
export const getEmojiSet = (setName: string) => emojiManager.getEmojiSet(setName);
export const findEmojiById = (id: string) => emojiManager.findEmojiById(id);
export const findEmojiByName = (name: string) => emojiManager.findEmojiByName(name);
export const addEmoji = (emoji: Emoji) => emojiManager.addEmoji(emoji);
export const loadEmojiSet = (setName: string, emojis: Emoji[]) => emojiManager.loadEmojiSet(setName, emojis);
export const loadEmojisFromServer = (url: string) => emojiManager.loadEmojisFromServer(url);

// 表情分类
export const emojiCategories = [
  { id: 'all', name: '全部' },
  { id: 'emotion', name: '表情' },
  { id: 'action', name: '动作' },
  { id: 'object', name: '物体' },
  { id: 'symbol', name: '符号' }
];

// 表情替换正则表达式 - 增强版，支持更多格式
const emojiRegex = /\[emoji:([a-zA-Z0-9_]+)\]/g;
const CUSTOM_EMOJI_REGEX = /<emoji:([a-zA-Z0-9_]+)(:([a-zA-Z0-9_]+))?>/g;

// 将文本中的表情标记替换为实际表情
export function replaceEmojiPlaceholders(text: string): string {
  // 替换标准表情占位符
  let result = text.replace(emojiRegex, (match, emojiId) => {
    const emoji = findEmojiById(emojiId);
    if (emoji) {
      if (emoji.type === 'image') {
        // 对于图片表情，返回HTML标签
        return `<img src="${emoji.value}" alt="${emoji.name}" class="emoji-image" />`;
      }
      return emoji.value;
    }
    return match;
  });
  
  // 替换自定义表情格式
  result = result.replace(CUSTOM_EMOJI_REGEX, (match, emojiId, _, setName) => {
    // 先尝试从指定集合查找
    if (setName && emojiManager.hasEmojiSet(setName)) {
      const set = emojiManager.getEmojiSet(setName);
      if (set) {
        const emoji = set.find(e => e.id === emojiId);
        if (emoji) {
          if (emoji.type === 'image') {
            return `<img src="${emoji.value}" alt="${emoji.name}" class="emoji-image emoji-set-${setName}" />`;
          }
          return emoji.value;
        }
      }
    }
    
    // 回退到全局查找
    const emoji = findEmojiById(emojiId);
    if (emoji) {
      if (emoji.type === 'image') {
        return `<img src="${emoji.value}" alt="${emoji.name}" class="emoji-image" />`;
      }
      return emoji.value;
    }
    return match;
  });
  
  return result;
}

// 将表情转换为标记格式
export function emojiToPlaceholder(emojiId: string): string {
  return `[emoji:${emojiId}]`;
}

// 初始化 - 从本地存储加载配置
emojiManager.loadFromStorage();

// 当页面卸载时保存配置
window.addEventListener('beforeunload', () => {
  emojiManager.saveToStorage();
});