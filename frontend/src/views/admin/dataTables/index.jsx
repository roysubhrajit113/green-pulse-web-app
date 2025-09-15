import {
  Box,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Text,
  Badge,
  HStack,
  Icon,
  useColorModeValue,
  Button,
  VStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  SimpleGrid,
  Flex,
  Spinner,
  useToast,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdBlock,
  MdCheckCircle,
  MdPending,
  MdError,
  MdRefresh,
  MdFilterList,
  MdDownload,
  MdVisibility,
  MdTrendingUp,
  MdAttachMoney,
  MdSchedule,
} from "react-icons/md";
import { useAuth } from "../../../contexts/AuthContext";
import { useInstitute } from "../../../contexts/InstituteContext";
import { useCarbon } from "../../../contexts/CarbonContext";


const BlockchainTransaction = ({ transaction, index }) => {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");

  const getStatusIcon = (status) => {
    switch (status) {
      case 'verified': return MdCheckCircle;
      case 'pending': return MdPending;
      case 'failed': return MdError;
      case 'inactive': return MdBlock;
      default: return MdSchedule;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified': return 'green';
      case 'pending': return 'yellow';
      case 'failed': return 'red';
      case 'inactive': return 'gray';
      case 'anomaly': return 'orange';
      default: return 'blue';
    }
  };

  const getProgressColor = (progress) => {
    if (progress >= 80) return 'green.500';
    if (progress >= 50) return 'yellow.500';
    return 'red.500';
  };


  const progress = transaction.status === 'verified' ? 100 : 
                  transaction.status === 'pending' ? 50 : 
                  transaction.confirmations ? Math.min(100, transaction.confirmations * 10) : 0;

  return (
    <Tr _hover={{ bg: useColorModeValue("gray.50", "gray.700") }}>
      <Td>
        <HStack spacing="3">
          <Icon
            as={getStatusIcon(transaction.status)}
            w="20px"
            h="20px"
            color={`${getStatusColor(transaction.status)}.500`}
          />
          <VStack align="start" spacing="0">
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {transaction.type?.replace('_', ' ').toUpperCase() || 'TRANSACTION'}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">
              {transaction.blockchainTxHash ? 
                transaction.blockchainTxHash.substring(0, 10) + '...' : 
                `ID: ${transaction._id?.substring(0, 8) || 'N/A'}`}
            </Text>
          </VStack>
        </HStack>
      </Td>
      <Td>
        <Badge
          colorScheme={getStatusColor(transaction.status || 'pending')}
          variant="subtle"
          fontSize="xs"
          textTransform="capitalize"
        >
          {transaction.status || 'pending'}
        </Badge>
      </Td>
      <Td>
        <VStack align="start" spacing="0">
          <Text color={textColorSecondary} fontSize="sm">
            {new Date(transaction.date || transaction.createdAt).toLocaleDateString()}
          </Text>
          <Text color={textColorSecondary} fontSize="xs">
            {new Date(transaction.date || transaction.createdAt).toLocaleTimeString()}
          </Text>
        </VStack>
      </Td>
      <Td>
        <HStack spacing="2">
          <Text
            color={getProgressColor(progress)}
            fontSize="sm"
            fontWeight="bold"
          >
            {progress}%
          </Text>
          <Box
            w="60px"
            h="4px"
            bg="gray.200"
            borderRadius="full"
            overflow="hidden"
          >
            <Box
              w={`${progress}%`}
              h="100%"
              bg={getProgressColor(progress)}
              borderRadius="full"
            />
          </Box>
        </HStack>
      </Td>
      <Td>
        <Text color={textColor} fontSize="sm" fontWeight="bold">
          {transaction.amount?.toLocaleString() || 0}
        </Text>
        {transaction.building && (
          <Text color={textColorSecondary} fontSize="xs">
            {transaction.building}
          </Text>
        )}
      </Td>
      <Td>
        <Text color={textColorSecondary} fontSize="sm">
          {transaction.amount ? `${transaction.amount} ENTO` : '-'}
        </Text>
        {transaction.consumption && (
          <Text color={textColorSecondary} fontSize="xs">
            {transaction.consumption} kWh
          </Text>
        )}
      </Td>
      <Td>
        <Button 
          size="xs" 
          colorScheme="blue" 
          variant="ghost"
          onClick={() => {

            const details = {
              id: transaction._id,
              type: transaction.type,
              amount: transaction.amount,
              description: transaction.description,
              building: transaction.building,
              status: transaction.status,
              date: new Date(transaction.date || transaction.createdAt).toLocaleString(),
              blockchainHash: transaction.blockchainTxHash
            };
            alert(JSON.stringify(details, null, 2));
          }}
        >
          Details
        </Button>
      </Td>
    </Tr>
  );
};

