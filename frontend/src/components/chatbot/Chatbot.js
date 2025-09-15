import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Text,
  VStack,
  HStack,
  Input,
  Icon,
  useColorModeValue,
  Avatar,
  Badge,
  Divider,
  useToast,
  Spinner,
  Flex,
  Textarea,
} from '@chakra-ui/react';
import {
  MdChat,
  MdClose,
  MdSend,
  MdSmartToy,
  MdPerson,
  MdExpandLess,
  MdExpandMore,
  MdError,
} from 'react-icons/md';
import { useLocation } from 'react-router-dom';
import chatbotService from '../../services/chatbotService';

const Chatbot = () => {
  // Changed: Set isOpen to true and isMinimized to true by default
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your Green Pulse AI assistant. How can I help you with carbon tracking, energy tokens, or any questions about the platform?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isServiceAvailable, setIsServiceAvailable] = useState(true);
  const messagesEndRef = useRef(null);
  const toast = useToast();
  const location = useLocation();

  // Color mode values matching your theme
  const bg = useColorModeValue('white', 'navy.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const textColor = useColorModeValue('navy.700', 'white');
  const textColorSecondary = useColorModeValue('gray.500', 'gray.400');
  const brandColor = useColorModeValue('brand.500', 'brand.300');
  const brandBg = useColorModeValue('brand.50', 'brand.900');
  const botMessageBg = useColorModeValue('gray.50', 'gray.700');
  const errorColor = useColorModeValue('red.500', 'red.300');

  // Enhanced check for auth pages - more comprehensive
  const isAuthPage = 
    location.pathname === '/' ||
    location.pathname.includes('/auth/') || 
    location.pathname === '/auth' ||
    location.pathname === '/auth/sign-in' || 
    location.pathname === '/auth/sign-up' ||
    location.pathname === '/auth/forgot-password';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check chatbot service availability on component mount
  useEffect(() => {
    const checkService = async () => {
      const isAvailable = await chatbotService.checkHealth();
      setIsServiceAvailable(isAvailable);
      
      if (!isAvailable) {
        toast({
          title: 'Chatbot Service Unavailable',
          description: 'The AI chatbot service is currently offline. You can still use the basic responses.',
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
      }
    };
    
    checkService();
  }, [toast]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    try {
      let botResponse;
      
      if (isServiceAvailable) {
        // Try to get response from backend AI service
        const result = await chatbotService.sendMessage(inputMessage);
        
        if (result.success) {
          botResponse = result.response;
        } else {
          // Fallback to local responses if service fails
          botResponse = generateFallbackResponse(inputMessage);
          
          toast({
            title: 'AI Service Error',
            description: result.error,
            status: 'error',
            duration: 3000,
            isClosable: true,
          });
        }
      } else {
        // Use fallback responses when service is unavailable
        botResponse = generateFallbackResponse(inputMessage);
      }
      
      const botMessage = {
        id: Date.now() + 1,
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response on any error
      const fallbackResponse = generateFallbackResponse(inputMessage);
      const botMessage = {
        id: Date.now() + 1,
        text: fallbackResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botMessage]);
      
      toast({
        title: 'Connection Error',
        description: 'Using fallback responses. Please check your connection.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsTyping(false);
    }
  };

  const generateFallbackResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('carbon') || message.includes('emission')) {
      return "I can help you track your carbon emissions! You can view your carbon dashboard, check your ENTO savings, and see your environmental impact in the Carbon Dashboard section.";
    } else if (message.includes('token') || message.includes('ento')) {
      return "ENTO tokens are energy tokens that represent your carbon savings. You can earn them by reducing energy consumption and can trade them in the marketplace. Check the Wallet section to see your current balance.";
    } else if (message.includes('profile') || message.includes('account')) {
      return "You can manage your profile information, update your details, and view your statistics in the Profile section. Your education and institute information is automatically synced from your account.";
    } else if (message.includes('leaderboard') || message.includes('ranking')) {
      return "The Leaderboard shows top performers in carbon reduction and ENTO savings. You can see how you rank compared to other users in your institute and department.";
    } else if (message.includes('help') || message.includes('support')) {
      return "I'm here to help! You can ask me about carbon tracking, ENTO tokens, your profile, leaderboards, or any other features of the Green Pulse platform. What would you like to know?";
    } else if (message.includes('hello') || message.includes('hi')) {
      return "Hello! Welcome to Green Pulse! I'm here to help you navigate the platform and answer any questions about carbon tracking and energy tokens.";
    } else {
      return "That's an interesting question! I'm still learning about all the features of Green Pulse. You can explore the different sections like Carbon Dashboard, Wallet, Profile, and Leaderboard to learn more about the platform.";
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Don't render chatbot on auth pages
  if (isAuthPage) {
    return null;
  }

  // Only render the AI box (no chat button)
  return (
    <Box
      position="fixed"
      bottom="20px"
      right="0px"
      zIndex={1000}
      w="400px"
      maxW="calc(100vw - 20px)"
    >
      <Box
        bg={bg}
        borderRadius="20px"
        boxShadow="0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
        border="1px solid"
        borderColor={borderColor}
        overflow="hidden"
        h={isMinimized ? "60px" : "500px"}
        transition="all 0.3s ease"
        w="100%"
        transform="translateX(-20px)"
      >
        {/* Header */}
        <Box
          bg={brandBg}
          p="15px"
          borderBottom={!isMinimized ? "1px solid" : "none"}
          borderColor={borderColor}
        >
          <HStack justify="space-between" align="center">
            <HStack spacing="3">
              <Avatar
                size="sm"
                bg={brandColor}
                icon={<Icon as={MdSmartToy} color="white" />}
              />
              <VStack spacing="0" align="start">
                <Text fontSize="sm" fontWeight="bold" color={textColor}>
                  Green Pulse AI
                </Text>
                <HStack spacing="1">
                  <Box 
                    w="8px" 
                    h="8px" 
                    bg={isServiceAvailable ? "green.400" : "red.400"} 
                    borderRadius="full" 
                  />
                  <Text fontSize="xs" color={textColorSecondary}>
                    {isServiceAvailable ? 'AI Online' : 'Fallback Mode'}
                  </Text>
                </HStack>
              </VStack>
            </HStack>
            <HStack spacing="2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsMinimized(!isMinimized)}
                p="0"
                minW="auto"
                h="auto"
              >
                <Icon
                  as={isMinimized ? MdExpandMore : MdExpandLess}
                  color={textColorSecondary}
                  w="20px"
                  h="20px"
                />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                p="0"
                minW="auto"
                h="auto"
              >
                <Icon as={MdClose} color={textColorSecondary} w="20px" h="20px" />
              </Button>
            </HStack>
          </HStack>
        </Box>

        {!isMinimized && (
          <>
            {/* Messages */}
            <Box 
              h="320px" 
              overflowY="auto"
              overflowX="hidden"
              css={{
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: brandColor,
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'brand.600',
                },
              }}
            >
              <VStack spacing="4" p="15px" align="stretch">
                {messages.map((message) => (
                  <Box key={message.id}>
                    <HStack
                      spacing="3"
                      align="start"
                      justify={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                    >
                      {message.sender === 'bot' && (
                        <Avatar
                          size="xs"
                          bg={brandColor}
                          icon={<Icon as={MdSmartToy} color="white" />}
                        />
                      )}
                      <VStack
                        spacing="1"
                        align={message.sender === 'user' ? 'flex-end' : 'flex-start'}
                        maxW="80%"
                      >
                        <Box
                          bg={message.sender === 'user' ? brandColor : botMessageBg}
                          color={message.sender === 'user' ? 'white' : textColor}
                          px="15px"
                          py="10px"
                          borderRadius="18px"
                          fontSize="sm"
                          lineHeight="1.4"
                        >
                          {message.text}
                        </Box>
                        <Text fontSize="xs" color={textColorSecondary}>
                          {formatTime(message.timestamp)}
                        </Text>
                      </VStack>
                      {message.sender === 'user' && (
                        <Avatar
                          size="xs"
                          bg="gray.300"
                          icon={<Icon as={MdPerson} color="white" />}
                        />
                      )}
                    </HStack>
                  </Box>
                ))}
                {isTyping && (
                  <HStack spacing="3" align="start">
                    <Avatar
                      size="xs"
                      bg={brandColor}
                      icon={<Icon as={MdSmartToy} color="white" />}
                    />
                    <Box
                      bg={botMessageBg}
                      px="15px"
                      py="10px"
                      borderRadius="18px"
                      fontSize="sm"
                    >
                      <HStack spacing="1">
                        <Spinner size="xs" color={brandColor} />
                        <Text color={textColorSecondary}>
                          {isServiceAvailable ? 'AI is thinking...' : 'Processing...'}
                        </Text>
                      </HStack>
                    </Box>
                  </HStack>
                )}
                <div ref={messagesEndRef} />
              </VStack>
            </Box>

            <Divider />

            {/* Input */}
            <Box p="15px">
              <HStack spacing="3">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isServiceAvailable ? "Ask me anything about Green Pulse..." : "Ask about Green Pulse features..."}
                  size="sm"
                  resize="none"
                  rows={1}
                  borderRadius="20px"
                  borderColor={borderColor}
                  _focus={{
                    borderColor: brandColor,
                    boxShadow: `0 0 0 1px ${brandColor}`,
                  }}
                  _placeholder={{
                    color: textColorSecondary,
                    fontSize: 'sm',
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  size="sm"
                  bg={brandColor}
                  color="white"
                  borderRadius="full"
                  p="0"
                  minW="40px"
                  h="40px"
                  isDisabled={!inputMessage.trim() || isTyping}
                  _hover={{
                    bg: 'brand.600',
                  }}
                >
                  <Icon as={MdSend} w="18px" h="18px" />
                </Button>
              </HStack>
              
              {/* Service Status Indicator */}
              {!isServiceAvailable && (
                <HStack spacing="2" mt="2" justify="center">
                  <Icon as={MdError} color={errorColor} w="12px" h="12px" />
                  <Text fontSize="xs" color={errorColor}>
                    Using fallback responses
                  </Text>
                </HStack>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Add option to show the chatbot again if it's closed */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          bg={brandColor}
          color="white"
          borderRadius="full"
          p="2"
          position="absolute"
          bottom="0"
          right="20px"
          _hover={{
            bg: 'brand.600',
          }}
        >
          <Icon as={MdChat} w="16px" h="16px" />
        </Button>
      )}
    </Box>
  );
};

export default Chatbot;
