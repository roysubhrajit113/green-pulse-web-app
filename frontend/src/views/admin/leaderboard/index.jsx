import {
  Box,
  Flex,
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
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Progress,
  useToast,
  Center,
  Circle,
  Spinner,
  keyframes,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdEmojiEvents,
  MdTrendingUp,
  MdRefresh,
  MdStar,
  MdLocalFireDepartment,
  MdEco,
  MdPublic,
  MdSchedule,
  MdCheckCircle,
  MdSchool,
  MdBusiness,
  MdPeople,
  MdAttachMoney,
  MdSpeed,
  MdWhatshot,
  MdNature,
  MdPark,
  MdForest,
  MdAutoAwesome,
  MdRocket,
  MdDiamond,
  MdLightbulb,
  MdSavings,
  MdEnergySavingsLeaf,
} from "react-icons/md";
import { useDepartment } from "../../../contexts/DepartmentContext";
import { useInstitute } from "../../../contexts/InstituteContext";

// Animation keyframes
const growAnimation = keyframes`
  0% { transform: scale(0.8) rotate(-5deg); opacity: 0; }
  50% { transform: scale(1.1) rotate(2deg); opacity: 0.8; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

const sparkleAnimation = keyframes`
  0% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(0); }
`;

// Updated Growth Tree Component with Efficiency Display
// FIXED: Growth Tree Component with Proper Colors and Icon Visibility
const GrowthTree = ({ level, isAnimating, overallEfficiency }) => {
  // ✅ Dynamic colors that work properly
  const treeColorStart = useColorModeValue("#48BB78", "#68D391"); // green.400 / green.300
  const treeColorEnd = useColorModeValue("#38A169", "#48BB78");   // green.500 / green.400
  const trunkColor = useColorModeValue("brown.600", "brown.500");
  const sparkleColor = useColorModeValue("yellow.300", "yellow.200");
  const iconColor = useColorModeValue("white", "gray.100");
  
  return (
    <VStack spacing="2" align="center" position="relative">
      <Box
        position="relative"
        animation={isAnimating ? `${growAnimation} 2s ease-in-out` : "none"}
      >
        {/* FIXED: Proper gradient and positioning */}
        <Circle
          size="120px"
          bgGradient={`linear(135deg, ${treeColorStart}, ${treeColorEnd})`}
          position="relative"
          boxShadow={`0 8px 32px ${treeColorStart}40`}
          display="flex"
          alignItems="center"
          justifyContent="center"
          overflow="visible"
        >
          {/* Tree Icon - Now properly visible */}
          <Icon 
            as={MdNature} 
            w="60px" 
            h="60px" 
            color={iconColor}
            zIndex={2}
            position="relative"
          />
          
          {/* FIXED: Efficiency text positioned to NOT overlap icon */}
          <Badge
            position="absolute"
            bottom="-10px"
            left="50%"
            transform="translateX(-50%)"
            bg="white"
            color="green.600"
            fontSize="xs"
            fontWeight="bold"
            px="2"
            py="1"
            borderRadius="full"
            border="2px solid"
            borderColor="green.200"
            zIndex={3}
          >
            {overallEfficiency}%
          </Badge>
        </Circle>
        
        {/* Sparkles with proper color values */}
        {isAnimating && (
          <>
            <Circle
              size="8px"
              bg={sparkleColor}
              position="absolute"
              top="10px"
              right="15px"
              animation={`${sparkleAnimation} 1s ease-in-out infinite`}
            />
            <Circle
              size="6px"
              bg={sparkleColor}
              position="absolute"
              top="25px"
              left="20px"
              animation={`${sparkleAnimation} 1.5s ease-in-out infinite`}
            />
            <Circle
              size="4px"
              bg={sparkleColor}
              position="absolute"
              bottom="15px"
              right="25px"
              animation={`${sparkleAnimation} 2s ease-in-out infinite`}
            />
          </>
        )}
      </Box>
      
      {/* Tree Trunk with proper color */}
      <Box
        w="20px"
        h="40px"
        bg={trunkColor}
        borderRadius="10px"
        animation={isAnimating ? `${growAnimation} 2s ease-in-out 0.5s both` : "none"}
      />
      
      {/*  Level Badge */}
      <Badge
        colorScheme="green"
        variant="solid"
        px="3"
        py="1"
        borderRadius="full"
        fontSize="sm"
        fontWeight="bold"
        animation={isAnimating ? `${pulseAnimation} 2s ease-in-out infinite` : "none"}
      >
        Level {level}
      </Badge>

      {/* REMOVED: Redundant efficiency text that was below */}
      <Text fontSize="xs" color="gray.500" textAlign="center">
        Institute Efficiency Tree
      </Text>
    </VStack>
  );
};


// Enhanced Department Card Component
const DepartmentCard = ({ department, rank, isCurrentUser, isAnimating }) => {
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  
  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return "yellow.400";
      case 2: return "gray.300";
      case 3: return "orange.400";
      default: return "blue.400";
    }
  };
  
  const getRankIcon = (rank) => {
    switch (rank) {
      case 1: return MdEmojiEvents;
      case 2: return MdStar;
      case 3: return MdLocalFireDepartment;
      default: return MdTrendingUp;
    }
  };
  
  const getRankBadge = (rank) => {
    switch (rank) {
      case 1: return "👑";
      case 2: return "🥈";
      case 3: return "🥉";
      default: return `#${rank}`;
    }
  };

  // ✅ Calculate energy saved and CO2 for individual cards
  const energyCapacity = Number(department.energyCapacity) || 0;
  const currentConsumption = Number(department.currentConsumption) || 0;
  const energySaved = Math.max(0, energyCapacity - currentConsumption);
  const co2Saved = energySaved * 0.4;

  return (
    <Card
      bg={cardBg}
      borderColor={borderColor}
      borderWidth="2px"
      borderRadius="20px"
      p="20px"
      position="relative"
      overflow="hidden"
      transform={isAnimating ? "scale(1.02)" : "scale(1)"}
      transition="all 0.3s ease"
      _hover={{
        transform: "scale(1.05)",
        boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
      }}
      boxShadow={isCurrentUser ? "0 0 30px rgba(34, 197, 94, 0.3)" : "0 4px 20px rgba(0,0,0,0.1)"}
    >
      <Badge
        position="absolute"
        top="-5px"
        right="-5px"
        bg={getRankColor(rank)}
        color="white"
        borderRadius="full"
        w="40px"
        h="40px"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="lg"
        fontWeight="bold"
        animation={isAnimating ? `${pulseAnimation} 2s ease-in-out infinite` : "none"}
      >
        {getRankBadge(rank)}
      </Badge>
      
      <VStack spacing="4" align="stretch">
        <HStack justify="space-between" align="center">
          <HStack spacing="3">
            <Icon as={getRankIcon(rank)} w="24px" h="24px" color={getRankColor(rank)} />
            <VStack align="start" spacing="0">
              <Text
                color={textColor}
                fontSize="lg"
                fontWeight="bold"
                noOfLines={1}
              >
                {department.name}
              </Text>
              <Text color={textColorSecondary} fontSize="sm">
                {department.primary_use}
              </Text>
            </VStack>
          </HStack>
        </HStack>
        
        <SimpleGrid columns={2} gap="3">
          <Stat textAlign="center" p="3" bg="green.50" borderRadius="lg">
            <StatLabel color={textColorSecondary} fontSize="xs">Energy Saved</StatLabel>
            <StatNumber color="green.500" fontSize="lg" fontWeight="bold">
              {energySaved.toLocaleString()} kWh
            </StatNumber>
          </Stat>
          
          <Stat textAlign="center" p="3" bg="blue.50" borderRadius="lg">
            <StatLabel color={textColorSecondary} fontSize="xs">CO₂ Saved</StatLabel>
            <StatNumber color="blue.500" fontSize="lg" fontWeight="bold">
              {co2Saved.toFixed(1)} kg
            </StatNumber>
          </Stat>
        </SimpleGrid>
        
        <VStack spacing="2" align="stretch">
          <HStack justify="space-between">
            <Text color={textColorSecondary} fontSize="sm">Efficiency</Text>
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.efficiency}%
            </Text>
          </HStack>
          <Progress
            value={department.efficiency}
            colorScheme="green"
            size="lg"
            borderRadius="full"
            bg="gray.100"
          />
        </VStack>
        
        <HStack justify="space-around" pt="2">
          <VStack spacing="1">
            <Icon as={MdPeople} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.studentCount}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Students</Text>
          </VStack>
          
          <VStack spacing="1">
            <Icon as={MdSchool} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {department.facultyCount}
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Faculty</Text>
          </VStack>
          
          <VStack spacing="1">
            <Icon as={MdDiamond} color={textColorSecondary} w="16px" h="16px" />
            <Text color={textColor} fontSize="sm" fontWeight="bold">
              {Math.round(department.square_feet / 1000)}k
            </Text>
            <Text color={textColorSecondary} fontSize="xs">Sq Ft</Text>
          </VStack>
        </HStack>
      </VStack>
    </Card>
  );
};

