import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Input,
  FormControl,
  FormLabel,
  FormHelperText,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  Divider,
  useToast,
  Card,
  CardHeader,
  CardBody,
  Icon,
  Badge,
  Flex
} from '@chakra-ui/react';
import { MdSettings, MdElectricalServices, MdNotifications, MdSave } from 'react-icons/md';

const AlertConfiguration = ({ onConfigSave }) => {
  const [config, setConfig] = useState({
    threshold: 1000,
    enableAutomaticChecks: true,
    checkInterval: 5,
    emailNotifications: false,
    severityLevels: {
      low: 1.0,
      medium: 1.5,
      high: 2.0,
      critical: 3.0
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const toast = useToast();


  useEffect(() => {
    const savedConfig = localStorage.getItem('alertConfig');
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig);
        setConfig(prevConfig => ({ ...prevConfig, ...parsedConfig }));
      } catch (error) {
        console.error('Error loading saved configuration:', error);
      }
    }
  }, []);

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSeverityChange = (level, value) => {
    setConfig(prev => ({
      ...prev,
      severityLevels: {
        ...prev.severityLevels,
        [level]: value
      }
    }));
  };

  const saveConfiguration = () => {
    setIsLoading(true);
    

    localStorage.setItem('alertConfig', JSON.stringify(config));
    

    if (onConfigSave) {
      onConfigSave(config);
    }
    
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: 'Configuration Saved',
        description: 'Your alert preferences have been saved successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    }, 1000);
  };

  const resetToDefaults = () => {
    setConfig({
      threshold: 1000,
      enableAutomaticChecks: true,
      checkInterval: 5,
      emailNotifications: false,
      severityLevels: {
        low: 1.0,
        medium: 1.5,
        high: 2.0,
        critical: 3.0
      }
    });
    
    toast({
      title: 'Reset to Defaults',
      description: 'Configuration has been reset to default values.',
      status: 'info',
      duration: 3000,
      isClosable: true
    });
  };

  return (
    <Box w="100%" maxW="600px">
      <Flex align="center" mb={6}>
        <Icon as={MdSettings} w={6} h={6} color="blue.500" mr={3} />
        <Text fontSize="xl" fontWeight="bold">
          Alert Configuration
        </Text>
      </Flex>

      <VStack spacing={6} align="stretch">
        {}
        <Card>
          <CardHeader pb={2}>
            <HStack>
              <Icon as={MdElectricalServices} color="blue.500" />
              <Text fontSize="md" fontWeight="semibold">
                Threshold Settings
              </Text>
            </HStack>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl>
                <FormLabel>Energy Meter Threshold (kWh)</FormLabel>
                <NumberInput
                  value={config.threshold}
                  onChange={(valueString, valueNumber) => 
                    handleInputChange('threshold', valueNumber || 1000)
                  }
                  min={0}
                  max={100000}
                  step={100}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>
                  Alerts will be generated when meter readings exceed this value
                </FormHelperText>
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        {}
        <Card>
          <CardHeader pb={2}>
            <HStack>
              <Icon as={MdNotifications} color="orange.500" />
              <Text fontSize="md" fontWeight="semibold">
                Severity Levels
              </Text>
            </HStack>
          </CardHeader>
          <CardBody>
            <Text fontSize="sm" color="gray.600" mb={4}>
              Configure at what multiples of the threshold different severity levels are triggered
            </Text>
            <VStack spacing={4} align="stretch">
              {Object.entries(config.severityLevels).map(([level, multiplier]) => {
                const colors = {
                  low: 'blue',
                  medium: 'yellow', 
                  high: 'orange',
                  critical: 'red'
                };
                
                return (
                  <FormControl key={level}>
                    <HStack justify="space-between">
                      <HStack>
                        <Badge colorScheme={colors[level]} textTransform="capitalize">
                          {level}
                        </Badge>
                        <Text fontSize="sm">
                          Threshold × 
                        </Text>
                      </HStack>
                      <NumberInput
                        value={multiplier}
                        onChange={(valueString, valueNumber) => 
                          handleSeverityChange(level, valueNumber || 1.0)
                        }
                        min={0.5}
                        max={10}
                        step={0.1}
                        precision={1}
                        w="100px"
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      = {(config.threshold * multiplier).toLocaleString()} kWh
                    </Text>
                  </FormControl>
                );
              })}
            </VStack>
          </CardBody>
        </Card>

        {}
        <Card>
          <CardHeader pb={2}>
            <Text fontSize="md" fontWeight="semibold">
              Monitoring Settings
            </Text>
          </CardHeader>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} mr={4}>
                  Enable Automatic Checks
                </FormLabel>
                <Switch
                  isChecked={config.enableAutomaticChecks}
                  onChange={(e) => handleInputChange('enableAutomaticChecks', e.target.checked)}
                  colorScheme="blue"
                />
              </FormControl>
              
              <FormControl isDisabled={!config.enableAutomaticChecks}>
                <FormLabel>Check Interval (minutes)</FormLabel>
                <NumberInput
                  value={config.checkInterval}
                  onChange={(valueString, valueNumber) => 
                    handleInputChange('checkInterval', valueNumber || 5)
                  }
                  min={1}
                  max={60}
                  step={1}
                  isDisabled={!config.enableAutomaticChecks}
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <FormHelperText>
                  How often to automatically check for new alerts
                </FormHelperText>
              </FormControl>

              <FormControl display="flex" alignItems="center">
                <FormLabel mb={0} mr={4}>
                  Email Notifications (Coming Soon)
                </FormLabel>
                <Switch
                  isChecked={config.emailNotifications}
                  onChange={(e) => handleInputChange('emailNotifications', e.target.checked)}
                  colorScheme="blue"
                  isDisabled={true}
                />
              </FormControl>
            </VStack>
          </CardBody>
        </Card>

        <Divider />

        {}
        <HStack justify="space-between">
          <Button
            variant="outline"
            onClick={resetToDefaults}
            size="md"
          >
            Reset to Defaults
          </Button>
          
          <Button
            colorScheme="blue"
            onClick={saveConfiguration}
            isLoading={isLoading}
            loadingText="Saving..."
            leftIcon={<MdSave />}
            size="md"
          >
            Save Configuration
          </Button>
        </HStack>
      </VStack>
    </Box>
  );
};

export default AlertConfiguration;