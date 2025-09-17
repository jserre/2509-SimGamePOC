import { ref, reactive } from 'vue'

/**
 * Composable for managing voice chat functionality with STT/TTS
 * Handles speech recognition, text-to-speech with ElevenLabs, and voice interruptions
 */
export function useVoiceChat() {
  // Voice states
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const isProcessingAudio = ref(false)
  const currentTranscription = ref('')
  const currentAudio = ref(null)
  const speechRecognition = ref(null)

  // Configuration ElevenLabs
  const elevenLabsConfig = reactive({
    apiKey: import.meta.env.VITE_ELEVENLABS_API_KEY,
    baseUrl: 'https://api.elevenlabs.io/v1',
    model: 'eleven_turbo_v2', // Le plus rapide pour temps réel
    chunkSize: 1024 // Pour le streaming
  })

  // Configuration des voix par personnage
  const voiceConfig = {
    thomas: {
      voiceId: "pNInz6obpgDQGcFmaJgB", // Adam - masculin, décontracté
      emotions: {
        defensive: { stability: 0.3, similarity_boost: 0.8, style: 0.2 },
        casual: { stability: 0.7, similarity_boost: 0.5, style: 0.0 },
        apologetic: { stability: 0.5, similarity_boost: 0.7, style: 0.1 },
        frustrated: { stability: 0.2, similarity_boost: 0.9, style: 0.3 }
      }
    },
    coach: {
      voiceId: "21m00Tcm4TlvDq8ikWAM", // Rachel - féminin, professionnel
      emotions: {
        encouraging: { stability: 0.8, similarity_boost: 0.6, style: 0.0 },
        analytical: { stability: 0.9, similarity_boost: 0.4, style: 0.0 },
        supportive: { stability: 0.7, similarity_boost: 0.7, style: 0.1 }
      }
    },
    system: {
      voiceId: "EXAVITQu4vr4xnSDxMaL", // Bella - neutre, claire
      emotions: {
        neutral: { stability: 0.9, similarity_boost: 0.5, style: 0.0 },
        informative: { stability: 0.8, similarity_boost: 0.6, style: 0.0 }
      }
    }
  }

  // Callbacks pour les événements
  const onTranscriptionUpdate = ref(null)
  const onSpeechEnd = ref(null)
  const onSpeakingStart = ref(null)
  const onSpeakingEnd = ref(null)

  /**
   * Démarre l'écoute vocale avec Web Speech API
   */
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('Speech Recognition non supporté dans ce navigateur')
      return false
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      speechRecognition.value = new SpeechRecognition()
      
      speechRecognition.value.continuous = true
      speechRecognition.value.interimResults = true
      speechRecognition.value.lang = 'fr-FR'
      speechRecognition.value.maxAlternatives = 1

      speechRecognition.value.onstart = () => {
        isListening.value = true
        console.log('🎤 Écoute démarrée')
      }

      speechRecognition.value.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // Mise à jour de la transcription en cours
        currentTranscription.value = interimTranscript || finalTranscript

        // Callback pour transcription mise à jour
        if (onTranscriptionUpdate.value) {
          onTranscriptionUpdate.value(currentTranscription.value, !interimTranscript)
        }

        // Si transcription finale, déclencher l'événement
        if (finalTranscript && onSpeechEnd.value) {
          console.log('🗣️ TRANSCRIPTION FINALE:', finalTranscript)
          onSpeechEnd.value(finalTranscript.trim())
        }
      }

      speechRecognition.value.onerror = (event) => {
        console.error('❌ Erreur reconnaissance vocale:', event.error)
        isListening.value = false
      }

      speechRecognition.value.onend = () => {
        console.log('🔇 Reconnaissance vocale terminée')
        isListening.value = false
      }

      speechRecognition.value.start()
      console.log('🎤 ÉCOUTE DÉMARRÉE - Parlez maintenant!')
      console.log('📋 État vocal:', {
        listening: isListening.value,
        speaking: isSpeaking.value,
        processing: isProcessingAudio.value
      })
      return true
    } catch (error) {
      console.error('❌ Erreur démarrage écoute:', error)
      isListening.value = false
      return false
    }
  }

  /**
   * Arrête l'écoute vocale
   */
  const stopListening = () => {
    if (speechRecognition.value && isListening.value) {
      speechRecognition.value.stop()
      isListening.value = false
      console.log('🔇 ÉCOUTE ARRÊTÉE')
      console.log('📋 État vocal:', {
        listening: isListening.value,
        speaking: isSpeaking.value,
        processing: isProcessingAudio.value
      })
    }
  }

  /**
   * Convertit le texte en parole avec ElevenLabs
   */
  const speakText = async (text, character = 'thomas', emotion = 'casual') => {
    if (!text.trim() || !elevenLabsConfig.apiKey) {
      console.warn('Texte vide ou clé API ElevenLabs manquante')
      return false
    }

    const voice = voiceConfig[character]
    if (!voice) {
      console.error(`Personnage vocal inconnu: ${character}`)
      return false
    }

    const emotionSettings = voice.emotions[emotion] || voice.emotions.casual || voice.emotions.neutral
    
    try {
      // Arrêter l'audio précédent AVANT de commencer le nouveau
      if (currentAudio.value) {
        currentAudio.value.pause()
        currentAudio.value.currentTime = 0
        currentAudio.value = null
      }
      
      isSpeaking.value = true
      isProcessingAudio.value = true
      
      if (onSpeakingStart.value) {
        onSpeakingStart.value(character, emotion)
      }

      console.log(`🔊 Synthèse vocale: ${character} (${emotion})`)

      const response = await fetch(`${elevenLabsConfig.baseUrl}/text-to-speech/${voice.voiceId}/stream`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': elevenLabsConfig.apiKey
        },
        body: JSON.stringify({
          text: text.trim(),
          model_id: elevenLabsConfig.model,
          voice_settings: {
            stability: emotionSettings.stability,
            similarity_boost: emotionSettings.similarity_boost,
            style: emotionSettings.style || 0.0,
            use_speaker_boost: true
          },
          output_format: "mp3_44100_128"
        })
      })

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error(`Rate limit ElevenLabs atteint. Attendez quelques secondes.`)
        }
        throw new Error(`Erreur ElevenLabs: ${response.status} - ${response.statusText}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      
      currentAudio.value = new Audio(audioUrl)
      isProcessingAudio.value = false

      // Promise pour gérer la lecture de façon propre
      return new Promise((resolve, reject) => {
        currentAudio.value.onloadeddata = () => {
          console.log('🎵 Audio chargé, lecture en cours...')
        }

        currentAudio.value.onended = () => {
          isSpeaking.value = false
          URL.revokeObjectURL(audioUrl)
          currentAudio.value = null
          
          if (onSpeakingEnd.value) {
            onSpeakingEnd.value(character, emotion)
          }
          
          console.log('🔇 Lecture terminée')
          resolve(true)
        }

        currentAudio.value.onerror = (error) => {
          console.error('Erreur lecture audio:', error)
          isSpeaking.value = false
          isProcessingAudio.value = false
          URL.revokeObjectURL(audioUrl)
          currentAudio.value = null
          reject(error)
        }

        // Gestion des interruptions
        currentAudio.value.onpause = () => {
          if (isSpeaking.value) {
            // Audio interrompu volontairement
            isSpeaking.value = false
            URL.revokeObjectURL(audioUrl)
            currentAudio.value = null
            resolve(false)
          }
        }

        // Lancer la lecture
        currentAudio.value.play().catch((playError) => {
          if (playError.name === 'AbortError') {
            // Interruption normale, ne pas logger comme erreur
            console.log('🔇 Lecture interrompue')
            resolve(false)
          } else {
            console.error('Erreur play():', playError)
            reject(playError)
          }
        })
      })

    } catch (error) {
      console.error('Erreur TTS:', error)
      isSpeaking.value = false
      isProcessingAudio.value = false
      return false
    }
  }

  /**
   * Arrête immédiatement la synthèse vocale
   */
  const stopSpeaking = () => {
    if (currentAudio.value) {
      try {
        currentAudio.value.pause()
        currentAudio.value.currentTime = 0
        // Nettoyer les event listeners
        currentAudio.value.onended = null
        currentAudio.value.onerror = null
        currentAudio.value.onpause = null
        currentAudio.value = null
      } catch (e) {
        // Ignorer les erreurs de nettoyage
      }
    }
    isSpeaking.value = false
    isProcessingAudio.value = false
    console.log('⏹️ Synthèse vocale interrompue')
  }

  /**
   * Gère l'interruption utilisateur pendant que le bot parle
   */
  const handleUserInterruption = () => {
    if (isSpeaking.value) {
      stopSpeaking()
      // Reprendre l'écoute immédiatement après interruption
      setTimeout(() => {
        if (!isListening.value) {
          startListening()
        }
      }, 100)
      return true
    }
    return false
  }

  /**
   * Détecte l'émotion appropriée selon le contexte
   */
  const detectEmotionFromText = (text, character = 'thomas', phase = 'roleplay') => {
    const lowerText = text.toLowerCase()
    
    if (character === 'thomas' && phase === 'roleplay') {
      if (lowerText.includes('désolé') || lowerText.includes('excuse') || lowerText.includes('pardon')) {
        return 'apologetic'
      }
      if (lowerText.includes('pas grave') || lowerText.includes('rattrape') || lowerText.includes('important')) {
        return 'casual'
      }
      if (lowerText.includes('problème') || lowerText.includes('comprends pas') || lowerText.includes('pourquoi')) {
        return 'defensive'
      }
      if (lowerText.includes('énervé') || lowerText.includes('agacé') || lowerText.includes('stop')) {
        return 'frustrated'
      }
    }
    
    if (character === 'coach') {
      if (lowerText.includes('bien') || lowerText.includes('excellent') || lowerText.includes('bravo')) {
        return 'encouraging'
      }
      if (lowerText.includes('analyse') || lowerText.includes('score') || lowerText.includes('évaluation')) {
        return 'analytical'
      }
      return 'supportive'
    }
    
    return 'neutral'
  }

  /**
   * Vérifie si les APIs vocales sont disponibles
   */
  const checkVoiceSupport = () => {
    const sttSupport = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    const ttsSupport = !!elevenLabsConfig.apiKey
    
    return {
      stt: sttSupport,
      tts: ttsSupport,
      full: sttSupport && ttsSupport
    }
  }

  /**
   * Toggle l'écoute vocale
   */
  const toggleListening = () => {
    if (isListening.value) {
      stopListening()
    } else {
      startListening()
    }
  }

  return {
    // États
    isListening,
    isSpeaking,
    isProcessingAudio,
    currentTranscription,
    
    // Configuration
    voiceConfig,
    elevenLabsConfig,
    
    // Méthodes principales
    startListening,
    stopListening,
    toggleListening,
    speakText,
    stopSpeaking,
    handleUserInterruption,
    
    // Utilitaires
    detectEmotionFromText,
    checkVoiceSupport,
    
    // Callbacks
    onTranscriptionUpdate,
    onSpeechEnd,
    onSpeakingStart,
    onSpeakingEnd
  }
}