// ✅ Updated Savings Potential Modal with Efficiency Focus
const SavingsPotentialModal = ({ isOpen, onClose, inefficiencyGap, overallEfficiency, institute }) => {
  const textColor = useColorModeValue("navy.700", "white");
  const cardBg = useColorModeValue("white", "navy.800");
  
  // ✅ Calculate potential based on efficiency improvement
  const potentialEfficiencyGain = Number(inefficiencyGap) || 0;
  const currentEfficiency = Number(overallEfficiency) || 0;
  const targetEfficiency = Math.min(100, currentEfficiency + (potentialEfficiencyGain * 0.1)); // 10% of gap
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered>
      <ModalOverlay backdropFilter="blur(10px)" />
      <ModalContent bg={cardBg} borderRadius="20px" p="4">
        <ModalHeader textAlign="center">
          <VStack spacing="3">
            <Icon as={MdLightbulb} w="50px" h="50px" color="yellow.400" />
            <Heading size="lg" color={textColor}>
              🌟 Efficiency Improvement Potential
            </Heading>
            <Text fontSize="md" color="gray.500" fontWeight="normal">
              {institute} - Energy Efficiency Analysis
            </Text>
          </VStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing="6">
            {/* ✅ Current vs Target Efficiency */}
            <SimpleGrid columns={2} gap="4" w="100%">
              <Card bg="orange.50" p="4" borderRadius="15px" textAlign="center">
                <VStack spacing="2">
                  <Icon as={MdSpeed} w="30px" h="30px" color="orange.500" />
                  <Text color="orange.600" fontSize="sm" fontWeight="bold">Current Efficiency</Text>
                  <Text color="orange.700" fontSize="xl" fontWeight="bold">
                    {currentEfficiency}%
                  </Text>
                </VStack>
              </Card>
              
              <Card bg="green.50" p="4" borderRadius="15px" textAlign="center">
                <VStack spacing="2">
                  <Icon as={MdEnergySavingsLeaf} w="30px" h="30px" color="green.500" />
                  <Text color="green.600" fontSize="sm" fontWeight="bold">Target Efficiency</Text>
                  <Text color="green.700" fontSize="xl" fontWeight="bold">
                    {targetEfficiency.toFixed(1)}%
                  </Text>
                </VStack>
              </Card>
            </SimpleGrid>

            {/* ✅ Improvement Potential */}
            <SimpleGrid columns={1} gap="4" w="100%">
              <Card bg="blue.50" p="4" borderRadius="15px">
                <HStack spacing="4">
                  <Icon as={MdTrendingUp} w="40px" h="40px" color="blue.500" />
                  <VStack align="start" spacing="1">
                    <Text color="blue.700" fontSize="lg" fontWeight="bold">
                      Improvement Potential
                    </Text>
                    <Text color="blue.600" fontSize="md">
                      <Text as="span" fontWeight="bold">{potentialEfficiencyGain}%</Text> room for efficiency improvement
                    </Text>
                    <Text color="blue.500" fontSize="sm">
                      Moving from {currentEfficiency}% to {targetEfficiency.toFixed(1)}% efficiency! 📈
                    </Text>
                  </VStack>
                </HStack>
              </Card>

              {/* ✅ Environmental Impact */}
              <Card bg="green.50" p="4" borderRadius="15px">
                <HStack spacing="4">
                  <Icon as={MdEco} w="40px" h="40px" color="green.500" />
                  <VStack align="start" spacing="1">
                    <Text color="green.700" fontSize="lg" fontWeight="bold">
                      Environmental Impact
                    </Text>
                    <Text color="green.600" fontSize="md">
                      Achieving <Text as="span" fontWeight="bold">{targetEfficiency.toFixed(1)}% efficiency</Text> would significantly reduce carbon footprint
                    </Text>
                    <Text color="green.500" fontSize="sm">
                      Every 1% efficiency gain helps save the planet! 🌍
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            </SimpleGrid>

            {/* ✅ Action Steps */}
            <Card bg="purple.50" p="4" borderRadius="15px" w="100%">
              <VStack spacing="3">
                <HStack spacing="2">
                  <Icon as={MdRocket} w="20px" h="20px" color="purple.500" />
                  <Text color="purple.700" fontSize="md" fontWeight="bold">
                    How to Improve Efficiency:
                  </Text>
                </HStack>
                <VStack spacing="2" align="start" w="100%">
                  <Text color="purple.600" fontSize="sm">• 🔧 Regular maintenance of HVAC systems</Text>
                  <Text color="purple.600" fontSize="sm">• 💡 Upgrade to energy-efficient lighting</Text>
                  <Text color="purple.600" fontSize="sm">• 🌡️ Install smart thermostats</Text>
                  <Text color="purple.600" fontSize="sm">• 📊 Monitor and optimize energy usage patterns</Text>
                  <Text color="purple.600" fontSize="sm">• 🏢 Improve building insulation</Text>
                </VStack>
              </VStack>
            </Card>
          </VStack>
        </ModalBody>

        <ModalFooter justifyContent="center">
          <Button colorScheme="green" size="lg" onClick={onClose} borderRadius="full" px="8">
            Let's Improve Efficiency! ⚡
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default function Leaderboard() {
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const brandColor = useColorModeValue("brand.500", "white");
  const successColor = useColorModeValue("green.500", "green.300");
  const warningColor = useColorModeValue("orange.500", "orange.300");
  const errorColor = useColorModeValue("red.500", "red.300");
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const { 
    departments, 
    loading, 
    error, 
    getDepartmentStats, 
    refreshDepartments 
  } = useDepartment();
  
  const { currentInstitute } = useInstitute();
  
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  
  // ✅ UPDATED: Focus on efficiency rather than absolute savings
  const calculateTotals = () => {
    if (!departments || departments.length === 0) {
      return {
        overallEfficiency: 0,
        improvementPotential: 100,
        totalEnergySaved: '0% Efficient',
        totalCO2Impact: '100% Potential Reduction'
      };
    }

    let totalEfficiencyPoints = 0;
    let totalPossiblePoints = 0;
    
    departments.forEach(dept => {
      totalEfficiencyPoints += (Number(dept.efficiency) || 0);
      totalPossiblePoints += 100; // Max efficiency is 100%
    });
    
    const overallEfficiency = totalPossiblePoints > 0 ? totalEfficiencyPoints / totalPossiblePoints * 100 : 0;
    const inefficiencyGap = 100 - overallEfficiency; // How much room for improvement
    
    console.log('🔍 EFFICIENCY DEBUG:');
    console.log('  Total Efficiency Points:', totalEfficiencyPoints);
    console.log('  Total Possible Points:', totalPossiblePoints);
    console.log('  Overall Efficiency:', overallEfficiency.toFixed(1) + '%');
    console.log('  Improvement Potential:', inefficiencyGap.toFixed(1) + '%');
    
    return {
      overallEfficiency: overallEfficiency.toFixed(1),
      improvementPotential: inefficiencyGap.toFixed(1),
      totalEnergySaved: `${overallEfficiency.toFixed(1)}% Efficient`, // Show efficiency instead
      totalCO2Impact: `${inefficiencyGap.toFixed(1)}% Potential Reduction`
    };
  };

  const totals = calculateTotals();
  const stats = getDepartmentStats(); // Keep this for other stats like student counts
  
  // ✅ UPDATED: Sort departments by EFFICIENCY and limit to TOP 6 ONLY
  const sortedDepartments = departments
    .sort((a, b) => (Number(b.efficiency) || 0) - (Number(a.efficiency) || 0))
    .slice(0, 6);

  const topThreeDepartments = sortedDepartments.slice(0, 3);

  // ✅ UPDATED: Calculate tree level based on efficiency
  const calculateTreeLevel = (efficiency) => {
    return Math.min(10, Math.max(1, Math.floor(efficiency / 10) + 1));
  };

  useEffect(() => {
    if (totals.overallEfficiency) {
      const newLevel = calculateTreeLevel(Number(totals.overallEfficiency));
      setCurrentLevel(newLevel);
    }
  }, [totals.overallEfficiency]);

  const handleRefresh = async () => {
    setIsAnimating(true);
    toast({
      title: "Leaderboard Updated!",
      description: "Fresh efficiency data loaded with new rankings.",
      status: "success",
      duration: 3000,
      isClosable: true,
    });
    
    try {
      await refreshDepartments();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to refresh leaderboard data.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setTimeout(() => setIsAnimating(false), 2000);
    }
  };

  // ✅ UPDATED: Level Up with Efficiency Focus
  const handleLevelUp = () => {
    setIsAnimating(true);
    
    toast({
      title: "⚡ Analyzing Efficiency Potential...",
      description: "Calculating your institute's efficiency improvement opportunities!",
      status: "info",
      duration: 2000,
      isClosable: true,
    });
    
    setTimeout(() => {
      onOpen();
      setIsAnimating(false);
    }, 1500);
  };

  if (loading) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} textAlign="center">
        <VStack spacing="4">
          <Spinner size="xl" color="green.500" />
          <Text color={textColor} fontSize="lg">Loading efficiency leaderboard...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box pt={{ base: "130px", md: "80px", xl: "80px" }} textAlign="center">
        <VStack spacing="4">
          <Text color="red.500" fontSize="lg">Error loading departments: {error}</Text>
          <Button onClick={handleRefresh} colorScheme="blue">
            Retry
          </Button>
        </VStack>
      </Box>
    );
  }

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* ✅ Updated Efficiency Modal */}
      <SavingsPotentialModal 
        isOpen={isOpen}
        onClose={onClose}
        inefficiencyGap={totals.improvementPotential}
        overallEfficiency={totals.overallEfficiency}
        institute={currentInstitute?.name}
      />

      {/* Header Section */}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="4xl" fontWeight="bold" mb="2">
            ⚡ Energy Efficiency Leaderboard
          </Heading>
          <Text color={textColorSecondary} fontSize="lg">
            Top 6 Most Efficient Buildings - {currentInstitute?.name} 🌍
          </Text>
        </Box>
        <HStack spacing="3">
          <Button
            leftIcon={<Icon as={MdAutoAwesome} />}
            colorScheme="purple"
            variant="outline"
            size="sm"
            onClick={handleLevelUp}
          >
            Show Efficiency Potential
          </Button>
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isAnimating}
          >
            Refresh
          </Button>
        </HStack>
      </Flex>

      {/* ✅ UPDATED: Stats Overview with Efficiency Metrics */}
      <SimpleGrid columns={{ base: 2, md: 4 }} gap="20px" mb="30px">
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Overall Efficiency</StatLabel>
            <StatNumber color={successColor} fontSize="2xl" fontWeight="bold">
              {totals.overallEfficiency}%
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdTrendingUp} mr="1" />
              Institute Average
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Improvement Potential</StatLabel>
            <StatNumber color={brandColor} fontSize="2xl" fontWeight="bold">
              {totals.improvementPotential}%
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdEco} mr="1" />
              Room for Growth
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Total Students</StatLabel>
            <StatNumber color={warningColor} fontSize="2xl" fontWeight="bold">
              {stats.totalStudents.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdPeople} mr="1" />
              Active Members
            </StatHelpText>
          </Stat>
        </Card>
        
        <Card bg={cardBg} borderColor={borderColor} p="20px">
          <Stat textAlign="center">
            <StatLabel color={textColorSecondary} fontSize="sm">Faculty Members</StatLabel>
            <StatNumber color={errorColor} fontSize="2xl" fontWeight="bold">
              {stats.totalFaculty.toLocaleString()}
            </StatNumber>
            <StatHelpText color={textColorSecondary}>
              <Icon as={MdSchool} mr="1" />
              Mentors
            </StatHelpText>
          </Stat>
        </Card>
      </SimpleGrid>

      {/* Main Leaderboard with Growth Tree */}
      <Card bg={cardBg} borderColor={borderColor} p="30px" mb="30px">
        <CardHeader textAlign="center" mb="30px">
          <Heading size="lg" color={textColor} mb="2">
            ⚡ Top 6 Most Efficient Buildings
          </Heading>
          <Text color={textColorSecondary}>
            Ranked by energy efficiency - only the most efficient buildings make it here!
          </Text>
        </CardHeader>
        
        <SimpleGrid columns={{ base: 1, lg: 3 }} gap="30px" align="center">
          <VStack spacing="4" align="stretch">
            <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center">
              🏆 Efficiency Champions (Top 3)
            </Text>
            {sortedDepartments.slice(0, 3).map((department, index) => (
              <DepartmentCard
                key={department.id}
                department={department}
                rank={index + 1}
                isCurrentUser={false}
                isAnimating={isAnimating}
              />
            ))}
          </VStack>
          
          {/* ✅ Center - Updated Growth Tree */}
          <Center>
            <VStack spacing="6" align="center">
              <GrowthTree 
                level={currentLevel} 
                isAnimating={isAnimating}
                overallEfficiency={totals.overallEfficiency}
              />
              
              {/* ✅ Updated Tree Stats */}
              <Card bg="green.50" p="20px" borderRadius="20px" w="200px">
                <VStack spacing="3">
                  <Text color="green.600" fontSize="sm" fontWeight="bold">
                    Efficiency Level
                  </Text>
                  <Text color="green.700" fontSize="2xl" fontWeight="bold">
                    {currentLevel}
                  </Text>
                  <Progress
                    value={Number(totals.overallEfficiency)}
                    colorScheme="green"
                    size="lg"
                    borderRadius="full"
                    w="100%"
                  />
                  <Text color="green.600" fontSize="xs" textAlign="center">
                    {totals.overallEfficiency}% Institute Efficiency
                  </Text>
                </VStack>
              </Card>
              
              <HStack spacing="4" opacity="0.7">
                <Icon as={MdRocket} w="20px" h="20px" color="blue.400" />
                <Icon as={MdDiamond} w="20px" h="20px" color="purple.400" />
                <Icon as={MdAutoAwesome} w="20px" h="20px" color="pink.400" />
              </HStack>
            </VStack>
          </Center>
          
          <VStack spacing="4" align="stretch">
            <Text color={textColor} fontSize="lg" fontWeight="bold" textAlign="center">
              ⚡ Efficient Leaders (4-6)
            </Text>
            {sortedDepartments.slice(3, 6).map((department, index) => (
              <DepartmentCard
                key={department.id}
                department={department}
                rank={index + 4}
                isCurrentUser={false}
                isAnimating={isAnimating}
              />
            ))}
            
            {sortedDepartments.length < 6 && (
              <Card bg="gray.50" p="20px" borderRadius="15px" textAlign="center">
                <VStack spacing="2">
                  <Icon as={MdStar} w="30px" h="30px" color="gray.400" />
                  <Text color="gray.600" fontSize="sm">
                    More buildings coming soon!
                  </Text>
                  <Text color="gray.500" fontSize="xs">
                    {sortedDepartments.length} of 6 buildings active
                  </Text>
                </VStack>
              </Card>
            )}
          </VStack>
        </SimpleGrid>
      </Card>

      {/* ✅ Updated Achievement Section */}
      <Card bg={cardBg} borderColor={borderColor} p="30px">
        <CardHeader textAlign="center">
          <Heading size="lg" color={textColor} mb="2">
            🏅 Top 3 Efficiency Winners
          </Heading>
          <Text color={textColorSecondary}>
            Celebrating your institute's most energy-efficient buildings!
          </Text>
        </CardHeader>
        
        <SimpleGrid columns={{ base: 1, md: 3 }} gap="20px">
          {topThreeDepartments.map((department, index) => {
            const achievements = [
              {
                bg: "yellow.50",
                border: "yellow.200",
                icon: MdEmojiEvents,
                iconColor: "yellow.500",
                titleColor: "yellow.700",
                textColor: "yellow.600",
                title: "🏆 Efficiency Champion!",
                description: `${department.name} leads with ${department.efficiency}% efficiency!`
              },
              {
                bg: "green.50",
                border: "green.200",
                icon: MdEco,
                iconColor: "green.500",
                titleColor: "green.700",
                textColor: "green.600",
                title: "⚡ Energy Master",
                description: `${department.name} setting the efficiency standard!`
              },
              {
                bg: "blue.50",
                border: "blue.200",
                icon: MdTrendingUp,
                iconColor: "blue.500",
                titleColor: "blue.700",
                textColor: "blue.600",
                title: "🌟 Rising Efficiency Star",
                description: `${department.name} excelling in energy optimization!`
              }
            ][index];

            return (
              <Card key={department.id} bg={achievements.bg} p="20px" borderRadius="15px" borderColor={achievements.border}>
                <HStack spacing="3">
                  <Icon as={achievements.icon} w="24px" h="24px" color={achievements.iconColor} />
                  <VStack align="start" spacing="1">
                    <Text color={achievements.titleColor} fontSize="sm" fontWeight="bold">
                      {achievements.title}
                    </Text>
                    <Text color={achievements.textColor} fontSize="xs">
                      {achievements.description}
                    </Text>
                  </VStack>
                </HStack>
              </Card>
            );
          })}
        </SimpleGrid>
      </Card>
    </Box>
  );
}
