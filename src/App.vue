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

        <!-- Right: Debug info, Voice Toggle and Timer -->
        <div class="header-right">
          <!-- Voice Mode Toggle (only in roleplay) -->
          <button 
            v-if="phase === 'roleplay'"
            @click="toggleVoiceMode"
            :class="['voice-toggle', { active: voiceMode }]"
            title="Mode vocal"
          >
            {{ voiceMode ? '🎙️' : '🔇' }}
          </button>
          <!-- Debug Info -->
          <div class="debug-info">
            <div class="prompt-files">
              <small>Prompts: brief.js | roleplay.js | debrief.js</small>
            </div>
            <button @click="copyConversationToClipboard" class="debug-button" title="Copier la conversation en markdown">
              📋 Debug
            </button>
          </div>
          
          <!-- Chronometer (only in roleplay phase) -->
          <div v-if="phase === 'roleplay'" class="timer">
            ⏱️ {{ formatTime(timeElapsed) }}
          </div>
        </div>
      </div>
    </header>

    <!-- Messages Area -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="message in messages"
        :key="message.id"
        :class="['message', message.role, message.source, { 'off-topic': message.isOffTopic }]"
      >
        <div class="message-avatar">
          {{ message.role === 'user' ? 'U' : getAssistantAvatar(message.source) }}
        </div>
        <div class="message-content">
          {{ message.content }}
        </div>
        <!-- Coach button for Thomas messages -->
        <!-- Removed lastResponse reference - will be implemented later -->
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

    <!-- Voice Controls (only in voice mode) -->
    <div v-if="voiceMode" class="voice-controls">
      <div class="voice-status">
        <div class="voice-indicators">
          <div :class="['voice-indicator', { active: voiceChat.isListening }]">
            <span class="indicator-icon">🎤</span>
            <span class="indicator-text">{{ voiceChat.isListening ? 'Écoute...' : 'En attente' }}</span>
          </div>
          
          <div :class="['voice-indicator', { active: voiceChat.isSpeaking }]">
            <span class="indicator-icon">🔊</span>
            <span class="indicator-text">{{ voiceChat.isSpeaking ? 'Thomas parle...' : 'Silencieux' }}</span>
          </div>
          
          <div v-if="voiceChat.isProcessingAudio" class="voice-indicator active">
            <span class="indicator-icon">⚡</span>
            <span class="indicator-text">Traitement...</span>
          </div>
        </div>
        
        <!-- Live transcription -->
        <div v-if="voiceChat.currentTranscription" class="live-transcription">
          <span class="transcription-label">Transcription :</span>
          <span class="transcription-text">{{ voiceChat.currentTranscription }}</span>
        </div>
      </div>
      
      <!-- Voice control buttons -->
      <div class="voice-buttons">
        <button 
          @click="voiceChat.toggleListening"
          :class="['voice-btn', 'mic-btn', { 
            active: voiceChat.isListening, 
            disabled: voiceChat.isSpeaking 
          }]"
          :disabled="voiceChat.isSpeaking"
          title="Démarrer/Arrêter l'écoute"
        >
          {{ voiceChat.isListening ? '🔴' : '🎤' }}
          {{ voiceChat.isListening ? 'Arrêter' : 'Parler' }}
        </button>
        
        <button 
          @click="voiceChat.handleUserInterruption"
          :class="['voice-btn', 'interrupt-btn']"
          :disabled="!voiceChat.isSpeaking"
          title="Interrompre Thomas"
        >
          ✋ Interrompre
        </button>
        
        <button 
          @click="toggleVoiceMode"
          class="voice-btn text-btn"
          title="Retour au mode texte"
        >
          💬 Mode Texte
        </button>
      </div>
    </div>

    <!-- Input Area -->
    <div class="input-container" :class="{ 'voice-mode': voiceMode }">
      <form @submit.prevent="sendMessage" class="input-form">
        <!-- Action Button (left side) -->
        <button
          v-if="phase === 'brief' && canStartExercise"
          @click="startExercise"
          type="button"
          class="action-button primary"
        >
          🎭 Commencer l'exercice
        </button>
        
        <button
          v-if="phase === 'roleplay'"
          @click="endExercise"
          type="button"
          class="action-button secondary"
        >
          ⏹️ Arrêter l'exercice
        </button>
        
        <button
          v-if="phase === 'debrief'"
          @click="resetExercise"
          type="button"
          class="action-button primary"
        >
          🔄 Recommencer l'exercice
        </button>

        <textarea
          v-if="!voiceMode"
          v-model="currentMessage"
          @keydown.enter.exact.prevent="sendMessage"
          @keydown.enter.shift.exact="addNewLine"
          :placeholder="getInputPlaceholder()"
          class="message-input"
          :disabled="isTyping"
          ref="messageInput"
          rows="1"
        ></textarea>
        
        <!-- Voice mode placeholder -->
        <div v-if="voiceMode" class="voice-input-placeholder">
          <span class="voice-placeholder-text">
            {{ getVoicePlaceholder() }}
          </span>
        </div>
        <button
          v-if="!voiceMode"
          type="submit"
          class="send-button"
          :disabled="!currentMessage.trim() || isTyping"
        >
          ↑
        </button>
      </form>
    </div>
  </div>
  <!-- Modales -->
  <Modal 
    v-model="modals.alert.visible"
    :title="modals.alert.title"
    :message="modals.alert.message"
    :icon="modals.alert.icon"
    @confirm="modals.alert.onConfirm"
  />
  
  <Modal 
    v-model="modals.confirm.visible"
    :title="modals.confirm.title"
    :message="modals.confirm.message"
    :icon="modals.confirm.icon"
    :show-cancel="true"
    @confirm="modals.confirm.onConfirm"
    @cancel="modals.confirm.onCancel"
  />
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useChatbot } from './composables/useChatbot.js'
import { useVoiceChat } from './composables/useVoiceChat.js'
import { useModal } from './composables/useModal.js'
import Modal from './components/Modal.vue'

