
import {
  Box,
  Button,
  Flex,
  Icon,
  Text,
  useColorModeValue,
  Select,
  Spinner,
  Badge,
  Tooltip,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  VStack,
  HStack,
} from "@chakra-ui/react";
import Card from "components/card/CarbonCard.js";

import BarChart from "components/charts/BarChart";
import React, { useState, useEffect } from "react";
import {
  barChartOptionsConsumption,
} from "variables/charts";
import { MdBarChart, MdInfo, MdRefresh, MdWarning, MdCheckCircle, MdError } from "react-icons/md";
import { useCarbon } from "contexts/CarbonContext";

export default function WeeklyRevenue(props) {
  const { ...rest } = props;


  const textColor = useColorModeValue("secondaryGray.900", "white");
  const iconColor = useColorModeValue("brand.500", "white");
  const bgButton = useColorModeValue("secondaryGray.300", "whiteAlpha.100");
  const bgHover = useColorModeValue(
    { bg: "secondaryGray.400" },
    { bg: "whiteAlpha.50" }
  );
  const bgFocus = useColorModeValue(
    { bg: "secondaryGray.300" },
    { bg: "whiteAlpha.100" }
  );


  const { getWeeklyEnergyData } = useCarbon();
  const [weeklyEnergyData, setWeeklyEnergyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [institutions, setInstitutions] = useState([]);
  const [dataSource, setDataSource] = useState('loading');
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);


  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 WeeklyRevenue: Starting data fetch...');
      
      const data = await getWeeklyEnergyData();
      console.log('📊 WeeklyRevenue: Raw data received:', data);
      
      if (!data || data.length === 0) {
        console.warn('⚠️ WeeklyRevenue: No data received from API');
        setError('No weekly energy data available');
        setDataSource('error');
        setWeeklyEnergyData([]);
        return;
      }


      const validData = data.filter(item => 
        item && 
        typeof item === 'object' && 
        item.name && 
        Array.isArray(item.data) && 
        item.data.length === 7
      );

      if (validData.length === 0) {
        console.warn('⚠️ WeeklyRevenue: No valid data items found');
        setError('Invalid data format received');
        setDataSource('error');
        setWeeklyEnergyData([]);
        return;
      }

      console.log('✅ WeeklyRevenue: Valid data items:', validData.length);
      setWeeklyEnergyData(validData);
      

      const uniqueInstitutions = [...new Set(validData.map(item => {
        const nameParts = item.name.split(' - ');
        return nameParts.length > 1 ? nameParts[0] : 'Unknown Institute';
      }))].filter(inst => inst && inst !== 'Unknown Institute');
      
      console.log('🏫 WeeklyRevenue: Extracted institutions:', uniqueInstitutions);
      setInstitutions(uniqueInstitutions);
      

      const source = validData.length > 0 && validData[0].source === 'mongodb' ? 'mongodb' : 'sample';
      console.log('📡 WeeklyRevenue: Data source detected:', source);
      setDataSource(source);
      setLastUpdated(new Date());
      
    } catch (error) {
      console.error('❌ WeeklyRevenue: Error fetching data:', error);
      setError(error.message || 'Failed to fetch weekly energy data');
      setDataSource('error');
      setWeeklyEnergyData([]);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    console.log('🔄 WeeklyRevenue: useEffect triggered with getWeeklyEnergyData:', typeof getWeeklyEnergyData);
    if (getWeeklyEnergyData) {
      fetchData();
    } else {
      console.error('❌ WeeklyRevenue: getWeeklyEnergyData is not available from context');
      setError('Energy data service not available');
      setDataSource('error');
      setLoading(false);
    }
  }, [getWeeklyEnergyData]);


  const filteredData = selectedInstitution === 'all' 
    ? weeklyEnergyData 
    : weeklyEnergyData.filter(item => {
        if (!item || !item.name) return false;
        return item.name.toLowerCase().includes(selectedInstitution.toLowerCase());
      });


  const getBadgeProps = () => {
    switch(dataSource) {
      case 'mongodb': 
        return { colorScheme: 'green', icon: MdCheckCircle, text: 'Live Data' };
      case 'sample': 
        return { colorScheme: 'orange', icon: MdWarning, text: 'Sample Data' };
      case 'fallback':
        return { colorScheme: 'yellow', icon: MdInfo, text: 'Fallback Data' };
      case 'error': 
        return { colorScheme: 'red', icon: MdError, text: 'Error' };
      default: 
        return { colorScheme: 'gray', icon: MdInfo, text: 'Loading' };
    }
  };

  const badgeProps = getBadgeProps();


  const handleRefresh = async () => {
    console.log('🔄 WeeklyRevenue: Manual refresh triggered');
    await fetchData();
  };


  const handleResetFilter = () => {
    setSelectedInstitution('all');
    setError(null);
  };

  return (
    <Card align='center' direction='column' w='100%' {...rest}>
      {}
      <Box w='100%' px='15px' py='10px'>
        {}
        <Flex justify="space-between" align="center" mb="3">
          <Text
            color={textColor}
            fontSize='xl'
            fontWeight='700'
            lineHeight='100%'
            flex="1"
          >
            Weekly Energy Consumption
          </Text>
          
          {}
          <HStack spacing="2" flexShrink="0">
            <Select
              value={selectedInstitution}
              onChange={(e) => setSelectedInstitution(e.target.value)}
              size='sm'
              variant='filled'
              minW="150px"
              maxW="200px"
              isDisabled={loading || institutions.length === 0}
            >
              <option value='all'>All Institutions</option>
              {institutions.map((inst, index) => (
                <option key={index} value={inst}>{inst}</option>
              ))}
            </Select>
            
            <Button
              onClick={handleRefresh}
              isLoading={loading}
              loadingText="Refreshing"
              bg={bgButton}
              _hover={bgHover}
              _focus={bgFocus}
              _active={bgFocus}
              size="sm"
              minW="auto"
              px="3"
            >
              <Icon as={MdRefresh} boxSize="4" />
            </Button>
            
            <Button
              align='center'
              justifyContent='center'
              bg={bgButton}
              _hover={bgHover}
              _focus={bgFocus}
              _active={bgFocus}
              w='37px'
              h='37px'
              lineHeight='100%'
              borderRadius='10px'
              {...rest}
            >
              <Icon as={MdBarChart} color={iconColor} w='24px' h='24px' />
            </Button>
          </HStack>
        </Flex>

        {}
        <Flex 
          align="center" 
          wrap="wrap" 
          gap="3"
          justify="space-between"
        >
          <HStack spacing="3" flex="1" minW="0">
            <Badge 
              colorScheme={badgeProps.colorScheme} 
              variant="solid"
              display="flex" 
              alignItems="center" 
              gap="1"
              flexShrink="0"
            >
              <Icon as={badgeProps.icon} boxSize="3" />
              {badgeProps.text}
            </Badge>
            
            {dataSource === 'sample' && (
              <Tooltip 
                label="Using sample data as real-time data is unavailable for your institute" 
                placement="bottom"
              >
                <Icon as={MdInfo} color="orange.500" boxSize="4" cursor="help" />
              </Tooltip>
            )}
          </HStack>

          <HStack spacing="3" flexShrink="0">
            {dataSource === 'mongodb' && lastUpdated && (
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                Updated: {lastUpdated.toLocaleTimeString()}
              </Text>
            )}

            {filteredData.length > 0 && (
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
                {filteredData.length} department{filteredData.length !== 1 ? 's' : ''}
              </Text>
            )}
          </HStack>
        </Flex>
      </Box>

      <Box h='240px' w='100%' mt='auto'>
        {loading ? (
          <Flex justify='center' align='center' h='100%' direction="column" gap="3">
            <Spinner size='xl' color='brand.500' thickness='4px' />
            <VStack spacing="1">
              <Text color={textColor} fontSize="md" fontWeight="medium">
                Loading Energy Data...
              </Text>
              <Text color="gray.500" fontSize="sm">
                Fetching weekly consumption patterns
              </Text>
            </VStack>
          </Flex>
        ) : error ? (
          <Flex justify='center' align='center' h='100%' p="4">
            <Alert 
              status='error' 
              variant='subtle' 
              flexDirection='column' 
              alignItems='center'
              justifyContent='center'
              textAlign='center'
              borderRadius="md"
            >
              <AlertIcon boxSize='40px' mr={0} />
              <AlertTitle mt={4} mb={1} fontSize='lg'>
                Data Load Failed
              </AlertTitle>
              <AlertDescription maxWidth='sm' fontSize="sm">
                {error}
              </AlertDescription>
              <HStack mt="4" spacing="3">
                <Button size="sm" colorScheme="blue" onClick={handleRefresh}>
                  Try Again
                </Button>
                {selectedInstitution !== 'all' && (
                  <Button size="sm" variant="outline" onClick={handleResetFilter}>
                    Show All
                  </Button>
                )}
              </HStack>
            </Alert>
          </Flex>
        ) : filteredData.length > 0 ? (
          <BarChart
            chartData={filteredData}
            chartOptions={{
              ...barChartOptionsConsumption,
              xaxis: {
                ...barChartOptionsConsumption.xaxis,
                categories: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
              },
              title: {
                text: selectedInstitution === 'all' 
                  ? 'All Institutions - Weekly Energy Consumption' 
                  : `${selectedInstitution} - Weekly Energy Consumption`,
                align: 'left',
                style: {
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: textColor
                }
              }
            }}
          />
        ) : (
          <Flex justify='center' align='center' h='100%' direction="column" p="4">
            <Alert 
              status='info' 
              variant='subtle' 
              flexDirection='column' 
              alignItems='center'
              justifyContent='center'
              textAlign='center'
              borderRadius="md"
            >
              <AlertIcon boxSize='40px' mr={0} />
              <AlertTitle mt={4} mb={1} fontSize='lg'>
                No Data Available
              </AlertTitle>
              <AlertDescription maxWidth='sm' fontSize="sm">
                {selectedInstitution === 'all' 
                  ? 'No energy consumption data found for any institution'
                  : `No energy data available for "${selectedInstitution}"`
                }
              </AlertDescription>
              <HStack mt="4" spacing="3">
                <Button size="sm" colorScheme="blue" onClick={handleRefresh}>
                  Refresh Data
                </Button>
                {selectedInstitution !== 'all' && (
                  <Button size="sm" variant="outline" onClick={handleResetFilter}>
                    View All Data
                  </Button>
                )}
              </HStack>
            </Alert>
          </Flex>
        )}
      </Box>
    </Card>
  );
}
