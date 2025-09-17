import { ref, reactive } from 'vue'

// État global des modales
const modals = reactive({
  alert: {
    visible: false,
    title: '',
    message: '',
    icon: '',
    onConfirm: null
  },
  confirm: {
    visible: false,
    title: '',
    message: '',
    icon: '',
    onConfirm: null,
    onCancel: null
  }
})

export function useModal() {
  
  /**
   * Affiche une modale d'alerte (remplace alert())
   */
  const showAlert = (message, options = {}) => {
    return new Promise((resolve) => {
      modals.alert.visible = true
      modals.alert.title = options.title || 'Information'
      modals.alert.message = message
      modals.alert.icon = options.icon || '💡'
      modals.alert.onConfirm = () => {
        modals.alert.visible = false
        resolve(true)
      }
    })
  }

  /**
   * Affiche une modale de confirmation (remplace confirm())
   */
  const showConfirm = (message, options = {}) => {
    return new Promise((resolve) => {
      modals.confirm.visible = true
      modals.confirm.title = options.title || 'Confirmation'
      modals.confirm.message = message
      modals.confirm.icon = options.icon || '❓'
      modals.confirm.onConfirm = () => {
        modals.confirm.visible = false
        resolve(true)
      }
      modals.confirm.onCancel = () => {
        modals.confirm.visible = false
        resolve(false)
      }
    })
  }

  /**
   * Ferme toutes les modales
   */
  const closeAllModals = () => {
    modals.alert.visible = false
    modals.confirm.visible = false
  }

  /**
   * Modales spécialisées pour l'app
   */
  const showTimeWarning = () => {
    return showAlert(
      "⏰ Normalement l'exercice devrait être terminé.\n\nCliquez sur \"Arrêter l'exercice\" quand vous voulez pour passer à l'étape de debrief !",
      {
        title: 'Temps écoulé',
        icon: '⏰'
      }
    )
  }

  const showVoiceError = (support) => {
    const sttStatus = support.stt ? '✅' : '❌'
    const ttsStatus = support.tts ? '✅' : '❌'
    
    return showAlert(
      `⚠️ Fonctionnalités vocales non disponibles\n\nSTT: ${sttStatus}\nTTS: ${ttsStatus}`,
      {
        title: 'Erreur vocale',
        icon: '⚠️'
      }
    )
  }

  const showCopySuccess = (fallback = false) => {
    const message = fallback 
      ? 'Conversation copiée (fallback) !'
      : 'Conversation copiée dans le presse-papiers !'
    
    return showAlert(message, {
      title: 'Succès',
      icon: '✅'
    })
  }

  const showCoachFeedback = (feedback) => {
    return showAlert(feedback, {
      title: '🎯 Conseil du Coach',
      icon: '🎯'
    })
  }

  return {
    modals,
    showAlert,
    showConfirm,
    closeAllModals,
    // Modales spécialisées
    showTimeWarning,
    showVoiceError,
    showCopySuccess,
    showCoachFeedback
  }
}
