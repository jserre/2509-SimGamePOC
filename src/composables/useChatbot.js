import { ref, reactive } from 'vue'

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
  const canStartExercise = ref(false)
  const messageCount = ref(0)

  // Reactive state
  const messages = ref([
    {
      id: 1,
      role: 'assistant',
      content: 'Bonjour ! Bienvenue dans votre entraînement à la communication avec la méthode DESC.\n\n📋 Votre exercice d\'aujourd\'hui :\nVous devez avoir une conversation difficile avec Thomas, un collaborateur qui arrive systématiquement en retard aux réunions d\'équipe.\n\n🎯 La méthode DESC :\n• Décrire : Les faits objectifs\n• Exprimer : Vos sentiments  \n• Spécifier : Ce que vous voulez\n• Conclure : Les conséquences\n\nAvez-vous des questions sur l\'exercice avant de commencer ?',
      timestamp: new Date()
    }
  ])

  const isTyping = ref(false)
  const isConnected = ref(true)

  // Chat configuration
  const config = reactive({
    apiEndpoint: '', // To be configured later for OpenAI/Claude
    maxMessages: 100,
    typingDelay: { min: 1000, max: 3000 }
  })

  // Add a new message to the chat
  const addMessage = (content, role = 'user') => {
    const message = {
      id: Date.now() + Math.random(),
      role,
      content,
      timestamp: new Date()
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
      'assistant'
    )
  }

  const endExercise = () => {
    phase.value = 'debrief'
    stopTimer()
    
    addMessage(
      "⏰ Exercice terminé !\n\nFélicitations ! Prenons maintenant quelques minutes pour analyser votre performance.\n\nQuestions de réflexion :\n1. Comment vous êtes-vous senti pendant cet exercice ?\n2. Quels ont été les moments les plus difficiles ?\n3. Que feriez-vous différemment ?",
      'assistant'
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

  // Generate responses based on phase
  const generateResponse = (userMessage) => {
    switch (phase.value) {
      case 'brief':
        return generateBriefResponse(userMessage)
      case 'roleplay':
        return generateRoleplayResponse(userMessage)
      case 'debrief':
        return generateDebriefResponse(userMessage)
      default:
        return "Je ne comprends pas dans quelle phase nous sommes."
    }
  }

  const generateBriefResponse = (userMessage) => {
    messageCount.value++
    
    // Check if can start exercise (after 2-3 exchanges)
    if (messageCount.value >= 2) {
      canStartExercise.value = true
    }
    
    const briefResponses = [
      "Excellente question !\nLa méthode DESC vous aide à structurer une conversation difficile de manière non-violente.\n\nAvez-vous déjà utilisé une approche similaire ?",
      "C'est effectivement un défi !\nL'important avec Thomas sera de rester factuel et bienveillant.\n\nQue craignez-vous le plus dans cette conversation ?",
      "Très bonne remarque !\nL'objectif n'est pas de punir Thomas mais de trouver une solution ensemble.\n\nD'autres questions sur l'exercice ?",
      "Parfait ! Vous semblez bien comprendre l'enjeu.\nLa clé sera de garder un ton constructif.\n\nÊtes-vous prêt(e) à commencer l'exercice ?"
    ]
    
    return briefResponses[Math.floor(Math.random() * briefResponses.length)]
  }

  const generateRoleplayResponse = (userMessage) => {
    // Analyze user message for DESC elements
    analyzeMessage(userMessage)
    
    const thomasResponses = [
      "Écoute, je sais bien que j'arrive souvent un peu en retard, mais tu sais comme c'est compliqué avec les transports...\n\nEt puis ce n'est que 10-15 minutes !",
      "Je fais de mon mieux tu sais !\nEt franchement, nos réunions commencent toujours par du blabla pas très important.\n\nJe n'ai rien raté de crucial si ?",
      "D'accord, d'accord... Je comprends que ça puisse déranger.\nMais bon, on est tous débordés non ?\n\nQu'est-ce que tu proposes exactement ?",
      "Hmm... Je vois que c'est important pour toi.\nPeut-être qu'on pourrait trouver une solution ?\n\nMais je ne peux pas promettre d'être toujours parfait...",
      "Ok, je reconnais que ce n'est pas idéal.\nQue veux-tu que je fasse concrètement ?\n\nEt si jamais j'ai vraiment un imprévu ?"
    ]
    
    return thomasResponses[Math.floor(Math.random() * thomasResponses.length)]
  }

  const generateDebriefResponse = (userMessage) => {
    const debriefResponses = [
      "Très intéressant !\nCette prise de conscience est importante pour progresser.\n\nRegardons maintenant vos scores DESC...",
      "Excellente réflexion !\nL'auto-évaluation fait partie du processus d'apprentissage.\n\nAnalysons votre performance ensemble.",
      "C'est une analyse très juste.\nChaque conversation difficile nous apprend quelque chose.\n\nVoici maintenant votre bilan personnalisé...",
      `📊 Votre bilan DESC :\n\n• Décrire (${scores.decrire.toFixed(1)}/5) : ${getScoreComment('decrire')}\n• Exprimer (${scores.exprimer.toFixed(1)}/5) : ${getScoreComment('exprimer')}\n• Spécifier (${scores.specifier.toFixed(1)}/5) : ${getScoreComment('specifier')}\n• Conclure (${scores.conclure.toFixed(1)}/5) : ${getScoreComment('conclure')}\n\n${getPersonalizedRecommendations()}`
    ]
    
    return debriefResponses[Math.floor(Math.random() * debriefResponses.length)]
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

      // Generate response based on current phase
      const response = generateResponse(content)

      // Add AI response
      const assistantMessage = addMessage(response, 'assistant')
      
      return { userMessage, assistantMessage }
    } catch (error) {
      console.error('Error sending message:', error)
      
      // Add error message
      const errorMessage = addMessage(
        'Désolé, une erreur s\'est produite. Veuillez réessayer.',
        'assistant'
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

  // Future API integration function
  const callChatAPI = async (message) => {
    // TODO: Implement actual API call to OpenAI/Claude
    // This will be added when integrating with external APIs
    
    // Example structure:
    // const response = await fetch(config.apiEndpoint, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     messages: messages.value.map(msg => ({
    //       role: msg.role,
    //       content: msg.content
    //     })),
    //     max_tokens: 150,
    //     temperature: 0.7
    //   })
    // })
    
    throw new Error('API not implemented yet')
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
