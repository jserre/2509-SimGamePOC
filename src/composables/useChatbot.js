import { ref, reactive } from 'vue'

/**
 * Composable for managing chatbot functionality
 * Handles messages, API calls, and chat state
 */
export function useChatbot() {
  // Reactive state
  const messages = ref([
    {
      id: 1,
      role: 'assistant',
      content: 'Bonjour ! Je suis votre assistant d\'entraînement à la communication. Comment puis-je vous aider aujourd\'hui ?',
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

  // Mock AI response (to be replaced with actual API call)
  const generateMockResponse = () => {
    const responses = [
      "C'est une excellente question ! Pouvez-vous me donner plus de contexte ?",
      "Je comprends votre point de vue. Avez-vous envisagé cette approche différente ?",
      "Intéressant ! Cela me rappelle une situation similaire...",
      "Merci pour cette information. Comment vous sentez-vous par rapport à cette situation ?",
      "C'est un défi courant en communication. Voici quelques stratégies qui pourraient vous aider...",
      "Excellente observation ! En communication, il est important de...",
      "Je vois que vous réfléchissez à cela. Quelle serait votre première approche ?",
      "C'est un point très pertinent. Dans des situations similaires, on peut...",
    ]
    return responses[Math.floor(Math.random() * responses.length)]
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

      // TODO: Replace with actual API call
      // const response = await callChatAPI(content)
      const response = generateMockResponse()

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
    
    // Methods
    addMessage,
    sendMessage,
    clearChat,
    callChatAPI
  }
}
