<template>
  <ion-header>
    <ion-toolbar>
      <ion-title>AI Assistant</ion-title>
      <ion-buttons slot="end">
        <ion-button @click="closeModal">
          <ion-icon slot="icon-only" :icon="closeOutline" />
        </ion-button>
      </ion-buttons>
    </ion-toolbar>
  </ion-header>

  <ion-content class="ion-padding" ref="contentRef">
    <div class="chat-container">
      <div v-for="m in messages" :key="m.id" :class="['message', m.role === 'user' ? 'message-user' : 'message-ai']">
        <div class="message-content" v-html="renderMarkdown(m.content)"></div>
      </div>
    </div>
  </ion-content>

  <ion-footer>
    <ion-toolbar>
      <form @submit.prevent="handleFormSubmit">
        <ion-item lines="none" class="input-item">
          <ion-input v-model="input" placeholder="Ask something..." :disabled="isLoading" @keydown.enter.prevent="handleEnterKey"></ion-input>
          <ion-button type="submit" slot="end" :disabled="isLoading || !input.trim()" fill="clear">
            <ion-icon slot="icon-only" :icon="send" />
          </ion-button>
        </ion-item>
      </form>
    </ion-toolbar>
  </ion-footer>
</template>

<script setup lang="ts">
import { 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonItem, 
  IonInput, 
  IonButton, 
  IonButtons,
  IonIcon,

  modalController
} from '@ionic/vue';
import { ref, onMounted, nextTick } from 'vue';
import { closeOutline, send } from 'ionicons/icons';
import { marked } from 'marked';
import { OrderService } from '@/services/OrderService';
import { translate } from '@hotwax/dxp-components';

// eslint-disable-next-line no-undef
const props = defineProps<{
  initialMessage?: string;
  shipmentId?: string;
}>();

const messages = ref<Array<{ id: string; role: 'user' | 'assistant'; content: string }>>([]);
const input = ref('');
const isLoading = ref(false);
const contentRef = ref();

const closeModal = () => {
  modalController.dismiss();
};

const renderMarkdown = (text: string) => {
  return marked.parse(text);
};

const scrollToBottom = () => {
  nextTick(() => {
    contentRef.value?.$el.scrollToBottom(300);
  });
};

const handleEnterKey = (ev: KeyboardEvent) => {
  if (ev.key === 'Enter' && !ev.shiftKey) {
    handleFormSubmit();
  }
}

const processMessage = async () => {
  isLoading.value = true;
  try {
    const response = await fetch('/api/mastra/agents/fulfillmentAgent/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.value.map(m => m.content),
      }),
    });

    if (!response.ok) throw new Error('Failed to send message');

    const data = await response.json();
    
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: data.text || 'No response from agent'
    };
    
    messages.value.push(assistantMessage);
    scrollToBottom();
  } catch (error) {
    console.error('Chat error:', error);
    messages.value.push({
      id: Date.now().toString(),
      role: 'assistant',
      content: 'Sorry, I encountered an error. Please try again.'
    });
    scrollToBottom();
  } finally {
    isLoading.value = false;
  }
}

const handleFormSubmit = async () => {
  if (!input.value.trim()) return;

  const userMessage = {
    id: Date.now().toString(),
    role: 'user' as const,
    content: input.value
  };

  messages.value.push(userMessage);
  input.value = '';
  scrollToBottom();
  await processMessage();
}


onMounted(async () => {
  if (props.shipmentId) {
    const shipmentLabelErrorMessage = await OrderService.fetchShipmentLabelError(props.shipmentId);
    const message = `I am facing a shipping label error for shipment ID: ${props.shipmentId}. Error message: "${shipmentLabelErrorMessage}". Can you help me resolve this?`;
    
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: message
    });
    // Wait for initial render then scroll
    setTimeout(() => scrollToBottom(), 100); 
    await processMessage();
  } else if (props.initialMessage) {
    messages.value.push({
      id: Date.now().toString(),
      role: 'user',
      content: props.initialMessage
    });
    // Wait for initial render then scroll
    setTimeout(() => scrollToBottom(), 100); 
    await processMessage();
  }
});
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding-bottom: 20px;
}

.message {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 12px;
  line-height: 1.4;
  font-size: 0.9rem;
  word-wrap: break-word;
}

.message-user {
  align-self: flex-end;
  background-color: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  border-bottom-right-radius: 2px;
}

.message-ai {
  align-self: flex-start;
  background-color: var(--ion-color-light);
  color: var(--ion-text-color);
  border-bottom-left-radius: 2px;
}

/* Markdown Styles within AI messages */
.message-ai :deep(p) {
  margin: 0 0 8px 0;
}

.message-ai :deep(p:last-child) {
  margin-bottom: 0;
}

.message-ai :deep(code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.85em;
}

.message-ai :deep(pre) {
  background-color: #1e1e1e;
  color: #fff;
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
  margin: 8px 0;
  font-size: 0.85em;
}

.message-ai :deep(pre code) {
  background-color: transparent;
  padding: 0;
}

.message-ai :deep(ul), .message-ai :deep(ol) {
  padding-left: 18px;
  margin: 8px 0;
}

.input-item {
  --background: var(--ion-color-light);
  --border-radius: 20px;
  margin: 8px;
  border-radius: 20px;
}
</style>
