// components/BlockchainLedger.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Flex,
  Text,
  useColorModeValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  VStack,
  HStack,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  Spinner,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Divider,
} from '@chakra-ui/react';
import { 
  MdBlockchain, 
  MdCheckCircle, 
  MdError, 
  MdPending,
  MdSearch,
  MdRefresh,
  MdAccountBalanceWallet,
  MdHistory,
  MdVerifiedUser
} from 'react-icons/md';
import { useCarbon } from 'contexts/CarbonContext';

export default function BlockchainLedger({ isOpen, onClose }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [carbonBalance, setCarbonBalance] = useState(0);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'navy.700');
  const borderColor = useColorModeValue('secondaryGray.200', 'whiteAlpha.100');
  const tableBg = useColorModeValue('white', 'navy.800');

  const { 
    getTransactionHistory, 
    verifyTransaction, 
    carbonBalance: contextBalance,
    refreshData
  } = useCarbon();

  const {
    isOpen: isDetailOpen,
    onOpen: onDetailOpen,
    onClose: onDetailClose
  } = useDisclosure();

  // ✅ Load transaction data
  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Loading transactions from database...');
      
      const data = await getTransactionHistory(100, 0);
      setTransactions(data);
      setCarbonBalance(contextBalance);
      
      console.log('✅ Loaded', data.length, 'transactions');
    } catch (err) {
      console.error('❌ Error loading transactions:', err);
      setError(err.message || 'Failed to load transaction history');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTransactions();
    }
  }, [isOpen]);

  // ✅ Filter transactions based on search and type
  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = searchTerm === '' || 
      tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.blockchainTxHash?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.building?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || tx.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // ✅ Get status properties
  const getStatusProps = (status) => {
    switch (status) {
      case 'verified':
        return { colorScheme: 'green', icon: MdCheckCircle, text: 'Verified' };
      case 'pending':
        return { colorScheme: 'orange', icon: MdPending, text: 'Pending' };
      case 'failed':
        return { colorScheme: 'red', icon: MdError, text: 'Failed' };
      default:
        return { colorScheme: 'gray', icon: MdPending, text: 'Unknown' };
    }
  };

  // ✅ Get transaction type display
  const getTypeDisplay = (type) => {
    switch (type) {
      case 'carbon_offset_purchase':
        return 'Carbon Offset';
      case 'energy_consumption':
        return 'Energy Usage';
      case 'ento_transfer':
        return 'ENTO Transfer';
      case 'carbon_credit_transfer':
        return 'Credit Transfer';
      default:
        return type.replace('_', ' ').toUpperCase();
    }
  };

  // ✅ Handle transaction verification
  const handleVerifyTransaction = async (txHash) => {
    try {
      setLoading(true);
      const result = await verifyTransaction(txHash);
      
      if (result.success) {
        // Update transaction status in local state
        setTransactions(prev => prev.map(tx => 
          tx.blockchainTxHash === txHash 
            ? { ...tx, verified: result.verified, confirmations: result.confirmations }
            : tx
        ));
      }
    } catch (error) {
      console.error('❌ Error verifying transaction:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show transaction details
  const showTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    onDetailOpen();
  };

  return (
    <>
      {/* ✅ Main Ledger Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="6xl">
        <ModalOverlay />
        <ModalContent bg={cardBg} maxH="80vh">
          <ModalHeader>
            <Flex align="center" justify="space-between">
              <HStack>
                <Icon as={MdBlockchain} w="24px" h="24px" color="blue.500" />
                <Text color={textColor} fontSize="lg" fontWeight="700">
                  Blockchain Transaction Ledger
                </Text>
              </HStack>
              <HStack>
                <Badge colorScheme="green" p="2">
                  <Icon as={MdAccountBalanceWallet} mr="1" />
                  Balance: {carbonBalance} Credits
                </Badge>
                <Button 
                  size="sm" 
                  leftIcon={<MdRefresh />}
                  onClick={() => { loadTransactions(); refreshData(); }}
                  isLoading={loading}
                >
                  Refresh
                </Button>
              </HStack>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody pb="24px">
            <VStack spacing="20px" align="stretch">
              {/* ✅ Filters and Search */}
              <HStack spacing="4">
                <InputGroup maxW="300px">
                  <InputLeftElement>
                    <Icon as={MdSearch} color="gray.400" />
                  </InputLeftElement>
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </InputGroup>
                
                <Select 
                  maxW="200px" 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <option value="all">All Types</option>
                  <option value="carbon_offset_purchase">Carbon Offsets</option>
                  <option value="energy_consumption">Energy Usage</option>
                  <option value="ento_transfer">ENTO Transfers</option>
                  <option value="carbon_credit_transfer">Credit Transfers</option>
                </Select>
              </HStack>

              {/* ✅ Transaction Statistics */}
              <HStack spacing="4" p="4" bg="gray.50" borderRadius="md">
                <Stat textAlign="center">
                  <Text fontSize="sm" color="gray.600">Total Transactions</Text>
                  <Text fontSize="xl" fontWeight="bold" color="blue.500">
                    {filteredTransactions.length}
                  </Text>
                </Stat>
                <Divider orientation="vertical" h="40px" />
                <Stat textAlign="center">
                  <Text fontSize="sm" color="gray.600">Verified</Text>
                  <Text fontSize="xl" fontWeight="bold" color="green.500">
                    {filteredTransactions.filter(tx => tx.status === 'verified').length}
                  </Text>
                </Stat>
                <Divider orientation="vertical" h="40px" />
                <Stat textAlign="center">
                  <Text fontSize="sm" color="gray.600">Pending</Text>
                  <Text fontSize="xl" fontWeight="bold" color="orange.500">
                    {filteredTransactions.filter(tx => tx.status === 'pending').length}
                  </Text>
                </Stat>
              </HStack>

              {/* ✅ Transactions Table */}
              {loading ? (
                <Flex justify="center" py="8">
                  <VStack>
                    <Spinner size="xl" color="blue.500" />
                    <Text>Loading transaction history...</Text>
                  </VStack>
                </Flex>
              ) : error ? (
                <Alert status="error">
                  <AlertIcon />
                  <AlertTitle>Error Loading Transactions</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : filteredTransactions.length === 0 ? (
                <Alert status="info">
                  <AlertIcon />
                  <AlertTitle>No Transactions Found</AlertTitle>
                  <AlertDescription>
                    No transactions match your current filters.
                  </AlertDescription>
                </Alert>
              ) : (
                <TableContainer bg={tableBg} borderRadius="md" border="1px" borderColor={borderColor}>
                  <Table variant="simple" size="sm">
                    <Thead>
                      <Tr>
                        <Th>Date</Th>
                        <Th>Type</Th>
                        <Th>Amount</Th>
                        <Th>Description</Th>
                        <Th>Status</Th>
                        <Th>Blockchain Hash</Th>
                        <Th>Actions</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {filteredTransactions.map((tx) => {
                        const statusProps = getStatusProps(tx.status);
                        return (
                          <Tr key={tx._id} _hover={{ bg: 'gray.50' }}>
                            <Td>
                              <Text fontSize="sm">
                                {new Date(tx.date).toLocaleDateString()}
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {new Date(tx.date).toLocaleTimeString()}
                              </Text>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" variant="subtle">
                                {getTypeDisplay(tx.type)}
                              </Badge>
                            </Td>
                            <Td>
                              <Text fontWeight="bold">
                                {tx.amount} {tx.type === 'energy_consumption' ? 'kWh' : 'ENTO'}
                              </Text>
                            </Td>
                            <Td>
                              <Text fontSize="sm" noOfLines={2} maxW="200px">
                                {tx.description}
                              </Text>
                              {tx.building && (
                                <Text fontSize="xs" color="gray.500">
                                  {tx.building}
                                </Text>
                              )}
                            </Td>
                            <Td>
                              <Badge 
                                colorScheme={statusProps.colorScheme} 
                                variant="subtle"
                                display="flex"
                                alignItems="center"
                                gap="1"
                                w="fit-content"
                              >
                                <Icon as={statusProps.icon} boxSize="3" />
                                {statusProps.text}
                              </Badge>
                              {tx.confirmations && (
                                <Text fontSize="xs" color="gray.500" mt="1">
                                  {tx.confirmations} confirmations
                                </Text>
                              )}
                            </Td>
                            <Td>
                              {tx.blockchainTxHash ? (
                                <Text 
                                  fontSize="xs" 
                                  fontFamily="mono"
                                  cursor="pointer"
                                  color="blue.500"
                                  onClick={() => navigator.clipboard.writeText(tx.blockchainTxHash)}
                                  title="Click to copy"
                                >
                                  {tx.blockchainTxHash.substring(0, 10)}...
                                </Text>
                              ) : (
                                <Text fontSize="xs" color="gray.400">
                                  No hash
                                </Text>
                              )}
                            </Td>
                            <Td>
                              <HStack spacing="2">
                                <Button 
                                  size="xs" 
                                  variant="outline"
                                  onClick={() => showTransactionDetails(tx)}
                                >
                                  View
                                </Button>
                                {tx.blockchainTxHash && tx.status === 'pending' && (
                                  <Button
                                    size="xs"
                                    colorScheme="blue"
                                    leftIcon={<MdVerifiedUser />}
                                    onClick={() => handleVerifyTransaction(tx.blockchainTxHash)}
                                    isLoading={loading}
                                  >
                                    Verify
                                  </Button>
                                )}
                              </HStack>
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* ✅ Transaction Details Modal */}
      <Modal isOpen={isDetailOpen} onClose={onDetailClose} size="md">
        <ModalOverlay />
        <ModalContent bg={cardBg}>
          <ModalHeader>
            <Text color={textColor}>Transaction Details</Text>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb="24px">
            {selectedTransaction && (
              <VStack spacing="4" align="stretch">
                <Box p="4" border="1px" borderColor={borderColor} borderRadius="md">
                  <Text fontWeight="bold" mb="2">Transaction Info</Text>
                  <VStack spacing="2" align="stretch">
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">ID:</Text>
                      <Text fontSize="sm" fontFamily="mono">
                        {selectedTransaction._id}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Type:</Text>
                      <Badge colorScheme="blue">
                        {getTypeDisplay(selectedTransaction.type)}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Amount:</Text>
                      <Text fontSize="sm" fontWeight="bold">
                        {selectedTransaction.amount} {selectedTransaction.type === 'energy_consumption' ? 'kWh' : 'ENTO'}
                      </Text>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Status:</Text>
                      <Badge colorScheme={getStatusProps(selectedTransaction.status).colorScheme}>
                        {getStatusProps(selectedTransaction.status).text}
                      </Badge>
                    </HStack>
                    <HStack justify="space-between">
                      <Text fontSize="sm" color="gray.600">Date:</Text>
                      <Text fontSize="sm">
                        {new Date(selectedTransaction.date).toLocaleString()}
                      </Text>
                    </HStack>
                  </VStack>
                </Box>

                {selectedTransaction.blockchainTxHash && (
                  <Box p="4" border="1px" borderColor={borderColor} borderRadius="md">
                    <Text fontWeight="bold" mb="2">Blockchain Info</Text>
                    <VStack spacing="2" align="stretch">
                      <HStack justify="space-between">
                        <Text fontSize="sm" color="gray.600">Hash:</Text>
                        <Text fontSize="xs" fontFamily="mono">
                          {selectedTransaction.blockchainTxHash}
                        </Text>
                      </HStack>
                      {selectedTransaction.blockNumber && (
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Block:</Text>
                          <Text fontSize="sm">#{selectedTransaction.blockNumber}</Text>
                        </HStack>
                      )}
                      {selectedTransaction.gasUsed && (
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Gas Used:</Text>
                          <Text fontSize="sm">{selectedTransaction.gasUsed.toLocaleString()}</Text>
                        </HStack>
                      )}
                      {selectedTransaction.confirmations && (
                        <HStack justify="space-between">
                          <Text fontSize="sm" color="gray.600">Confirmations:</Text>
                          <Text fontSize="sm">{selectedTransaction.confirmations}</Text>
                        </HStack>
                      )}
                    </VStack>
                  </Box>
                )}

                <Flex justify="flex-end">
                  <Button onClick={onDetailClose}>Close</Button>
                </Flex>
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
