import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  SimpleGrid,
  Text,
  Icon,
  Badge,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Button,
  Flex,
  useToast,
  Spinner,
  IconButton,
  Tooltip
} from '@chakra-ui/react';
import { 
  MdWarning, 
  MdError, 
  MdInfo, 
  MdCheckCircle,
  MdNotifications,
  MdExpandMore,
  MdExpandLess,
  MdRefresh,
  MdBuild,
  MdElectricalServices
} from 'react-icons/md';
import apiClient from '../../services/apiClient';
import { 
  useColorModeValue 
} from '@chakra-ui/react';

const MeterAlertSystem = ({ userId }) => {
  const [alerts, setAlerts] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alertSummary, setAlertSummary] = useState({});
  const toast = useToast();
  
  // Dark mode color values - moved to top level
  const timestampTextColor = useColorModeValue("gray.600", "gray.300");
  const alertSummaryBgColor = useColorModeValue("gray.50", "gray.700");
  
  // Dark mode colors for "No Active Alerts" section
  const noAlertsBgColor = useColorModeValue("green.50", "green.900");
  const noAlertsBorderColor = useColorModeValue("green.200", "green.700");
  const noAlertsIconColor = useColorModeValue("green.500", "green.200");
  const noAlertsTitleColor = useColorModeValue("green.800", "white");
  const noAlertsDescColor = useColorModeValue("green.700", "green.100");

  // Alert severity configurations
  const severityConfig = {
    critical: { 
      color: 'red', 
      icon: MdError, 
      bgColor: useColorModeValue('red.50', 'red.900'), 
      borderColor: useColorModeValue('red.200', 'red.700'),
      textColor: useColorModeValue('gray.800', 'white')
    },
    high: { 
      color: 'orange', 
      icon: MdWarning, 
      bgColor: useColorModeValue('orange.50', 'orange.900'), 
      borderColor: useColorModeValue('orange.200', 'orange.700'),
      textColor: useColorModeValue('gray.800', 'white')
    },
    medium: { 
      color: 'yellow', 
      icon: MdWarning, 
      bgColor: useColorModeValue('yellow.50', 'yellow.900'), 
      borderColor: useColorModeValue('yellow.200', 'yellow.700'),
      textColor: useColorModeValue('gray.800', 'white')
    },
    low: { 
      color: 'blue', 
      icon: MdInfo, 
      bgColor: useColorModeValue('blue.50', 'blue.900'), 
      borderColor: useColorModeValue('blue.200', 'blue.700'),
      textColor: useColorModeValue('gray.800', 'white')
    }
  };

  // Fetch user alerts
  const fetchAlerts = async (showToast = false) => {
    try {
      const response = await apiClient.get('/alerts', {
        params: { status: 'active', limit: 20 }
      });
      if (response.data.success) {
        setAlerts(response.data.data.alerts);
        if (showToast && response.data.data.alerts.length > 0) {
          toast({
            title: 'Alerts Updated',
            description: `Found ${response.data.data.alerts.length} active alerts`,
            status: 'info',
            duration: 3000,
            isClosable: true
          });
        }
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
      if (showToast) {
        toast({
          title: 'Error',
          description: 'Failed to fetch alerts',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch alert summary
  const fetchAlertSummary = async () => {
    try {
      const response = await apiClient.get('/alerts/summary');
      if (response.data.success) {
        setAlertSummary(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching alert summary:', error);
    }
  };

  // Manual refresh/check for new alerts
  const checkForNewAlerts = async () => {
    setIsRefreshing(true);
    try {
      const checkResponse = await apiClient.post('/alerts/check', {});
      if (checkResponse.data.success) {
        const alertsGenerated = checkResponse.data.data.alerts_generated;
        if (alertsGenerated > 0) {
          toast({
            title: 'New Alerts Generated',
            description: `Found ${alertsGenerated} new meter reading alerts`,
            status: 'warning',
            duration: 5000,
            isClosable: true
          });
        } else {
          toast({
            title: 'No New Alerts',
            description: 'All meter readings are within normal range',
            status: 'success',
            duration: 3000,
            isClosable: true
          });
        }
        await fetchAlerts();
        await fetchAlertSummary();
      }
    } catch (error) {
      console.error('Error checking for new alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to check for new alerts',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Acknowledge alert - FIXED VERSION
  const acknowledgeAlert = async (alertId) => {
    try {
      const response = await apiClient.patch(`/alerts/${alertId}/acknowledge`, {});
      if (response.data.success) {
        // Instead of optimistic update, refetch the data to ensure consistency
        await fetchAlerts();
        await fetchAlertSummary();
        toast({
          title: 'Alert Acknowledged',
          description: 'Alert has been marked as acknowledged',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Resolve alert - FIXED VERSION
  const resolveAlert = async (alertId) => {
    try {
      const response = await apiClient.patch(`/alerts/${alertId}/resolve`, {});
      if (response.data.success) {
        // Instead of optimistic update, refetch the data to ensure consistency
        await fetchAlerts();
        await fetchAlertSummary();
        toast({
          title: 'Alert Resolved',
          description: 'Alert has been marked as resolved',
          status: 'success',
          duration: 3000,
          isClosable: true
        });
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve alert',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  // Initial load
  useEffect(() => {
    fetchAlerts();
    fetchAlertSummary();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const visibleAlerts = isExpanded ? alerts : alerts.slice(0, 3);

  if (isLoading) {
    return (
      <Box w="100%" maxW="600px" textAlign="center" py={8}>
        <Spinner size="lg" />
        <Text mt={4}>Loading alerts...</Text>
      </Box>
    );
  }

  return (
    <Box w="100%" maxW="1200px" mx="auto">
      <Flex align="center" justify="space-between" mb={4}>
        <HStack>
          <Icon as={MdElectricalServices} w={5} h={5} color="blue.500" />
          <Text fontSize="lg" fontWeight="bold">
            Energy Meter Alerts
          </Text>
          {alertSummary.total_active > 0 && (
            <Badge colorScheme="red" variant="solid">
              {alertSummary.total_active}
            </Badge>
          )}
        </HStack>
        
        <HStack>
          <Tooltip label="Check for new alerts">
            <IconButton
              icon={isRefreshing ? <Spinner size="sm" /> : <MdRefresh />}
              onClick={checkForNewAlerts}
              size="sm"
              variant="ghost"
              isLoading={isRefreshing}
              aria-label="Refresh alerts"
            />
          </Tooltip>
          {alerts.length > 3 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              rightIcon={isExpanded ? <MdExpandLess /> : <MdExpandMore />}
            >
              {isExpanded ? 'Show Less' : 'Show All'}
            </Button>
          )}
        </HStack>
      </Flex>

      {visibleAlerts.length === 0 ? (
        <Alert 
          borderRadius="md" 
          bg={noAlertsBgColor}                    // ✅ Dark mode: green.900
          borderColor={noAlertsBorderColor}       // ✅ Dark mode: green.700
          borderWidth="1px"
          color={noAlertsTitleColor}              // ✅ Dark mode: white
        >
          <AlertIcon color={noAlertsIconColor} />  {/* ✅ Dark mode: green.200 */}
          <Box>
            <AlertTitle color={noAlertsTitleColor}>No Active Meter Alerts</AlertTitle>  {/* ✅ Dark mode: white */}
            <AlertDescription color={noAlertsDescColor}>  {/* ✅ Dark mode: green.100 */}
              All energy meters are operating within normal parameters.
            </AlertDescription>
          </Box>
        </Alert>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} w="100%">
          {visibleAlerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.medium;
            return (
              <Alert
                key={alert._id}
                borderRadius="md"
                bg={config.bgColor}
                borderColor={config.borderColor}
                borderWidth="1px"
                position="relative"
                py={4}
                w="100%"
                minW={0}
                flex="1"
                display="flex"
                alignItems="flex-start"
              >
                <Icon as={config.icon} color={`${config.color}.500`} w={5} h={5} />
                <Box flex="1" ml={3}>
                  <AlertTitle fontSize="sm" display="flex" alignItems="center">
                    <Icon as={MdBuild} mr={2} />
                    {alert.building_name}
                    <Badge
                      ml={2}
                      colorScheme={config.color}
                      size="sm"
                      variant="solid"
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription fontSize="sm" mt={1} color={config.textColor}>
                    {alert.message}
                  </AlertDescription>
                  <Text fontSize="xs" color={timestampTextColor} mt={2}>
                    {formatTimestamp(alert.timestamp)} • Institute: {alert.institute}
                  </Text>
                  <HStack mt={3} spacing={2}>
                    <Button
                      size="xs"
                      colorScheme="blue"
                      variant="outline"
                      onClick={() => acknowledgeAlert(alert._id)}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="xs"
                      colorScheme="green"
                      variant="outline"
                      onClick={() => resolveAlert(alert._id)}
                    >
                      Mark Resolved
                    </Button>
                  </HStack>
                </Box>
              </Alert>
            );
          })}
        </SimpleGrid>
      )}

      {/* Alert Summary */}
      {Object.keys(alertSummary).length > 0 && (
        <Box mt={4} p={3} bg={alertSummaryBgColor} borderRadius="md" fontSize="sm">
          <Text fontWeight="bold" mb={2}>Alert Summary:</Text>
          <HStack spacing={4}>
            <Text>Active: <Badge colorScheme="red">{alertSummary.total_active || 0}</Badge></Text>
            <Text>Acknowledged: <Badge colorScheme="yellow">{alertSummary.total_acknowledged || 0}</Badge></Text>
            <Text>Resolved: <Badge colorScheme="green">{alertSummary.total_resolved || 0}</Badge></Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
};

export default MeterAlertSystem;
