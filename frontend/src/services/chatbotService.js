import axios from 'axios';

// Chatbot API client - separate from main API since it runs on different port
const CHATBOT_BASE_URL = 'http://localhost:5001'; // Changed to port 5001

const chatbotClient = axios.create({
  baseURL: CHATBOT_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout for AI responses
});

const chatbotService = {
  sendMessage: async (message) => {
    try {
      const response = await chatbotClient.post('/chat', {
        message: message
      });
      
      return {
        success: true,
        response: response.data.response
      };
    } catch (error) {
      console.error('Chatbot service error:', error);
      
      // Handle different types of errors
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Chatbot service is not available. Please start the Flask backend.'
        };
      } else if (error.response?.status === 500) {
        return {
          success: false,
          error: 'AI service error. Please check your Gemini API key.'
        };
      } else if (error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Request timeout. Please try again.'
        };
      } else {
        return {
          success: false,
          error: 'Failed to get response. Please try again.'
        };
      }
    }
  },

  // Check if chatbot service is available
  checkHealth: async () => {
    try {
      const response = await chatbotClient.get('/health');
      return response.status === 200;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }
};

export default chatbotService;
