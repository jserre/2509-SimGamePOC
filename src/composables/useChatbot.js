import { ref, reactive } from 'vue'
import briefPrompt from '../../prompts/brief.js'
import roleplayPrompt from '../../prompts/roleplay.js'
import debriefPrompt from '../../prompts/debrief.js'
import defaultPrompt from '../../prompts/default.js'

/**
 * Composable for managing chatbot functionality with DESC exercise phases
 * Handles messages, API calls, chat state, and exercise progression
 */
export function useChatbot() {
  // Exercise phases: 'brief' | 'roleplay' | 'debrief'
  const phase = ref('brief')
  
  // Timer for roleplay phase (5 minutes = 300 seconds)
  const timeLeft = ref(300)
  const timerInterval = ref(null)
  
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
    typingDelay: { min: 800, max: 2000 }
  })

  // Add a new message to the chat
  const addMessage = (content, role = 'user', source = 'user') => {
    const message = {
      id: Date.now() + Math.random(),
      role,
      content,
      timestamp: new Date(),
      source // 'ai', 'mock', or 'user'
    }
    messages.value.push(message)
    
    // Keep only the last maxMessages
    if (messages.value.length > config.maxMessages) {
      messages.value = messages.value.slice(-config.maxMessages)
    }
    
    return message
  }

  // Timer management
  const startTimer = () => {
    if (timerInterval.value) clearInterval(timerInterval.value)
    
    timerInterval.value = setInterval(() => {
      timeLeft.value--
      if (timeLeft.value <= 0) {
        stopTimer()
        endExercise()
      }
    }, 1000)
  }

  const stopTimer = () => {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }

  const resetTimer = () => {
    timeLeft.value = 300
    stopTimer()
  }

  // Phase management
  const startExercise = () => {
    phase.value = 'roleplay'
    exerciseStarted.value = true
    startTimer()
    
    addMessage(
      "🎭 L'exercice commence maintenant !\n\nVous êtes dans votre bureau.\nThomas vient d'arriver 15 minutes en retard à la réunion d'équipe.\nVous décidez d'aller lui parler.\n\n---\n\nThomas : Ah salut ! Désolé pour le retard, j'ai eu un imprévu ce matin...\nBon, on a raté quelque chose d'important ?",
      'assistant',
      'mock'
    )
  }

  const endExercise = () => {
    phase.value = 'debrief'
    stopTimer()
    
    addMessage(
      "⏰ Exercice terminé !\n\nFélicitations ! Prenons maintenant quelques minutes pour analyser votre performance.\n\nQuestions de réflexion :\n1. Comment vous êtes-vous senti pendant cet exercice ?\n2. Quels ont été les moments les plus difficiles ?\n3. Que feriez-vous différemment ?",
      'assistant',
      'mock'
    )
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

  // Generate AI response using OpenRouter API
  const generateResponse = async (userMessage) => {
    if (config.apiKey) {
      try {
        const rawResponse = await callChatAPI(userMessage)
        const cleanedResponse = cleanMarkdown(rawResponse)
        
        // Update scores based on response content (for roleplay phase)
        if (phase.value === 'roleplay') {
          analyzeMessage(userMessage)
        }
        
        // Track message count for brief phase
        if (phase.value === 'brief') {
          messageCount.value++
        }
        
        return { content: cleanedResponse, source: 'ai' }
      } catch (error) {
        console.error('Erreur API:', error)
        // Show error message when API fails
        return { content: generateErrorMessage(userMessage), source: 'mock' }
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

  const getPersonalizedRecommendations = () => {
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

      // Generate response based on current phase (now async)
      const response = await generateResponse(content)

      // Add AI response with source information
      const assistantMessage = addMessage(response.content, 'assistant', response.source)
      
      return { userMessage, assistantMessage }
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
        return briefPrompt
      
      case 'roleplay':
        return roleplayPrompt
      
      case 'debrief':
        return debriefPrompt
      
      default:
        return defaultPrompt
    }
  }

  // Max tokens configuration per phase
  const getMaxTokens = (phase) => {
    switch (phase) {
      case 'brief':
        return 300      // Marge pour éviter troncature + prompt contrôle la brièveté
      case 'roleplay':
        return 500      // Thomas peut s'exprimer librement
      case 'debrief':
        return 400      // Analyses complètes sans coupure
      default:
        return 300
    }
  }

  // Temperature configuration per phase  
  const getTemperature = (phase) => {
    switch (phase) {
      case 'brief':
        return 0.1      // Très prévisible et discipliné
      case 'roleplay':
        return 0.8      // Thomas spontané et naturel
      case 'debrief':
        return 0.4      // Analyses réfléchies mais variées
      default:
        return 0.7
    }
  }

  // OpenRouter API integration
  const callChatAPI = async (userMessage, currentPhase) => {
    if (!config.apiKey) {
      throw new Error('Clé API OpenRouter manquante')
    }

    const systemPrompt = getSystemPrompt(currentPhase)
    
    // Build conversation history for context
    const conversationHistory = messages.value
      .slice(-6) // Last 6 messages for context
      .map(msg => ({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content
      }))

    const response = await fetch(`${config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Chatbot Trainer DESC'
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory,
          { role: 'user', content: userMessage }
        ],
        max_tokens: getMaxTokens(currentPhase),
        temperature: getTemperature(currentPhase),
        stream: false
      })
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erreur API: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || 'Désolé, je n\'ai pas pu générer de réponse.'
  }

  return {
    // State
    messages,
    isTyping,
    isConnected,
    config,
    
    // Exercise state
    phase,
    timeLeft,
    scores,
    exerciseStarted,
    canStartExercise,
    messageCount,
    
    // Methods
    addMessage,
    sendMessage,
    clearChat,
    callChatAPI,
    
    // Exercise methods
    startExercise,
    endExercise,
    startTimer,
    stopTimer,
    resetTimer
  }
}