// Use the chatbot composable
const {
  messages,
  isTyping,
  phase,
  timeElapsed,
  scores,
  canStartExercise,
  startExercise,
  endExercise,
  resetExercise,
  sendMessage: sendChatMessage,
  voiceMode,
  voiceChat,
  toggleVoiceMode
} = useChatbot()

const {
  modals,
  showCopySuccess,
  showCoachFeedback
} = useModal()

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
const scrollToBottom = (ensureTypingVisible = false) => {
  nextTick(() => {
    if (messagesContainer.value) {
      if (ensureTypingVisible) {
        // When typing indicator is shown, scroll with some margin to ensure it's fully visible
        const container = messagesContainer.value
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight
        const margin = 80 // Add margin to ensure typing indicator is fully visible
        container.scrollTop = Math.max(0, scrollHeight - clientHeight + margin)
      } else {
        messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
      }
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

const getVoicePlaceholder = () => {
  if (voiceChat.isSpeaking.value) {
    return '🔊 Thomas parle... Cliquez sur "Interrompre" si nécessaire'
  }
  if (voiceChat.isListening.value) {
    return '🎤 Parlez maintenant... (mode vocal actif)'
  }
  if (voiceChat.isProcessingAudio.value) {
    return '⚡ Traitement en cours...'
  }
  
  switch (phase.value) {
    case 'brief':
      return '🎙️ Cliquez sur "Parler" pour poser vos questions'
    case 'roleplay':
      return '🎭 Cliquez sur "Parler" pour répondre à Thomas'
    case 'debrief':
      return '📊 Cliquez sur "Parler" pour partager vos réflexions'
    default:
      return '🎙️ Mode vocal - Cliquez sur "Parler" pour commencer'
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

// Copy conversation to clipboard for debugging
const copyConversation = async () => {
  const markdown = messages.value
    .filter(msg => msg.role !== 'system')
    .map(msg => {
      const role = msg.role === 'user' ? '**Vous**' : '**Thomas**'
      return `${role}: ${msg.content}`
    })
    .join('\n\n')
  
  try {
    await navigator.clipboard.writeText(markdown)
    showCopySuccess()
  } catch (err) {
    console.error('Erreur copie:', err)
    // Fallback: créer un textarea temporaire
    const textarea = document.createElement('textarea')
    textarea.value = markdown
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    showCopySuccess(true)
  }
}

// Get current prompt filename for debug
const getPromptFileName = () => {
  switch (phase.value) {
    case 'brief': return 'brief.js'
    case 'roleplay': return 'roleplay.js'
    case 'debrief': return 'debrief.js'
    default: return 'default.js'
  }
}

// Show coach feedback in modal
const showCoachFeedbackModal = (feedback) => {
  showCoachFeedback(feedback)
}

// Send message function
const sendMessage = async () => {
  if (voiceMode.value) {
    // In voice mode, this shouldn't be called from form submit
    return
  }
  
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

// Watch for typing state changes to ensure proper scrolling
watch(isTyping, (newTyping) => {
  if (newTyping) {
    // When typing starts, ensure the typing indicator is fully visible
    setTimeout(() => scrollToBottom(true), 100)
  } else {
    // When typing ends, scroll to show the new message
    setTimeout(() => scrollToBottom(), 100)
  }
})

// Watch for new messages to auto-scroll
watch(messages, () => {
  nextTick(() => scrollToBottom())
}, { deep: true })

// Watch for textarea changes to auto-resize
const handleInput = () => {
  autoResizeTextarea()
}

// Focus input on mount
onMounted(() => {
  messageInput.value && messageInput.value.focus()
})
</script>
