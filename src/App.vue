<template>
  <div class="chatbot-container">
    <!-- Header -->
    <header class="chatbot-header">
      <h1>Chatbot Trainer</h1>
      <p>Démonstrateur d'entraînement à la communication</p>
    </header>

    <!-- Messages Area -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role]"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? 'U' : 'A' }}
        </div>
        <div class="message-content">
          {{ message.content }}
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="message assistant">
        <div class="message-avatar">A</div>
        <div class="message-content typing-indicator">
          <span>En train d'écrire</span>
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-container">
      <form @submit.prevent="sendMessage" class="input-form">
        <textarea
          v-model="currentMessage"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="addNewLine"
          placeholder="Tapez votre message ici..."
          class="message-input"
          :disabled="isTyping"
          ref="messageInput"
          rows="1"
        ></textarea>
        <button
          type="submit"
          class="send-button"
          :disabled="!currentMessage.trim() || isTyping"
        >
          ↑
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'

// Reactive state
const messages = ref([
  {
    id: 1,
    role: 'assistant',
    content: 'Bonjour ! Je suis votre assistant d\'entraînement à la communication. Comment puis-je vous aider aujourd\'hui ?'
  }
])

const currentMessage = ref('')
const isTyping = ref(false)
const messagesContainer = ref(null)
const messageInput = ref(null)

// Auto-resize textarea
const autoResizeTextarea = () => {
  const textarea = messageInput.value
  if (textarea) {
    textarea.style.height = 'auto'
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
  }
}

// Scroll to bottom of messages
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Add new line in textarea (Shift+Enter)
const addNewLine = () => {
  currentMessage.value += '\n'
  nextTick(autoResizeTextarea)
}

// Send message function
const sendMessage = async () => {
  const message = currentMessage.value.trim()
  if (!message || isTyping.value) return

  // Add user message
  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: message
  }
  messages.value.push(userMessage)
  currentMessage.value = ''

  // Reset textarea height
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }

  scrollToBottom()

  // Simulate AI response (replace with actual API call later)
  isTyping.value = true
  
  // Simulate typing delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
  
  // Generate mock response
  const responses = [
    "C'est une excellente question ! Pouvez-vous me donner plus de contexte ?",
    "Je comprends votre point de vue. Avez-vous envisagé cette approche différente ?",
    "Intéressant ! Cela me rappelle une situation similaire...",
    "Merci pour cette information. Comment vous sentez-vous par rapport à cette situation ?",
    "C'est un défi courant en communication. Voici quelques stratégies qui pourraient vous aider..."
  ]
  
  const assistantMessage = {
    id: Date.now() + 1,
    role: 'assistant',
    content: responses[Math.floor(Math.random() * responses.length)]
  }
  
  messages.value.push(assistantMessage)
  isTyping.value = false
  scrollToBottom()

  // Focus back to input
  nextTick(() => {
    messageInput.value && messageInput.value.focus()
  })
}

// Watch for textarea changes to auto-resize
const handleInput = () => {
  autoResizeTextarea()
}

// Focus input on mount
onMounted(() => {
  messageInput.value && messageInput.value.focus()
})
</script>
