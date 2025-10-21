<template>
  <div class="emoji-selector">
    <div class="emoji-tabs">
      <button
        v-for="category in emojiCategories"
        :key="category.id"
        :class="['tab-btn', { active: activeCategory === category.id }]"
        @click="() => activeCategory = category.id"
      >
        {{ category.name }}
      </button>
    </div>
    <div class="emoji-grid">
      <button
        v-for="emoji in (filteredEmojis as Emoji[])"
        :key="emoji.id"
        class="emoji-item"
        :title="emoji.name"
        @click="selectEmoji(emoji)"
      >
        <span v-if="emoji.type === 'unicode'" class="unicode-emoji">
          {{ emoji.value }}
        </span>
        <img
          v-else
          :src="emoji.value"
          :alt="emoji.name"
          class="image-emoji"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { emojiCategories, getEmojisByCategory, Emoji, emojiToPlaceholder } from '../utils/emojis';

const emit = defineEmits<{
  selectEmoji: [emoji: Emoji];
  insertPlaceholder: [placeholder: string];
}>();

const activeCategory = ref('all');

// 计算属性：根据当前选中的分类过滤表情
const filteredEmojis = computed((): Emoji[] => {
  return getEmojisByCategory(activeCategory.value) as Emoji[];
});

const selectEmoji = (emoji: Emoji) => {
  emit('selectEmoji', emoji);
  emit('insertPlaceholder', emojiToPlaceholder(emoji.id));
};
</script>

<style scoped>
.emoji-selector {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  width: 320px;
  max-height: 300px;
  display: flex;
  flex-direction: column;
}

.emoji-tabs {
  display: flex;
  background: #f5f5f5;
  border-bottom: 1px solid #e0e0e0;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.2s;
}

.tab-btn:hover {
  background: #e8e8e8;
}

.tab-btn.active {
  background: #fff;
  color: #1890ff;
  border-bottom: 2px solid #1890ff;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 4px;
  padding: 8px;
  overflow-y: auto;
  flex: 1;
}

.emoji-item {
  background: none;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  padding: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.emoji-item:hover {
  background: #f0f0f0;
  border-color: #d9d9d9;
}

.unicode-emoji {
  font-size: 24px;
  line-height: 1;
}

.image-emoji {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .emoji-selector {
    width: 100%;
    max-width: 320px;
  }
}
</style>