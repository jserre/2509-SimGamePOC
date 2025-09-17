<template>
  <div v-if="isVisible" class="modal-overlay" @click="handleOverlayClick">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">{{ title }}</h3>
        <button class="modal-close" @click="close" aria-label="Fermer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="modal-body">
        <div v-if="icon" class="modal-icon">{{ icon }}</div>
        <div class="modal-content">
          <p v-if="message" class="modal-message">{{ message }}</p>
          <slot></slot>
        </div>
      </div>
      
      <div class="modal-footer" v-if="showButtons">
        <button 
          v-if="showCancel" 
          class="modal-btn modal-btn-secondary" 
          @click="handleCancel"
        >
          {{ cancelText }}
        </button>
        <button 
          class="modal-btn modal-btn-primary" 
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    default: 'Information'
  },
  message: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: ''
  },
  confirmText: {
    type: String,
    default: 'OK'
  },
  cancelText: {
    type: String,
    default: 'Annuler'
  },
  showCancel: {
    type: Boolean,
    default: false
  },
  showButtons: {
    type: Boolean,
    default: true
  },
  closeOnOverlay: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'confirm', 'cancel', 'close'])

const isVisible = ref(props.modelValue)

watch(() => props.modelValue, (newValue) => {
  isVisible.value = newValue
})

const close = () => {
  isVisible.value = false
  emit('update:modelValue', false)
  emit('close')
}

const handleConfirm = () => {
  emit('confirm')
  close()
}

const handleCancel = () => {
  emit('cancel')
  close()
}

const handleOverlayClick = () => {
  if (props.closeOnOverlay) {
    close()
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-20px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 6px;
  color: #6b7280;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #374151;
}

.modal-body {
  padding: 20px 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.modal-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.modal-content {
  flex: 1;
}

.modal-message {
  color: #374151;
  line-height: 1.6;
  margin: 0;
  white-space: pre-line;
}

.modal-footer {
  padding: 16px 24px 24px;
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
  font-size: 0.95rem;
}

.modal-btn-primary {
  background: #3b82f6;
  color: white;
}

.modal-btn-primary:hover {
  background: #2563eb;
}

.modal-btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.modal-btn-secondary:hover {
  background: #e5e7eb;
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .modal-container {
    background: #1f2937;
    color: #f9fafb;
  }
  
  .modal-header {
    border-bottom-color: #374151;
  }
  
  .modal-title {
    color: #f9fafb;
  }
  
  .modal-close {
    color: #9ca3af;
  }
  
  .modal-close:hover {
    background: #374151;
    color: #d1d5db;
  }
  
  .modal-message {
    color: #d1d5db;
  }
  
  .modal-footer {
    border-top-color: #374151;
  }
  
  .modal-btn-secondary {
    background: #374151;
    color: #d1d5db;
    border-color: #4b5563;
  }
  
  .modal-btn-secondary:hover {
    background: #4b5563;
  }
}
</style>
