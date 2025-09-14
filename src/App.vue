<template>
  <div class="chatbot-container">
    <!-- Header -->
    <header class="chatbot-header">
      <div class="header-layout">
        <!-- Left: DESC Scores (compact, only in roleplay) -->
        <div class="header-left">
          <div v-if="phase === 'roleplay'" class="scores-compact">
            <div class="score-compact">
              <span class="score-label">D</span>
              <div class="score-bar-mini">
                <div class="score-fill" :style="{ width: (scores.decrire / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-num">{{ scores.decrire.toFixed(1) }}</span>
            </div>
            <div class="score-compact">
              <span class="score-label">E</span>
              <div class="score-bar-mini">
                <div class="score-fill" :style="{ width: (scores.exprimer / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-num">{{ scores.exprimer.toFixed(1) }}</span>
            </div>
            <div class="score-compact">
              <span class="score-label">S</span>
              <div class="score-bar-mini">
                <div class="score-fill" :style="{ width: (scores.specifier / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-num">{{ scores.specifier.toFixed(1) }}</span>
            </div>
            <div class="score-compact">
              <span class="score-label">C</span>
              <div class="score-bar-mini">
                <div class="score-fill" :style="{ width: (scores.conclure / 5 * 100) + '%' }"></div>
              </div>
              <span class="score-num">{{ scores.conclure.toFixed(1) }}</span>
            </div>
          </div>
        </div>

        <!-- Center: Title -->
        <div class="header-center">
          <h1>{{ getHeaderTitle() }}</h1>
          <p>{{ getHeaderSubtitle() }}</p>
        </div>

        <!-- Right: Timer (only in roleplay phase) -->
        <div class="header-right">
          <div v-if="phase === 'roleplay'" class="timer">
            ⏱️ {{ formatTime(timeLeft) }}
          </div>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role, message.source]"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? 'U' : getAssistantAvatar(message.source) }}
        </div>
        <div class="message-content">
          {{ message.content }}
        </div>
      </div>

      <!-- Typing Indicator -->
      <div v-if="isTyping" class="message assistant">
        <div class="message-avatar">A</div>
        <div class="message-content typing-indicator">
          <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="phase === 'brief' && canStartExercise" class="action-container">
      <button @click="startExercise" class="action-button primary">
        🎭 Commencer l'exercice
      </button>
    </div>
    
    <div v-if="phase === 'roleplay'" class="action-container">
      <button @click="endExercise" class="action-button secondary">
        ⏹️ Terminer l'exercice
      </button>
    </div>

    <!-- Input Area -->
    <div class="input-container">
      <form @submit.prevent="sendMessage" class="input-form">
        <textarea
          v-model="currentMessage"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="addNewLine"
          :placeholder="getInputPlaceholder()"
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
import { useChatbot } from './composables/useChatbot.js'

// Use the chatbot composable
const {
  messages,
  isTyping,
  phase,
  timeLeft,
  scores,
  canStartExercise,
  startExercise,
  endExercise,
  sendMessage: sendChatMessage
} = useChatbot()

const currentMessage = ref('')
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

// Helper functions for dynamic content
const getHeaderTitle = () => {
  switch (phase.value) {
    case 'brief':
      return 'Chatbot Trainer - Briefing'
    case 'roleplay':
      return '🎭 Exercice en cours'
    case 'debrief':
      return '📊 Analyse & Débrief'
    default:
      return 'Chatbot Trainer'
  }
}

const getHeaderSubtitle = () => {
  switch (phase.value) {
    case 'brief':
      return 'Préparation de votre exercice DESC'
    case 'roleplay':
      return 'Conversation avec Thomas'
    case 'debrief':
      return 'Bilan de votre performance'
    default:
      return 'Démonstrateur d\'entraînement à la communication'
  }
}

const getInputPlaceholder = () => {
  switch (phase.value) {
    case 'brief':
      return 'Posez vos questions sur l\'exercice...'
    case 'roleplay':
      return 'Répondez à Thomas en utilisant la méthode DESC...'
    case 'debrief':
      return 'Partagez vos réflexions sur l\'exercice...'
    default:
      return 'Tapez votre message ici...'
  }
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const getAssistantAvatar = (source) => {
  switch (source) {
    case 'ai':
      return '🤖'
    case 'mock':
      return 'A'
    default:
      return 'A'
  }
}

// Send message function
const sendMessage = async () => {
  const message = currentMessage.value.trim()
  if (!message || isTyping.value) return

  // Use the composable's sendMessage method
  await sendChatMessage(message)
  currentMessage.value = ''

  // Reset textarea height
  if (messageInput.value) {
    messageInput.value.style.height = 'auto'
  }

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