export default function EmissionsData() {

  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const brandColor = useColorModeValue("green.400", "green.300");


  const { user, isAuthenticated } = useAuth();
  const { currentInstitute } = useInstitute();
  const { getTransactionHistory, carbonBalance } = useCarbon();
  const toast = useToast();


  const [isLoading, setIsLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState(null);


  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔍 =================================');
      console.log('🔍 BLOCKCHAIN TRANSACTION FETCH:');
      console.log('🔍 =================================');
      console.log('  📊 User authenticated:', isAuthenticated);
      console.log('  👤 User:', user?.email);
      console.log('  🏫 Current institute:', currentInstitute?.name || user?.institute);
      

      if (!isAuthenticated || !user) {
        throw new Error('Please log in to view transactions');
      }
      

      const instituteId = currentInstitute?.name || user?.institute || 'default';
      
      if (!instituteId || instituteId === 'default') {
        throw new Error('No institute selected. Please select an institute.');
      }
      
      console.log('  🎯 Fetching for institute:', instituteId);
      

      const transactionData = await getTransactionHistory(100, 0);
      
      console.log('📊 Raw transaction data:', transactionData);
      
      if (!transactionData || transactionData.length === 0) {
        console.warn('⚠️ No transactions found');
        setTransactions([]);
        toast({
          title: "No Transactions Found",
          description: `No blockchain transactions found for ${instituteId}`,
          status: "info",
          duration: 4000,
          isClosable: true,
        });
        return;
      }


      const formattedTransactions = transactionData.map((tx, index) => ({
        id: tx._id || tx.id || `tx-${index}`,
        _id: tx._id || tx.id || `tx-${index}`,
        type: tx.type || 'unknown_transaction',
        status: tx.status || 'verified',
        date: tx.date || tx.createdAt || new Date().toISOString(),
        confirmations: tx.confirmations || 10,
        amount: parseFloat(tx.amount) || 0,
        blockchainTxHash: tx.blockchainTxHash || null,
        description: tx.description || '',
        building: tx.building || '',
        consumption: tx.consumption || 0,
        institute: tx.institute || tx.instituteId || instituteId
      }));


      formattedTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      console.log('✅ Formatted transactions:', formattedTransactions.length);
      setTransactions(formattedTransactions);
      

      toast({
        title: "Transactions Loaded",
        description: `Successfully loaded ${formattedTransactions.length} transactions`,
        status: "success",
        duration: 4000,
        isClosable: true,
      });
      
    } catch (err) {
      console.error('💥 Transaction fetch error:', err);
      setError(err.message);
      setTransactions([]);
      

      toast({
        title: "Failed to Load Transactions",
        description: err.message,
        status: "error",
        duration: 6000,
        isClosable: true,
      });
      

      if (err.message.includes('Authentication') || err.message.includes('log in')) {
        setTimeout(() => {
          window.location.href = '/auth/sign-in';
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };


  useEffect(() => {
    console.log('🔄 useEffect triggered:', {
      isAuthenticated,
      hasUser: !!user,
      institute: currentInstitute?.name || user?.institute
    });
    
    if (isAuthenticated && user && (currentInstitute || user?.institute)) {
      fetchTransactions();
    } else {
      if (!isAuthenticated) {
        setError('Please log in to view transactions');
      } else if (!currentInstitute && !user?.institute) {
        setError('Please select an institute to view transactions');
      }
    }
  }, [isAuthenticated, user, currentInstitute]);

  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    fetchTransactions();
  };

  const handleExport = () => {
    console.log("📥 Export transactions requested");
    
    if (transactions.length === 0) {
      toast({
        title: "No Data to Export",
        description: "No transactions available to export",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }


    const csvHeaders = ['Type', 'Status', 'Date', 'Amount', 'Description', 'Building', 'Hash'];
    const csvData = transactions.map(tx => [
      tx.type,
      tx.status,
      new Date(tx.date).toLocaleString(),
      tx.amount,
      tx.description,
      tx.building || '',
      tx.blockchainTxHash || tx._id
    ]);
    
    const csvContent = [csvHeaders, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `blockchain-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Transaction data exported to CSV file",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };


  if (!isAuthenticated) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} textAlign="center">
        <Card p="40px" maxW="500px" mx="auto">
          <VStack spacing="20px">
            <Icon as={MdError} w="60px" h="60px" color="orange.500" />
            <Heading size="lg" color={textColor}>Authentication Required</Heading>
            <Text color={textColorSecondary}>Please log in to view blockchain transactions.</Text>
            <Button colorScheme="blue" onClick={() => window.location.href = '/auth/sign-in'}>
              Go to Login
            </Button>
          </VStack>
        </Card>
      </Box>
    );
  }


  const totalTransactions = transactions.length;
  const verifiedTransactions = transactions.filter(tx => tx.status === 'verified').length;
  const totalValue = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const averageProgress = transactions.length > 0 
    ? transactions.reduce((sum, tx) => {
        const progress = tx.status === 'verified' ? 100 : tx.status === 'pending' ? 50 : 0;
        return sum + progress;
      }, 0) / totalTransactions
    : 0;

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="4xl" fontWeight="bold" mb="2">
            🔗 Blockchain Transactions
          </Heading>
          <Text color={textColorSecondary} fontSize="lg">
            Real-time carbon credit and energy token transactions for {currentInstitute?.name || user?.institute || 'your institute'}
          </Text>
        </Box>
        <HStack spacing="3">
          <Button
            leftIcon={<Icon as={MdFilterList} />}
            colorScheme="gray"
            variant="outline"
            size="sm"
          >
            Filter
          </Button>
          <Button
            leftIcon={<Icon as={MdDownload} />}
            colorScheme="blue"
            variant="outline"
            size="sm"
            onClick={handleExport}
            isDisabled={transactions.length === 0}
          >
            Export
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isLoading}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {}
      <SimpleGrid columns={{ base: 1, md: 4 }} gap="20px" mb="30px">
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Transactions</StatLabel>
            <StatNumber color={brandColor} fontSize="2xl" fontWeight="bold">
              {totalTransactions}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdBlock} mr="1" />
              Database Records
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Verified</StatLabel>
            <StatNumber color="green.500" fontSize="2xl" fontWeight="bold">
              {verifiedTransactions}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdCheckCircle} mr="1" />
              {totalTransactions > 0 ? Math.round((verifiedTransactions / totalTransactions) * 100) : 0}% Success Rate
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Value</StatLabel>
            <StatNumber color="blue.500" fontSize="2xl" fontWeight="bold">
              {totalValue.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdAttachMoney} mr="1" />
              ENTO Tokens
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Balance</StatLabel>
            <StatNumber color="purple.500" fontSize="2xl" fontWeight="bold">
              {carbonBalance || 0}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdTrendingUp} mr="1" />
              Carbon Credits
            </StatHelpText>
          </Stat>
        </Card>
      </SimpleGrid>

      {}
      <Card bg={cardBg} borderColor={borderColor}>
        <CardHeader>
          <HStack justify="space-between" align="center">
            <Heading size="lg" color={textColor}>
              Transaction History from Database
            </Heading>
            <HStack spacing="2">
              <Button size="sm" variant="outline" leftIcon={<Icon as={MdVisibility} />}>
                View Details
              </Button>
            </HStack>
          </HStack>
        </CardHeader>
        <CardBody>
          {isLoading ? (
            <Flex justify="center" align="center" h="200px" direction="column">
              <Spinner size="xl" color="green.500" />
              <Text mt="4" color={textColorSecondary}>Loading blockchain transactions...</Text>
              <Text fontSize="sm" color={textColorSecondary} mt="2">
                Fetching data for {currentInstitute?.name || user?.institute || 'your institute'}
              </Text>
            </Flex>
          ) : error ? (
            <Flex justify="center" align="center" h="200px" direction="column">
              <Icon as={MdError} w="40px" h="40px" color="red.500" mb="2" />
              <Text color="red.500" textAlign="center" mb="2" fontWeight="bold">
                Transaction Loading Failed
              </Text>
              <Text color="red.500" textAlign="center" mb="4" fontSize="sm" maxW="400px">
                {error}
              </Text>
              <HStack spacing="3">
                <Button onClick={handleRefresh} size="sm" colorScheme="blue">
                  Try Again
                </Button>
                <Button 
                  onClick={() => console.log('🔍 Debug info:', { isAuthenticated, user, currentInstitute, transactions: transactions.length })} 
                  size="sm" 
                  variant="outline"
                >
                  Debug Info
                </Button>
              </HStack>
            </Flex>
          ) : (
            <TableContainer>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th color={textColorSecondary}>Transaction</Th>
                    <Th color={textColorSecondary}>Status</Th>
                    <Th color={textColorSecondary}>Date</Th>
                    <Th color={textColorSecondary}>Progress</Th>
                    <Th color={textColorSecondary}>Amount</Th>
                    <Th color={textColorSecondary}>Value</Th>
                    <Th color={textColorSecondary}>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {transactions.length > 0 ? (
                    transactions.map((transaction, index) => (
                      <BlockchainTransaction
                        key={transaction.id || transaction._id || index}
                        transaction={transaction}
                        index={index}
                      />
                    ))
                  ) : (
                    <Tr>
                      <Td colSpan={7} textAlign="center" py="8">
                        <VStack spacing="3">
                          <Icon as={MdBlock} w="40px" h="40px" color="gray.400" />
                          <Text color={textColorSecondary} fontWeight="bold">
                            No transactions found
                          </Text>
                          <Text color={textColorSecondary} fontSize="sm" textAlign="center">
                            No blockchain transactions found for <strong>{currentInstitute?.name || user?.institute || 'your institute'}</strong>.
                            <br />
                            Try refreshing or performing some transactions first.
                          </Text>
                          <Button onClick={handleRefresh} size="sm" colorScheme="blue" mt="2">
                            Refresh Data
                          </Button>
                        </VStack>
                      </Td>
                    </Tr>
                  )}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </CardBody>
      </Card>
    </Box>
  );
}
