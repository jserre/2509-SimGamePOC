import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import briefPrompt from '../../prompts/brief.js'
import roleplayPrompt from '../../prompts/roleplay.js'
import debriefPrompt from '../../prompts/debrief.js'
import { useVoiceChat } from './useVoiceChat.js'
import { useModal } from './useModal.js'

/**
 * Composable for managing chatbot functionality with DESC exercise phases
 * Handles messages, API calls, chat state, and exercise progression
 */
export function useChatbot() {
  // Exercise phases: 'brief' | 'roleplay' | 'debrief'
  const phase = ref('brief')
  
  // Voice chat integration
  const voiceChat = useVoiceChat()
  const voiceMode = ref(false)
  
  // Chronometer for roleplay phase (counts up from 0)
  const timeElapsed = ref(0)
  const timerInterval = ref(null)
  const showTimeWarning = ref(false)
  
  // DESC scores (échelle 1-5)
  const scores = reactive({
    decrire: 1,    // Décrire les faits
    exprimer: 1,   // Exprimer ses sentiments
    specifier: 1,  // Spécifier ce qu'on veut
    conclure: 1    // Conclure sur les conséquences
  })

  // Exercise state
  const exerciseStarted = ref(false)
  const canStartExercise = ref(true)
  const messageCount = ref(0)

  // Reactive state
  const messages = ref([
    {
      id: 1,
      role: 'assistant',
      content: 'Bonjour ! Bienvenue dans votre entraînement à la communication avec la méthode DESC.\n\n📋 Votre exercice d\'aujourd\'hui :\nVous devez avoir une conversation difficile avec Thomas, un collaborateur qui arrive systématiquement en retard aux réunions d\'équipe.\n\n🎯 La méthode DESC :\n• Décrire : Les faits objectifs\n• Exprimer : Vos sentiments  \n• Spécifier : Ce que vous voulez\n• Conclure : Les conséquences\n\nAvez-vous des questions sur l\'exercice avant de commencer ?',
      timestamp: new Date(),
      source: 'mock'
    }
  ])

  const isTyping = ref(false)
  const isConnected = ref(true)

  // Chat configuration
  const config = reactive({
    apiEndpoint: import.meta.env.VITE_OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
    apiKey: import.meta.env.VITE_OPENROUTER_API_KEY,
    model: import.meta.env.VITE_OPENROUTER_MODEL || 'anthropic/claude-sonnet-4',
    maxMessages: 100,
    typingDelay: { min: 800, max: 2000 },
    streaming: true // Enable streaming for voice mode
  })

  // Add message to conversation
  const addMessage = (content, role, source = 'user', extraProps = {}) => {
    const message = {
      id: Date.now() + Math.random(),
      content,
      role,
      source,
      timestamp: new Date().toISOString(),
      ...extraProps
    }
    console.log('🔍 Adding message:', message)
    messages.value.push(message)
    
    // Keep only the last maxMessages
    if (messages.value.length > config.maxMessages) {
      messages.value = messages.value.slice(-config.maxMessages)
    }
    
    return message
  }

  // Start exercise chronometer
  const startExercise = () => {
    exerciseStarted.value = true
    phase.value = 'roleplay'
    timeElapsed.value = 0
    showTimeWarning.value = false
    
    // Start chronometer (counts up)
    timerInterval.value = setInterval(() => {
      timeElapsed.value++
      
      // Show warning at 10 minutes (600 seconds)
      if (timeElapsed.value === 600 && !showTimeWarning.value) {
        showTimeWarning.value = true
        const { showTimeWarning: showTimeWarningModal } = useModal()
        showTimeWarningModal()
      }
    }, 1000)
    
    addMessage(
      "🎭 L'exercice commence maintenant !\n\nVous êtes dans votre bureau.\nThomas vient d'arriver 15 minutes en retard à la réunion d'équipe.\nVous décidez d'aller lui parler.\n\n---\n\nThomas : Ah salut ! Désolé pour le retard, j'ai eu un imprévu ce matin...\nBon, on a raté quelque chose d'important ?",
      'assistant',
      'mock'
    )
  }

  // End exercise and move to debrief
  const endExercise = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
    
    // Disable voice mode when leaving roleplay
    if (voiceMode.value) {
      voiceMode.value = false
      voiceChat.stopListening()
      voiceChat.stopSpeaking()
      console.log('🔇 Mode vocal désactivé (fin du roleplay)')
    }
    
    phase.value = 'debrief'
    exerciseStarted.value = false
    showTimeWarning.value = false
    
    // Add debrief message
    const debriefMessage = `🎯 Exercice terminé !\n\nTemps écoulé : ${formatTime(timeElapsed.value)}\n\n${generateFeedback()}`
    addMessage(debriefMessage, 'assistant', 'system')
    
    // Add follow-up message after a few seconds
    setTimeout(() => {
      addMessage('Avez-vous des questions ou des réflexions à partager sur cet exercice ?', 'assistant', 'ai')
    }, 3000)
  }

  // Score analysis based on message content
  const analyzeMessage = (content) => {
    const lowerContent = content.toLowerCase()
    
    // Analyze for DESC elements
    let newScores = { ...scores }
    
    // Décrire (facts, objective descriptions)
    if (lowerContent.includes('retard') || lowerContent.includes('15 minutes') || 
        lowerContent.includes('réunion') || lowerContent.includes('fait') || 
        lowerContent.includes('observe')) {
      newScores.decrire = Math.min(5, newScores.decrire + 0.5)
    }
    
    // Exprimer (feelings, emotions)
    if (lowerContent.includes('ressens') || lowerContent.includes('sentiment') || 
        lowerContent.includes('frustré') || lowerContent.includes('déçu') || 
        lowerContent.includes('me sens') || lowerContent.includes('inquiet')) {
      newScores.exprimer = Math.min(5, newScores.exprimer + 0.5)
    }
    
    // Spécifier (specific requests/expectations)
    if (lowerContent.includes('veux') || lowerContent.includes('attends') || 
        lowerContent.includes('souhaite') || lowerContent.includes('demande') || 
        lowerContent.includes('peux-tu') || lowerContent.includes('pourrais-tu')) {
      newScores.specifier = Math.min(5, newScores.specifier + 0.5)
    }
    
    // Conclure (consequences, future)
    if (lowerContent.includes('conséquence') || lowerContent.includes('résultat') || 
        lowerContent.includes('si tu continues') || lowerContent.includes('à l\'avenir') || 
        lowerContent.includes('sinon') || lowerContent.includes('autrement')) {
      newScores.conclure = Math.min(5, newScores.conclure + 0.5)
    }
    
    // Update scores
    Object.assign(scores, newScores)
  }

  // Clean markdown formatting from text
  const cleanMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '$1')  // Remove **bold**
      .replace(/\*(.*?)\*/g, '$1')      // Remove *italic*
      .replace(/__(.*?)__/g, '$1')      // Remove __underline__
      .replace(/_(.*?)_/g, '$1')        // Remove _underline_
      .replace(/`(.*?)`/g, '$1')        // Remove `code`
      .replace(/~~(.*?)~~/g, '$1')      // Remove ~~strikethrough~~
      .replace(/^\s*[-*+]\s+/gm, '• ')  // Convert markdown lists to bullets
      .replace(/^\s*\d+\.\s+/gm, '• ')  // Convert numbered lists to bullets
      .replace(/^\s*#{1,6}\s+/gm, '')   // Remove headers
  }

  // Parse and validate JSON response for roleplay phase
  const parseRoleplayResponse = async (rawResponse, userMessage, retryCount = 0, allAttempts = []) => {
    // Log all attempts
    allAttempts.push({
      attempt: retryCount + 1,
      response: rawResponse.substring(0, 300) + (rawResponse.length > 300 ? '...' : ''),
      timestamp: new Date().toLocaleTimeString()
    })
    
    console.log(`🔍 JSON Parse Attempt ${retryCount + 1}:`)
    console.log('Raw response:', rawResponse.substring(0, 200) + '...')
    
    try {
      // Clean the response: remove markdown code blocks
      let cleanedResponse = rawResponse.trim()
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```json') || cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/```\s*$/, '').trim()
      }
      
      console.log('Cleaned response:', cleanedResponse.substring(0, 200) + '...')
      
      // Try to parse JSON
      const jsonResponse = JSON.parse(cleanedResponse)
      
      // Validate required fields
      if (!jsonResponse.thomas_response || 
          !jsonResponse.coach_feedback || 
          !jsonResponse.desc_evaluation ||
          typeof jsonResponse.off_topic_warning === 'undefined') {
        throw new Error('Missing required JSON fields')
      }
      
      // Validate desc_evaluation structure
      const descEval = jsonResponse.desc_evaluation
      if (typeof descEval.decrire !== 'number' || typeof descEval.exprimer !== 'number' || 
          typeof descEval.specifier !== 'number' || typeof descEval.conclure !== 'number') {
        throw new Error('Invalid desc_evaluation structure')
      }
      
      console.log('✅ JSON Parse Success!')
      return jsonResponse
      
    } catch (error) {
      console.error(`❌ JSON Parse Error (attempt ${retryCount + 1}):`, error.message)
      
      if (retryCount < 2) { // Max 3 attempts (0, 1, 2)
        console.log(`🔄 Retrying with format warning...`)
        
        // Retry with format warning
        const retryPrompt = `ERREUR: Votre réponse précédente n'était pas au format JSON valide.

ERREUR DÉTECTÉE: ${error.message}

RAPPEL CRITIQUE: Vous DEVEZ répondre UNIQUEMENT avec un JSON valide, SANS balises markdown, RIEN D'AUTRE.

Format OBLIGATOIRE (SANS \`\`\`json):
{
  "thomas_response": "Réponse de Thomas ici",
  "coach_feedback": "Conseil du coach ici", 
  "desc_evaluation": {
    "decrire": 3,
    "exprimer": 2,
    "specifier": 1,
    "conclure": 0
  },
  "off_topic_warning": null
}

Message utilisateur original: "${userMessage}"

Répondez maintenant UNIQUEMENT avec le JSON, SANS balises markdown:`

        const retryResponse = await callChatAPI(retryPrompt, phase.value)
        return await parseRoleplayResponse(retryResponse, userMessage, retryCount + 1, allAttempts)
      } else {
        // Final failure after 3 attempts - log all attempts
        console.error('🚨 ÉCHEC DÉFINITIF - Historique complet des tentatives:')
        allAttempts.forEach(attempt => {
          console.error(`Tentative ${attempt.attempt} (${attempt.timestamp}):`, attempt.response)
        })
        
        throw new Error(`❌ ERREUR DÉFINITIVE: L'IA n'a pas respecté le format JSON après 3 tentatives.\n\nHistorique des tentatives:\n${allAttempts.map(a => `${a.attempt}. ${a.response.substring(0, 100)}...`).join('\n')}`)
      }
    }
  }

  // Generate AI response using OpenRouter API with voice support
  const generateResponse = async (userMessage) => {
    if (config.apiKey) {
      try {
        // Use streaming for voice mode, regular for text mode
        const enableStreaming = voiceMode.value && phase.value === 'roleplay'
        const rawResponse = await callChatAPI(userMessage, phase.value, enableStreaming)
        
        // Handle roleplay phase with JSON parsing (only for non-streaming)
        if (phase.value === 'roleplay' && !enableStreaming) {
          const jsonResponse = await parseRoleplayResponse(rawResponse, userMessage)
          
          // Check language and show warning if not French
          if (jsonResponse.language && jsonResponse.language !== 'fra') {
            const languageWarnings = [
              "Désolé, je ne comprends que le français ! Pouvez-vous répéter en français s'il vous plaît ?",
              "Excusez-moi, mais je ne parle que français. Pourriez-vous reformuler votre message ?",
              "Je ne comprends pas cette langue. Merci de me parler en français !",
              "Oups ! Je ne comprends que le français. Pouvez-vous essayer à nouveau ?",
              "Désolé Thomas, mais je ne comprends que le français. Reformulez s'il vous plaît !"
            ]
            
            const randomWarning = languageWarnings[Math.floor(Math.random() * languageWarnings.length)]
            
            return {
              content: randomWarning,
              source: 'system',
              isThomas: false,
              isLanguageWarning: true
            }
          }
          
          // Update scores based on user message
          analyzeMessage(userMessage)
          
          return {
            content: jsonResponse.thomas_response,
            source: 'ai',
            isThomas: true,
            coachFeedback: jsonResponse.coach_feedback,
            isOffTopic: !!jsonResponse.off_topic_warning,
            language: jsonResponse.language
          }
        } else if (phase.value === 'roleplay' && enableStreaming) {
          // For streaming voice mode, return simplified response
          // Score evaluation will be done asynchronously
          setTimeout(() => analyzeMessage(userMessage), 100)
          
          return { 
            content: rawResponse, 
            source: 'ai',
            isThomas: true,
            isVoiceStreamed: true
          }
        } else {
          // Non-roleplay phases: clean markdown as before
          const cleanedResponse = cleanMarkdown(rawResponse)
          
          // Track message count for brief phase
          if (phase.value === 'brief') {
            messageCount.value++
          }
          
          return { content: cleanedResponse, source: 'ai' }
        }
      } catch (error) {
        console.error('Erreur API:', error)
        return { content: error.message.startsWith('❌ ERREUR DÉFINITIVE') ? error.message : generateErrorMessage(userMessage), source: 'mock' }
      }
    } else {
      return { content: generateErrorMessage(userMessage), source: 'mock' }
    }
  }

  // Error messages when API is not available
  const generateErrorMessage = (userMessage) => {
    const errorMessages = [
      "❌ Pas d'accès à internet.\nImpossible de contacter l'IA pour cette phase de l'exercice.",
      "🔌 L'IA ne répond pas actuellement.\nVeuillez vérifier votre connexion ou réessayer plus tard.",
      "⚠️ Service IA indisponible.\nLa simulation interactive nécessite une connexion active.",
      "🤖 Erreur de connexion à l'IA.\nL'exercice DESC interactif n'est pas disponible hors ligne."
    ]
    
    return errorMessages[Math.floor(Math.random() * errorMessages.length)]
  }


  const getScoreComment = (dimension) => {
    const score = scores[dimension]
    if (score >= 4) return "Excellent ! Très bien maîtrisé"
    if (score >= 3) return "Bien ! Quelques points à améliorer"
    if (score >= 2) return "Correct, mais peut être renforcé"
    return "À travailler davantage"
  }

  const generateFeedback = () => {
    const recommendations = []
    
    if (scores.decrire < 3) {
      recommendations.push("💡 Décrire : Concentrez-vous sur les faits objectifs et observables")
    }
    if (scores.exprimer < 3) {
      recommendations.push("💡 Exprimer : N'hésitez pas à partager vos ressentis avec des 'je' plutôt que des 'tu'")
    }
    if (scores.specifier < 3) {
      recommendations.push("💡 Spécifier : Soyez plus précis sur ce que vous attendez comme changement")
    }
    if (scores.conclure < 3) {
      recommendations.push("💡 Conclure : Expliquez les bénéfices d'un changement positif")
    }
    
    if (recommendations.length === 0) {
      return "🎉 Félicitations ! Vous maîtrisez bien la méthode DESC.\nContinuez à pratiquer pour devenir expert !"
    }
    
    return "🎯 Recommandations :\n" + recommendations.join("\n")
  }

  // Format time helper function
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Reset exercise (restart from beginning)
  const resetExercise = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
    
    // Disable voice mode when resetting
    if (voiceMode.value) {
      voiceMode.value = false
      voiceChat.stopListening()
      voiceChat.stopSpeaking()
      console.log('🔇 Mode vocal désactivé (reset exercice)')
    }
    
    phase.value = 'brief'
    exerciseStarted.value = false
    canStartExercise.value = true
    timeElapsed.value = 0
    showTimeWarning.value = false
    messageCount.value = 0
    
    // Reset scores
    scores.decrire = 1
    scores.exprimer = 1
    scores.specifier = 1
    scores.conclure = 1
    
    // Clear ALL messages and start fresh
    messages.value = [
      {
        id: 1,
        role: 'assistant',
        content: 'Bonjour ! Bienvenue dans votre entraînement à la communication avec la méthode DESC.\n\n📋 Votre exercice d\'aujourd\'hui :\nVous devez avoir une conversation difficile avec Thomas, un collaborateur qui arrive systématiquement en retard aux réunions d\'équipe.\n\n🎯 La méthode DESC :\n• Décrire : Les faits objectifs\n• Exprimer : Vos sentiments  \n• Spécifier : Ce que vous voulez\n• Conclure : Les conséquences\n\nAvez-vous des questions sur l\'exercice avant de commencer ?',
        timestamp: new Date(),
        source: 'mock'
      }
    ]
  }

  // Send message and get AI response
  const sendMessage = async (content) => {
    if (!content.trim() || isTyping.value) return null

    // Add user message
    const userMessage = addMessage(content, 'user')

    // Set typing state
    isTyping.value = true

    try {
      // Simulate API delay
      const delay = config.typingDelay.min + 
        Math.random() * (config.typingDelay.max - config.typingDelay.min)
      await new Promise(resolve => setTimeout(resolve, delay))

      // Add AI response
      const aiResponse = await generateResponse(content)
      addMessage(aiResponse.content, 'assistant', aiResponse.source, {
        isThomas: aiResponse.isThomas,
        coachFeedback: aiResponse.coachFeedback,
        isOffTopic: aiResponse.isOffTopic
      })
      
      return { userMessage, aiResponse }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage = addMessage(
        'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        'assistant',
        'mock'
      )
      
      return { userMessage, assistantMessage: errorMessage }
    } finally {
      isTyping.value = false
    }
  }

  // Clear chat history
  const clearChat = () => {
    messages.value = [
      {
        id: 1,
        role: 'assistant',
        content: 'Bonjour ! Je suis votre assistant d\'entraînement à la communication. Comment puis-je vous aider aujourd\'hui ?',
        timestamp: new Date()
      }
    ]
  }

  // System prompts for different phases
  const getSystemPrompt = (phase) => {
    switch (phase) {
      case 'brief':
        if (!briefPrompt) {
          const error = `❌ ERREUR CRITIQUE: briefPrompt est undefined ou vide`
          console.error(error)
          throw new Error(error)
        }
        return briefPrompt
      
      case 'roleplay':
        if (!roleplayPrompt) {
          const error = `❌ ERREUR CRITIQUE: roleplayPrompt est undefined ou vide`
          console.error(error)
          throw new Error(error)
        }
        return roleplayPrompt
      
      case 'debrief':
        if (!debriefPrompt) {
          const error = `❌ ERREUR CRITIQUE: debriefPrompt est undefined ou vide`
          console.error(error)
          throw new Error(error)
        }
        return debriefPrompt
      
      default:
        const error = `❌ ERREUR CRITIQUE: Phase inconnue "${phase}". Phases valides: brief, roleplay, debrief`
        console.error(error)
        throw new Error(error)
    }
  }

  // Max tokens configuration per phase (optimized for voice)
  const getMaxTokens = (phase) => {
    const baseTokens = {
      brief: voiceMode.value ? 200 : 375,
      roleplay: voiceMode.value ? 150 : 625,
      debrief: voiceMode.value ? 250 : 500
    }
    
    return baseTokens[phase] || 200
  }

  // Temperature configuration per phase (optimized for voice)
  const getTemperature = (phase) => {
    const baseTemp = {
      brief: 0.2,
      roleplay: voiceMode.value ? 0.7 : 0.8, // Slightly lower for voice consistency
      debrief: 0.6
    }
    
    return baseTemp[phase] || 0.7
  }


  // OpenRouter API integration with streaming support
  const callChatAPI = async (userMessage, currentPhase, enableStreaming = false) => {
    if (!config.apiKey) {
      throw new Error('Clé API OpenRouter manquante')
    }

    const systemPrompt = getSystemPrompt(currentPhase)
    
    // DEBUG: Log du prompt utilisé
    console.log('🔍 DEBUG - Phase:', currentPhase)
    console.log('🔍 DEBUG - Streaming:', enableStreaming)
    console.log('🔍 DEBUG - Voice mode:', voiceMode.value)
    console.log('🔍 DEBUG - Max tokens:', getMaxTokens(currentPhase))
    console.log('🔍 DEBUG - Temperature:', getTemperature(currentPhase))
    
    // Build conversation history for context (reduced for voice mode)
    const historyLimit = voiceMode.value ? 8 : 15
    const conversationHistory = messages.value
      .slice(-historyLimit)
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))

    const requestBody = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ],
      max_tokens: getMaxTokens(currentPhase),
      temperature: getTemperature(currentPhase),
      stream: enableStreaming
    }

    const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Chatbot Trainer DESC'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erreur API: ${response.status} - ${error}`)
    }

    if (enableStreaming) {
      return handleStreamingResponse(response, currentPhase)
    } else {
      const data = await response.json()
      return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.'
    }
  }

  // Handle streaming response for voice mode
  const handleStreamingResponse = async (response, currentPhase) => {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let fullResponse = ''
    let sentenceBuffer = ''
    let pendingTTS = null // Track current TTS to avoid conflicts
    
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const jsonStr = line.slice(6).trim()
              if (jsonStr === '[DONE]' || jsonStr === '') break
              
              // Skip malformed JSON chunks
              if (!jsonStr.startsWith('{') || !jsonStr.endsWith('}')) {
                continue
              }
              
              const data = JSON.parse(jsonStr)
              const token = data.choices?.[0]?.delta?.content
              
              if (token) {
                fullResponse += token
                sentenceBuffer += token
                
                // En mode vocal, ne pas faire de TTS pendant le streaming
                // On attendra la réponse complète pour extraire thomas_response
              }
            } catch (e) {
              // Ignorer silencieusement les erreurs de parsing JSON pendant le streaming
              continue
            }
          }
        }
      }
      
      // En mode vocal, traiter la réponse complète pour extraire thomas_response
      if (voiceMode.value && fullResponse.trim()) {
        try {
          // Essayer de parser le JSON pour extraire thomas_response
          const jsonMatch = fullResponse.match(/```json\s*({[\s\S]*?})\s*```/) || 
                           fullResponse.match(/({[\s\S]*})/)
          
          if (jsonMatch) {
            const parsedResponse = JSON.parse(jsonMatch[1])
            const thomasResponse = parsedResponse.thomas_response
            
            if (thomasResponse && thomasResponse.trim()) {
              if (pendingTTS) {
                await pendingTTS.catch(() => {})
                voiceChat.stopSpeaking()
              }
              
              const emotion = voiceChat.detectEmotionFromText(thomasResponse, 'thomas', currentPhase)
              await voiceChat.speakText(thomasResponse.trim(), 'thomas', emotion)
            }
          }
        } catch (e) {
          console.warn('Impossible d\'extraire thomas_response pour TTS:', e.message)
        }
      }
      
      return fullResponse
      
    } catch (error) {
      console.error('Erreur streaming:', error)
      throw error
    } finally {
      reader.releaseLock()
    }
  }

  // Voice chat event handlers
  voiceChat.onSpeechEnd.value = async (transcript) => {
    if (transcript.trim()) {
      await sendMessage(transcript, true) // true = isVoiceInput
    }
  }

  voiceChat.onSpeakingEnd.value = () => {
    // Reprendre l'écoute après que Thomas ait fini de parler
    if (voiceMode.value && phase.value === 'roleplay') {
      setTimeout(() => {
        if (!voiceChat.isListening.value) {
          voiceChat.startListening()
        }
      }, 500) // Petite pause avant de reprendre l'écoute
    }
  }

  // Toggle voice mode (only available in roleplay phase)
  const toggleVoiceMode = () => {
    // Only allow voice mode in roleplay phase
    if (phase.value !== 'roleplay') {
      console.warn('🚫 Mode vocal disponible uniquement en phase roleplay')
      return
    }
    
    voiceMode.value = !voiceMode.value
    
    if (voiceMode.value) {
      const support = voiceChat.checkVoiceSupport()
      if (!support.full) {
        const { showVoiceError } = useModal()
        showVoiceError(support)
        voiceMode.value = false
        return
      }
      
      console.log('🎙️ Mode vocal activé')
      voiceChat.startListening()
    } else {
      console.log('💬 Mode texte activé')
      voiceChat.stopListening()
      voiceChat.stopSpeaking()
    }
  }

  return {
    // State
    messages,
    isTyping,
    isConnected,
    config,
    
    // Exercise state
    phase,
    timeElapsed,
    scores,
    exerciseStarted,
    canStartExercise,
    messageCount,
    
    // Voice state
    voiceMode,
    voiceChat,
    
    // Methods
    addMessage,
    sendMessage,
    clearChat,
    callChatAPI,
    toggleVoiceMode,
    
    // Exercise methods
    startExercise,
    endExercise,
    resetExercise
  }
}
