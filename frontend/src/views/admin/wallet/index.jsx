import {
  Box,
  Text,
  Button,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  Heading,
  Badge,
  VStack,
  HStack,
  Progress,
  useToast,
  Spinner,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  ModalFooter,
  Input,
  FormControl,
  FormLabel,
  Select,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdBatteryChargingFull,
  MdAttachMoney,
  MdSchedule,
  MdBuild,
  MdAdd,
  MdPayment,
  MdRefresh,
  MdSettings,
  MdTrendingUp,
  MdError,
  MdCheckCircle,
} from "react-icons/md";

// Import contexts
import { useAuth } from "contexts/AuthContext";
import { useCarbon } from "contexts/CarbonContext";
import walletService from "services/walletService";

// Energy Pack Card Component
const EnergyPackCard = ({ energyPack, onUpgrade, onCharge, loading }) => {
  // ✅ ALL HOOKS AT TOP LEVEL
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const successColor = useColorModeValue("green.500", "green.300");

  if (!energyPack) {
    return (
      <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
        <CardBody>
          <VStack spacing="4" py="8">
            <Icon as={MdBatteryChargingFull} w="60px" h="60px" color={textColorSecondary} />
            <Heading size="md" color={textColor}>No Energy Pack</Heading>
            <Text color={textColorSecondary} textAlign="center">
              You don't have an active energy pack. Purchase one to start managing your energy consumption.
            </Text>
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="green"
              size="lg"
              onClick={onUpgrade}
              isLoading={loading}
            >
              Purchase Energy Pack
            </Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  const capacityPercentage = Math.round((energyPack.remainingEnergy / energyPack.totalCapacity) * 100);
  const efficiency = energyPack.efficiency || 92;
  const dailyUsage = energyPack.dailyUsage || 0;
  
  return (
    <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="lg" color={textColor}>
            Current Energy Pack
          </Heading>
          <Badge 
            colorScheme={energyPack.status === 'active' ? 'green' : 'orange'} 
            variant="solid" 
            px="3" 
            py="1" 
            borderRadius="full"
          >
            {energyPack.status?.toUpperCase() || 'ACTIVE'}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="30px">
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Current Capacity
            </Text>
            <Text color={textColor} fontSize="3xl" fontWeight="bold">
              {capacityPercentage}%
            </Text>
            <Progress 
              value={capacityPercentage} 
              colorScheme={capacityPercentage > 50 ? "green" : capacityPercentage > 20 ? "yellow" : "red"} 
              size="lg" 
              w="100%" 
              borderRadius="full" 
            />
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Energy
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {energyPack.remainingEnergy || 0} kWh
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              of {energyPack.totalCapacity || 0} kWh total
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Daily Usage
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {dailyUsage} kWh
            </Text>
            <Text color={successColor} fontSize="sm" fontWeight="bold">
              {energyPack.usageChange > 0 ? '▲' : '▼'} {Math.abs(energyPack.usageChange || 0)}% from yesterday
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Efficiency
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {efficiency}%
            </Text>
            <Text color={successColor} fontSize="sm" fontWeight="bold">
              ▲ {energyPack.efficiencyImprovement || 0}% improvement
            </Text>
          </VStack>
        </SimpleGrid>
        
        <VStack spacing="4" align="stretch" mb="30px">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">
              Last Charged: {energyPack.lastCharged || 'Never'}
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Next Maintenance: {energyPack.nextMaintenance || 'Not scheduled'}
            </Text>
          </HStack>
        </VStack>
        
        <HStack spacing="3" justify="center" flexWrap="wrap">
          <Button
            leftIcon={<Icon as={MdBatteryChargingFull} />}
            colorScheme="green"
            size="md"
            onClick={onCharge}
            isLoading={loading}
            isDisabled={capacityPercentage >= 100}
          >
            {capacityPercentage >= 100 ? 'Fully Charged' : 'Start Charging'}
          </Button>
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="blue"
            variant="outline"
            size="md"
            onClick={onUpgrade}
            isLoading={loading}
          >
            Upgrade Pack
          </Button>
          <Button
            leftIcon={<Icon as={MdSettings} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Optimize Usage
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

// Current Loan Card Component
const CurrentLoanCard = ({ loan, onPayment, onRefinance, loading }) => {
  // ✅ ALL HOOKS AT TOP LEVEL
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");

  if (!loan) {
    return (
      <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
        <CardBody>
          <VStack spacing="4" py="8">
            <Icon as={MdAttachMoney} w="60px" h="60px" color={textColorSecondary} />
            <Heading size="md" color={textColor}>No Active Loan</Heading>
            <Text color={textColorSecondary} textAlign="center">
              You don't have any active loans. Apply for a green energy loan to fund your sustainability projects.
            </Text>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  const progressPercentage = Math.round(((loan.totalAmount - loan.remainingBalance) / loan.totalAmount) * 100);

  return (
    <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
      <CardHeader>
        <HStack justify="space-between" align="center">
          <Heading size="lg" color={textColor}>
            Current Loan
          </Heading>
          <Badge 
            colorScheme={loan.status === 'active' ? 'blue' : 'gray'} 
            variant="solid" 
            px="3" 
            py="1" 
            borderRadius="full"
          >
            {loan.status?.toUpperCase() || 'ACTIVE'}
          </Badge>
        </HStack>
      </CardHeader>
      <CardBody>
        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="30px">
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Balance
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {(loan.remainingBalance || 0).toLocaleString()} ENTO
            </Text>
            <Progress 
              value={progressPercentage} 
              colorScheme="blue" 
              size="md" 
              w="100%" 
              borderRadius="full" 
            />
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Monthly Payment
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {(loan.monthlyPayment || 0).toLocaleString()} ENTO
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Due {loan.nextPaymentDate || 'Not set'}
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Interest Rate
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {loan.interestRate || 0}%
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              Annual rate
            </Text>
          </VStack>
          
          <VStack spacing="2" align="center">
            <Text color={textColorSecondary} fontSize="sm" fontWeight="medium">
              Remaining Payments
            </Text>
            <Text color={textColor} fontSize="2xl" fontWeight="bold">
              {loan.remainingPayments || 0}
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              of {loan.totalPayments || 0} total
            </Text>
          </VStack>
        </SimpleGrid>
        
        <VStack spacing="4" align="stretch" mb="30px">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">
              <Text as="span" fontWeight="bold">Loan Type:</Text> {loan.loanType || 'Green Energy Investment'}
            </Text>
            <Text color={textColorSecondary} fontSize="sm">
              <Text as="span" fontWeight="bold">Start Date:</Text> {loan.startDate || 'Not set'}
            </Text>
          </HStack>
        </VStack>
        
        <HStack spacing="3" justify="center" flexWrap="wrap">
          <Button
            leftIcon={<Icon as={MdPayment} />}
            colorScheme="green"
            size="md"
            onClick={onPayment}
            isLoading={loading}
          >
            Make Payment
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="gray"
            variant="outline"
            size="md"
            onClick={onRefinance}
            isLoading={loading}
          >
            Refinance
          </Button>
          <Button
            leftIcon={<Icon as={MdSchedule} />}
            colorScheme="gray"
            variant="outline"
            size="md"
          >
            Payment Schedule
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};

// Payment Modal Component
const PaymentModal = ({ isOpen, onClose, loan, onConfirmPayment, loading }) => {
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('regular');
  
  // ✅ ALL HOOKS AT TOP LEVEL
  const textColor = useColorModeValue("navy.700", "white");

  const handlePayment = () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) return;
    onConfirmPayment({
      amount: parseFloat(paymentAmount),
      type: paymentType,
      loanId: loan?._id
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color={textColor}>Make Loan Payment</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="4">
            <FormControl>
              <FormLabel>Payment Type</FormLabel>
              <Select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
                <option value="regular">Regular Payment</option>
                <option value="prepayment">Prepayment</option>
                <option value="full">Full Payment</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Amount (ENTO)</FormLabel>
              <Input
                type="number"
                placeholder="Enter amount"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </FormControl>
            {loan && (
              <Box p="3" bg="gray.50" borderRadius="md" w="100%">
                <Text fontSize="sm" color="gray.600">
                  Monthly Payment: {loan.monthlyPayment?.toLocaleString()} ENTO
                </Text>
                <Text fontSize="sm" color="gray.600">
                  Remaining Balance: {loan.remainingBalance?.toLocaleString()} ENTO
                </Text>
              </Box>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="green" 
            onClick={handlePayment}
            isLoading={loading}
            isDisabled={!paymentAmount}
          >
            Confirm Payment
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Energy Pack Modal Component
const EnergyPackModal = ({ isOpen, onClose, onConfirmPurchase, loading }) => {
  const [selectedPack, setSelectedPack] = useState('standard');
  const [customCapacity, setCustomCapacity] = useState('');
  
  // ✅ ALL HOOKS AT TOP LEVEL
  const textColor = useColorModeValue("navy.700", "white");

  const energyPacks = {
    basic: { name: 'Basic Pack', capacity: 50, price: 500, description: 'Perfect for small households' },
    standard: { name: 'Standard Pack', capacity: 100, price: 900, description: 'Most popular choice for families' },
    premium: { name: 'Premium Pack', capacity: 200, price: 1600, description: 'High capacity for large homes' },
    custom: { name: 'Custom Pack', capacity: 0, price: 0, description: 'Design your own capacity' }
  };

  const handlePurchase = () => {
    const pack = energyPacks[selectedPack];
    const capacity = selectedPack === 'custom' ? parseInt(customCapacity) : pack.capacity;
    const price = selectedPack === 'custom' ? capacity * 9 : pack.price;

    if (!capacity || capacity <= 0) return;

    onConfirmPurchase({
      packType: selectedPack,
      capacity,
      price,
      description: `${pack.name} - ${capacity} kWh capacity`
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color={textColor}>Purchase Energy Pack</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing="4">
            <SimpleGrid columns={2} gap="4" w="100%">
              {Object.entries(energyPacks).map(([key, pack]) => (
                <Card 
                  key={key}
                  border={selectedPack === key ? "2px solid" : "1px solid"}
                  borderColor={selectedPack === key ? "green.500" : "gray.200"}
                  cursor="pointer"
                  onClick={() => setSelectedPack(key)}
                  _hover={{ borderColor: "green.300" }}
                >
                  <CardBody p="4">
                    <VStack spacing="2">
                      <Text fontWeight="bold">{pack.name}</Text>
                      {key !== 'custom' && (
                        <>
                          <Text fontSize="2xl" fontWeight="bold" color="green.500">
                            {pack.capacity} kWh
                          </Text>
                          <Text fontSize="lg" fontWeight="bold">
                            {pack.price} ENTO
                          </Text>
                        </>
                      )}
                      <Text fontSize="sm" color="gray.600" textAlign="center">
                        {pack.description}
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
            
            {selectedPack === 'custom' && (
              <FormControl>
                <FormLabel>Custom Capacity (kWh)</FormLabel>
                <Input
                  type="number"
                  placeholder="Enter desired capacity"
                  value={customCapacity}
                  onChange={(e) => setCustomCapacity(e.target.value)}
                />
                {customCapacity && (
                  <Text fontSize="sm" color="gray.600" mt="2">
                    Estimated cost: {(parseInt(customCapacity) * 9).toLocaleString()} ENTO
                  </Text>
                )}
              </FormControl>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="green" 
            onClick={handlePurchase}
            isLoading={loading}
            isDisabled={selectedPack === 'custom' && !customCapacity}
          >
            Purchase Pack
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// Main Wallet Component
export default function Wallet() {
  // ✅ ALL HOOKS AT TOP LEVEL - MOVED FROM JSX
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  
  const toast = useToast();
  const { user } = useAuth();
  const { dashboardData, submitTransaction, carbonBalance, refreshData } = useCarbon();
  
  const [walletData, setWalletData] = useState({
    energyPack: null,
    loan: null,
    balance: 0
  });
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const { 
    isOpen: isPaymentOpen, 
    onOpen: onPaymentOpen, 
    onClose: onPaymentClose 
  } = useDisclosure();
  
  const { 
    isOpen: isEnergyPackOpen, 
    onOpen: onEnergyPackOpen, 
    onClose: onEnergyPackClose 
  } = useDisclosure();

  // Load wallet data
  const loadWalletData = async () => {
    try {
      const data = await walletService.getWalletData();
      setWalletData(data);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      toast({
        title: "Error Loading Wallet",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setInitialLoad(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWalletData();
    }
  }, [user]);

  // ✅ UPDATED: Handle energy pack charge with database integration
  const handleCharge = async () => {
    setLoading(true);
    try {
      if (!walletData.energyPack) {
        throw new Error('No energy pack available to charge');
      }

      const result = await walletService.chargeEnergyPack({
        energyPackId: walletData.energyPack._id,
        chargeAmount: 50
      });
      
      if (result.success) {
        await loadWalletData(); // Refresh data
        
        toast({
          title: "Charging Started",
          description: "Your energy pack is now charging.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Charging Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handle energy pack purchase with database integration
  const handleEnergyPackPurchase = async (packData) => {
    setLoading(true);
    try {
      const result = await walletService.purchaseEnergyPack(packData);
      
      if (result.success) {
        await loadWalletData(); // Refresh data
        onEnergyPackClose();
        
        toast({
          title: "Energy Pack Purchased",
          description: `Successfully purchased ${packData.capacity} kWh energy pack.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Purchase Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handle loan payment with database integration
  const handleLoanPayment = async (paymentData) => {
    setLoading(true);
    try {
      const result = await walletService.makeLoanPayment(paymentData);
      
      if (result.success) {
        await loadWalletData(); // Refresh data
        onPaymentClose();
        
        toast({
          title: "Payment Successful",
          description: `Loan payment of ${paymentData.amount} ENTO processed successfully.`,
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  // ✅ UPDATED: Handle loan application with database integration
  const handleLoanApplication = async () => {
    setLoading(true);
    try {
      const result = await walletService.applyForLoan({
        amount: 50000,
        loanType: 'Green Energy Investment',
        term: 36
      });
      
      if (result.success) {
        await loadWalletData(); // Refresh data
        
        toast({
          title: "Loan Application Approved",
          description: "Your loan application has been approved and activated.",
          status: "success",
          duration: 5000,
          isClosable: true,
        });
      }
    } catch (error) {
      toast({
        title: "Application Failed",
        description: error.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoad) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
        <Card p="8">
          <VStack spacing="4">
            <Spinner size="xl" />
            <Text>Loading wallet data...</Text>
          </VStack>
        </Card>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Energy Pack Card */}
      <EnergyPackCard 
        energyPack={walletData.energyPack}
        onUpgrade={onEnergyPackOpen}
        onCharge={handleCharge}
        loading={loading}
      />
      
      {/* Current Loan Card */}
      <CurrentLoanCard 
        loan={walletData.loan}
        onPayment={onPaymentOpen}
        onRefinance={() => console.log('Refinance loan')}
        loading={loading}
      />
      
      {/* Quick Actions Card */}
      <Card bg={cardBg} borderColor={borderColor} p="30px">
        <CardHeader>
          <Heading size="lg" color={textColor}>
            Quick Actions
          </Heading>
        </CardHeader>
        <CardBody>
          <HStack spacing="4" justify="center" flexWrap="wrap">
            <Button
              leftIcon={<Icon as={MdAdd} />}
              colorScheme="green"
              size="lg"
              h="60px"
              px="8"
              onClick={onEnergyPackOpen}
              isLoading={loading}
            >
              {walletData.energyPack ? 'Upgrade Energy Pack' : 'Purchase Energy Pack'}
            </Button>
            <Button
              leftIcon={<Icon as={MdAttachMoney} />}
              colorScheme="green"
              size="lg"
              h="60px"
              px="8"
              onClick={handleLoanApplication}
              isLoading={loading}
              isDisabled={walletData.loan && walletData.loan.status === 'active'}
            >
              Apply for New Loan
            </Button>
            <Button
              leftIcon={<Icon as={MdPayment} />}
              colorScheme="blue"
              size="lg"
              h="60px"
              px="8"
              onClick={onPaymentOpen}
              isDisabled={!walletData.loan}
              isLoading={loading}
            >
              Make Prepayment
            </Button>
          </HStack>
        </CardBody>
      </Card>

      {/* Modals */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={onPaymentClose}
        loan={walletData.loan}
        onConfirmPayment={handleLoanPayment}
        loading={loading}
      />

      <EnergyPackModal
        isOpen={isEnergyPackOpen}
        onClose={onEnergyPackClose}
        onConfirmPurchase={handleEnergyPackPurchase}
        loading={loading}
      />
    </Box>
  );
}
