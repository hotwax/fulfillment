<template>
  <ion-header>
    <ion-toolbar>
      <ion-buttons slot="start">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
      <ion-title>{{ translate('AI Assistant') }}</ion-title>
    </ion-toolbar>
  </ion-header>
  <ion-content ref="contentRef" class="ion-padding chat-content">
    <div class="messages">
      <div v-for="(msg, index) in messages" :key="index" :class="['message-wrapper', msg.role]">
        <div class="bubble">
          {{ msg.content }}
        </div>
      </div>
      <div v-if="isLoading && !lastMessageContent" class="message-wrapper assistant">
        <div class="bubble">
          <ion-spinner name="dots" />
        </div>
      </div>
    </div>
  </ion-content>
  <ion-footer>
    <ion-toolbar>
      <ion-item lines="none">
        <ion-input
          :placeholder="translate('Ask about orders or inventory...')"
          v-model="input"
          @keyup.enter="sendMessage"
        ></ion-input>
        <ion-button slot="end" fill="clear" @click="sendMessage" :disabled="!input.trim() || isLoading">
          <ion-icon slot="icon-only" :icon="sendOutline" />
        </ion-button>
      </ion-item>
    </ion-toolbar>
  </ion-footer>
</template>

<script lang="ts">
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonSpinner,
  IonTitle,
  IonToolbar,
  modalController
} from '@ionic/vue';
import { defineComponent, ref, nextTick, computed } from 'vue';
import { closeOutline, sendOutline } from 'ionicons/icons';
import { translate } from '@hotwax/dxp-components';
import { streamWithAgent } from '@/services/ai/agent';

export default defineComponent({
  name: 'AiChatModal',
  components: {
    IonButton,
    IonButtons,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonInput,
    IonItem,
    IonSpinner,
    IonTitle,
    IonToolbar
  },
  setup() {
    const messages = ref<Array<{ role: 'user' | 'assistant', content: string }>>([]);
    const input = ref('');
    const isLoading = ref(false);
    const contentRef = ref<any>(null);

    const closeModal = () => {
      modalController.dismiss();
    };

    const scrollToBottom = async () => {
      await nextTick();
      if (contentRef.value) {
        console.log('contentRef', contentRef.value);
        const el = await contentRef.value.$el.getScrollElement();
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    };

    const sendMessage = async () => {
      if (!input.value.trim() || isLoading.value) return;

      const userMessage = input.value.trim();
      messages.value.push({ role: 'user', content: userMessage });
      input.value = '';
      isLoading.value = true;
      await scrollToBottom();

      try {
        // Map roles for Gemini (user/assistant -> user/model if needed, but SDK usually handles assistant)
        const history = messages.value.map(m => ({
          role: m.role,
          content: m.content
        }));

        const result = await streamWithAgent(history);

        // Add placeholder assistant message and keep track of its index for reactive updates
        const assistantMessageIndex = messages.value.push({ role: 'assistant', content: '' }) - 1;
        await scrollToBottom();

        for await (const part of result.fullStream) {
          if (part.type === 'text-delta') {
            messages.value[assistantMessageIndex].content += part.text;
            await scrollToBottom();
          } else if (part.type === 'tool-call') {
            messages.value[assistantMessageIndex].content += `\n*[Thinking: Fetching ${part.toolName}...]*\n`;
            await scrollToBottom();
          } else if (part.type === 'tool-result') {
            messages.value[assistantMessageIndex].content += `\n*[Result received, summarizing...]*\n`;
            await scrollToBottom();
          } else if (part.type === 'error') {
            messages.value[assistantMessageIndex].content = 'Failed to help you at this moment, please try after some time.';
            await scrollToBottom();
            break; // Stop processing on error
          }
        }
      } catch (err) {
        console.error('Chat failed', err);
        messages.value.push({ 
          role: 'assistant', 
          content: 'Failed to help you at this moment, please try after some time.' 
        });
      } finally {
        isLoading.value = false;
        await scrollToBottom();
      }
    };

    return {
      closeOutline,
      closeModal,
      contentRef,
      input,
      isLoading,
      messages,
      sendMessage,
      sendOutline,
      translate
    };
  }
});
</script>

<style scoped>
.chat-content {
  --background: var(--ion-color-light);
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-wrapper {
  display: flex;
  width: 100%;
}

.user {
  justify-content: flex-end;
}

.assistant {
  justify-content: flex-start;
}

.bubble {
  padding: 12px 16px;
  border-radius: 18px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.4;
  white-space: pre-wrap;
}

.user .bubble {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-bottom-right-radius: 4px;
}

.assistant .bubble {
  background: white;
  color: var(--ion-color-dark);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}
</style>
