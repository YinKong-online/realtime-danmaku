// 表情包定义
export interface Emoji {
  id: string;
  name: string;
  type: 'unicode' | 'image';
  value: string; // unicode表情或图片路径
  category: 'emotion' | 'action' | 'object' | 'symbol';
}

// 默认表情包列表
export const defaultEmojis: Emoji[] = [
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

// 按类别获取表情包
export function getEmojisByCategory(category: string): Emoji[] {
  if (category === 'all') {
    return defaultEmojis;
  }
  return defaultEmojis.filter(emoji => emoji.category === category);
}

// 根据ID查找表情包
export function findEmojiById(id: string): Emoji | undefined {
  return defaultEmojis.find(emoji => emoji.id === id);
}

// 表情分类
export const emojiCategories = [
  { id: 'all', name: '全部' },
  { id: 'emotion', name: '表情' },
  { id: 'action', name: '动作' },
  { id: 'object', name: '物体' },
  { id: 'symbol', name: '符号' }
];

// 弹幕中的表情替换正则表达式
export const emojiRegex = /\[emoji:([a-zA-Z0-9_]+)\]/g;

// 将文本中的表情标记替换为实际表情
export function replaceEmojiPlaceholders(text: string): string {
  return text.replace(emojiRegex, (match, emojiId) => {
    const emoji = findEmojiById(emojiId);
    return emoji ? emoji.value : match;
  });
}

// 将表情转换为标记格式
export function emojiToPlaceholder(emojiId: string): string {
  return `[emoji:${emojiId}]`;
}