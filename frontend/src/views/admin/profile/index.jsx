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
  Avatar,
  Badge,
  VStack,
  HStack,
  Divider,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  useToast,
  Textarea,
  Input,
  Spinner,
} from "@chakra-ui/react";
import React, { useState, useEffect } from "react";
import {
  MdPerson,
  MdWork,
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdEdit,
  MdSave,
  MdCancel,
  MdAccountBalanceWallet,
  MdEco,
  MdTrendingUp,
  MdRefresh,
  MdStar,
  MdLocalFireDepartment,
  MdPublic,
  MdSchedule,
  MdCheckCircle,
  MdCamera,
  MdSchool,
  MdBusiness,
} from "react-icons/md";

// Assets
import banner from "assets/img/auth/banner.png";
import avatar from "assets/img/avatars/avatarSimmmple.png";

// Import Auth Context and Service
import { useAuth } from "contexts/AuthContext";
import { useCarbon } from "contexts/CarbonContext";
import authService from "services/authService";

export default function ProfilePage() {
  // ✅ ALL HOOKS AT TOP LEVEL - Fix for ESLint error
  const textColor = useColorModeValue("navy.700", "white");
  const textColorSecondary = useColorModeValue("gray.500", "gray.400");
  const cardBg = useColorModeValue("white", "navy.800");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const brandColor = useColorModeValue("brand.500", "brand.300");
  const successColor = useColorModeValue("green.500", "green.300");
  const warningColor = useColorModeValue("orange.500", "orange.300");
  const errorColor = useColorModeValue("red.500", "red.300");
  const inputBg = useColorModeValue("white", "gray.700");
  const hoverBg = useColorModeValue("gray.50", "gray.700");
  const subtleBg = useColorModeValue("gray.50", "gray.800");
  const chartBrandColor = useColorModeValue("brand.600", "brand.200");
  const chartSuccessColor = useColorModeValue("green.600", "green.200");
  
  const toast = useToast();
  const { user, updateUserData } = useAuth();
  
  // ✅ Get real data from Carbon context
  const { 
    dashboardData, 
    carbonBalance, 
    transactions, 
    getEnergyConsumptionData,
    getTransactionHistory,
    loading: carbonLoading,
    error: carbonError 
  } = useCarbon();

  // State management
  const [personalInfo, setPersonalInfo] = useState({
    name: "",
    department: "",
    branch: "",
    position: "",
    email: "",
    phone: "",
    location: "",
    education: "",
    joinDate: "",
    employeeId: "",
    manager: "",
    team: "",
    bio: "",
  });

  const [departmentStats, setDepartmentStats] = useState({
    departmentName: "",
    branch: "",
    entoSaved: 0,
    entoCount: 0,
    carbonCredits: 0,
    co2Saved: 0,
    rank: 0,
    totalMembers: 0,
    activeMembers: 0,
  });

  const [savingsData, setSavingsData] = useState([]);
  const [energyData, setEnergyData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    position: '',
    department: '',
    branch: '',
    bio: '',
    location: ''
  });
  const [postText, setPostText] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ✅ Process transaction data into monthly savings
  const processTransactionData = (transactions) => {
    const monthlyMap = {};
    const currentYear = new Date().getFullYear();
    
    // Initialize with zeros for all months
    for (let i = 0; i < 12; i++) {
      const monthName = new Date(currentYear, i).toLocaleString('default', { month: 'short' });
      monthlyMap[monthName] = { entoSaved: 0, co2Saved: 0 };
    }

    // Process transactions
    transactions.forEach(tx => {
      const date = new Date(tx.date || tx.createdAt);
      if (date.getFullYear() === currentYear) {
        const monthName = date.toLocaleString('default', { month: 'short' });
        if (monthlyMap[monthName]) {
          if (tx.type === 'carbon_offset_purchase' || tx.type === 'ento_transfer') {
            monthlyMap[monthName].entoSaved += tx.amount || 0;
            monthlyMap[monthName].co2Saved += (tx.amount * 0.1) || 0;
          }
        }
      }
    });

    return Object.entries(monthlyMap).map(([month, data]) => ({
      month,
      entoSaved: data.entoSaved,
      co2Saved: Math.round(data.co2Saved)
    }));
  };

  // ✅ Calculate total ENTO saved from transactions
  const calculateTotalEntoSaved = (transactions) => {
    return transactions.reduce((total, tx) => {
      if (tx.type === 'carbon_offset_purchase' || tx.type === 'ento_transfer') {
        return total + (tx.amount || 0);
      }
      return total;
    }, 0);
  };

  // ✅ Load real carbon and energy data
  const loadCarbonData = async () => {
    try {
      // Get energy consumption data
      const energyConsumption = await getEnergyConsumptionData();
      setEnergyData(energyConsumption);

      // Get recent transactions for trends
      const transactionHistory = await getTransactionHistory(50, 0);
      setRecentTransactions(transactionHistory);

      // Process transactions into monthly savings data
      if (transactionHistory && transactionHistory.length > 0) {
        const monthlyData = processTransactionData(transactionHistory);
        setSavingsData(monthlyData);
      }

      // Update department stats from dashboard data
      if (dashboardData) {
        setDepartmentStats(prev => ({
          ...prev,
          departmentName: personalInfo.department || dashboardData.instituteDisplayName || "",
          branch: personalInfo.branch || "",
          entoSaved: calculateTotalEntoSaved(transactionHistory),
          entoCount: carbonBalance || dashboardData.walletBalance || 0,
          carbonCredits: dashboardData.offsetsPurchased || 0,
          co2Saved: dashboardData.co2Savings || 0,
          rank: 4,
          totalMembers: 450,
          activeMembers: 320,
        }));
      }
    } catch (error) {
      console.error('Error loading carbon data:', error);
    }
  };

  // Load user data on component mount
  useEffect(() => {
    const loadUserData = async () => {
      const savedProfileData = localStorage.getItem('profileData');

      if (savedProfileData) {
        const profileData = JSON.parse(savedProfileData);
        setPersonalInfo(profileData);
        setEditData({
          name: profileData.name || '',
          position: profileData.position || '',
          department: profileData.department || '',
          branch: profileData.branch || '',
          bio: profileData.bio || '',
          location: profileData.location || ''
        });
      }

      try {
        const response = await authService.getProfile();
        if (response.success) {
          const userData = response.data;
          const updatedInfo = {
            name: userData.fullName || '',
            position: userData.position || 'Student',
            department: userData.department || '',
            branch: userData.branch || '',
            bio: userData.bio || '',
            email: userData.email || '',
            education: user?.institute?.name || 'No Institute',
            location: userData.location || '',
            phone: userData.phone || "+1 (555) 123-4567",
            employeeId: userData.employeeId || "GP-2022-001",
            manager: userData.manager || "Dr. Sarah Chen",
            team: userData.team || "Carbon Analytics Team",
            joinDate: userData.joinDate || "2022-03-15"
          };

          setPersonalInfo(updatedInfo);
          setEditData({
            name: updatedInfo.name,
            position: updatedInfo.position,
            department: updatedInfo.department,
            branch: updatedInfo.branch,
            bio: updatedInfo.bio,
            location: updatedInfo.location
          });
          localStorage.setItem('profileData', JSON.stringify(updatedInfo));
          updateUserData(userData);
        }
      } catch (error) {
        console.error('Error loading fresh data:', error);
        if (user && !savedProfileData) {
          const fallbackInfo = {
            name: user.fullName || '',
            position: user.position || '',
            department: user.department || '',
            branch: user.branch || '',
            bio: user.bio || '',
            email: user.email || '',
            education: user.institute?.name || 'No Institute',
            location: user.location || '',
            phone: "+1 (555) 123-4567",
            employeeId: "GP-2022-001",
            manager: "Dr. Sarah Chen",
            team: "Carbon Analytics Team",
            joinDate: "2022-03-15"
          };
          setPersonalInfo(fallbackInfo);
          setEditData({
            name: fallbackInfo.name,
            position: fallbackInfo.position,
            department: fallbackInfo.department,
            branch: fallbackInfo.branch,
            bio: fallbackInfo.bio,
            location: fallbackInfo.location
          });
        }
      }
    };

    loadUserData();
  }, []);

  // Load carbon data when dashboard data is available
  useEffect(() => {
    if (dashboardData && personalInfo.name) {
      loadCarbonData();
    }
  }, [dashboardData, personalInfo.name]);

  // Sync editData with personalInfo when not editing
  useEffect(() => {
    if (!isEditing && personalInfo.name) {
      setEditData({
        name: personalInfo.name || '',
        position: personalInfo.position || '',
        department: personalInfo.department || '',
        branch: personalInfo.branch || '',
        bio: personalInfo.bio || '',
        location: personalInfo.location || ''
      });
    }
  }, [personalInfo, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({
      name: personalInfo.name || '',
      position: personalInfo.position || '',
      department: personalInfo.department || '',
      branch: personalInfo.branch || '',
      bio: personalInfo.bio || '',
      location: personalInfo.location || ''
    });
  };

  const handleSave = async () => {
    try {
      const updateData = {
        fullName: editData.name,
        position: editData.position,
        department: editData.department,
        branch: editData.branch,
        bio: editData.bio,
        location: editData.location
      };

      const response = await authService.updateProfile(updateData);
      
      if (response.success) {
        const updatedPersonalInfo = {
          ...personalInfo,
          name: updateData.fullName,
          position: updateData.position,
          department: updateData.department,
          branch: updateData.branch,
          bio: updateData.bio,
          location: updateData.location
        };

        setPersonalInfo(updatedPersonalInfo);
        localStorage.setItem('profileData', JSON.stringify(updatedPersonalInfo));

        setDepartmentStats(prev => ({
          ...prev,
          departmentName: updateData.department,
          branch: updateData.branch
        }));
        
        setIsEditing(false);
        toast({
          title: "Profile Updated",
          description: "Your profile information has been saved successfully.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });

        updateUserData(response.data);
        loadCarbonData();
      }
    } catch (error) {
      console.error('Profile update error:', error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditData({
      name: personalInfo.name || '',
      position: personalInfo.position || '',
      department: personalInfo.department || '',
      branch: personalInfo.branch || '',
      bio: personalInfo.bio || '',
      location: personalInfo.location || ''
    });
  };

  const handlePost = () => {
    if (postText.trim()) {
      toast({
        title: "Post Published",
        description: "Your post has been published successfully.",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setPostText("");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await authService.getProfile();
      if (response.success) {
        const userData = response.data;
        const updatedInfo = {
          name: userData.fullName || '',
          position: userData.position || 'Student',
          department: userData.department || '',
          branch: userData.branch || '',
          bio: userData.bio || '',
          email: userData.email || '',
          education: user?.institute?.name || 'No Institute',
          location: userData.location || '',
          phone: "+1 (555) 123-4567",
          employeeId: "GP-2022-001",
          manager: "Dr. Sarah Chen",
          team: "Carbon Analytics Team",
          joinDate: "2022-03-15"
        };

        setPersonalInfo(updatedInfo);
        setEditData({
          name: updatedInfo.name,
          position: updatedInfo.position,
          department: updatedInfo.department,
          branch: updatedInfo.branch,
          bio: updatedInfo.bio,
          location: updatedInfo.location
        });
        localStorage.setItem('profileData', JSON.stringify(updatedInfo));
        updateUserData(userData);
        
        await loadCarbonData();
        
        window.dispatchEvent(new CustomEvent('profileUpdated'));

        toast({
          title: "Profile Refreshed",
          description: "Your profile and carbon data has been updated.",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error('Refresh error:', error);
      toast({
        title: "Refresh Failed",
        description: error.message || "Failed to refresh profile data.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Box pt={{ base: "130px", md: "80px", xl: "80px" }}>
      {/* Header Section */}
      <Flex justify="space-between" align="center" mb="30px">
        <Box>
          <Heading color={textColor} fontSize="2xl" fontWeight="bold">
            Profile Information
          </Heading>
          <Text color={textColorSecondary} fontSize="md">
            Dashboard / Users / {personalInfo.name}
          </Text>
        </Box>
        <Flex gap="10px">
          <Button
            leftIcon={<Icon as={MdRefresh} />}
            colorScheme="brand"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            isLoading={isRefreshing || carbonLoading}
            loadingText="Refreshing..."
          >
            Refresh
          </Button>
          {!isEditing ? (
            <Button
              leftIcon={<Icon as={MdEdit} />}
              colorScheme="brand"
              size="sm"
              onClick={handleEdit}
            >
              Edit Profile
            </Button>
          ) : (
            <HStack>
              <Button
                leftIcon={<Icon as={MdCancel} />}
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                leftIcon={<Icon as={MdSave} />}
                colorScheme="brand"
                size="sm"
                onClick={handleSave}
              >
                Save
              </Button>
            </HStack>
          )}
        </Flex>
      </Flex>

      {/* Profile Banner Card */}
      <Card bg={cardBg} mb="30px" borderColor={borderColor} overflow="hidden">
        <Box
          h="250px"
          bgImage={`url(${banner})`}
          bgSize="cover"
          bgPosition="center"
          position="relative"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <VStack spacing="4" textAlign="center">
            <Avatar
              size="2xl"
              name={personalInfo.name}
              src={avatar}
              border="4px solid"
              borderColor="white"
            />
            <VStack spacing="2">
              <Heading color="white" fontSize="2xl" textShadow="2px 2px 4px rgba(0,0,0,0.5)">
                {isEditing ? (
                  <Input
                    value={editData.name}
                    onChange={(e) => setEditData({...editData, name: e.target.value})}
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="4px"
                    p="4px 8px"
                    color={textColor}
                    fontSize="24px"
                    fontWeight="bold"
                    textAlign="center"
                    _focus={{ borderColor: brandColor }}
                  />
                ) : (
                  personalInfo.name
                )}
              </Heading>
              <Text color="white" fontSize="lg" textShadow="1px 1px 2px rgba(0,0,0,0.5)">
                {isEditing ? (
                  <Input
                    value={editData.position}
                    onChange={(e) => setEditData({...editData, position: e.target.value})}
                    bg={inputBg}
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="4px"
                    p="4px 8px"
                    color={textColorSecondary}
                    fontSize="18px"
                    textAlign="center"
                    _focus={{ borderColor: brandColor }}
                  />
                ) : (
                  personalInfo.position
                )}
              </Text>
            </VStack>
          </VStack>
        </Box>
        
        <CardBody p="30px">
          {/* Department Statistics */}
          <SimpleGrid columns={{ base: 2, md: 4 }} gap="20px" mb="30px">
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">Department</StatLabel>
              <StatNumber color={textColor} fontSize="lg">
                {isEditing ? (
                  <Input
                    value={editData.department}
                    onChange={(e) => setEditData({...editData, department: e.target.value})}
                    bg="transparent"
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="4px"
                    p="4px 8px"
                    color={textColor}
                    textAlign="center"
                    _focus={{ borderColor: brandColor }}
                  />
                ) : (
                  departmentStats.departmentName || "Not set"
                )}
              </StatNumber>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">Branch</StatLabel>
              <StatNumber color={textColor} fontSize="lg">
                {isEditing ? (
                  <Input
                    value={editData.branch}
                    onChange={(e) => setEditData({...editData, branch: e.target.value})}
                    bg="transparent"
                    border="1px solid"
                    borderColor={borderColor}
                    borderRadius="4px"
                    p="4px 8px"
                    color={textColor}
                    textAlign="center"
                    _focus={{ borderColor: brandColor }}
                  />
                ) : (
                  departmentStats.branch || "Not set"
                )}
              </StatNumber>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">ENTO Saved</StatLabel>
              <StatNumber color={successColor} fontSize="lg">
                {carbonLoading ? <Spinner size="sm" /> : departmentStats.entoSaved.toLocaleString()}
              </StatNumber>
              <StatHelpText color={textColorSecondary} fontSize="xs">
                From transactions
              </StatHelpText>
            </Stat>
            
            <Stat textAlign="center">
              <StatLabel color={textColorSecondary} fontSize="sm">Carbon Credits</StatLabel>
              <StatNumber color={brandColor} fontSize="lg">
                {carbonLoading ? <Spinner size="sm" /> : (carbonBalance || departmentStats.carbonCredits).toLocaleString()}
              </StatNumber>
              <StatHelpText color={textColorSecondary} fontSize="xs">
                Current balance
              </StatHelpText>
            </Stat>
          </SimpleGrid>

          {/* Profile Content */}
          <Box px="0" py="30px">
            <SimpleGrid columns={{ base: 1, lg: 2 }} gap="30px">
              {/* About Me Section */}
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <Heading size="md" color={textColor}>
                    About Me
                  </Heading>
                </CardHeader>
                <CardBody>
                  <VStack spacing="4" align="stretch">
                    <Text color={textColor} lineHeight="1.6">
                      {isEditing ? (
                        <Textarea
                          value={editData.bio}
                          onChange={(e) => setEditData({...editData, bio: e.target.value})}
                          bg={inputBg}
                          border="1px solid"
                          borderColor={borderColor}
                          borderRadius="4px"
                          p="8px"
                          color={textColor}
                          minHeight="100px"
                          resize="vertical"
                          _focus={{ borderColor: brandColor }}
                        />
                      ) : (
                        personalInfo.bio || "No bio available. Click edit to add one."
                      )}
                    </Text>
                    
                    <VStack spacing="3" align="stretch">
                      <HStack>
                        <Icon as={MdWork} color={textColorSecondary} w="20px" h="20px" />
                        <Text color={textColorSecondary} minW="100px">Position:</Text>
                        {isEditing ? (
                          <Input
                            value={editData.position}
                            onChange={(e) => setEditData({...editData, position: e.target.value})}
                            bg={inputBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="4px"
                            p="4px 8px"
                            color={textColor}
                            flex="1"
                            _focus={{ borderColor: brandColor }}
                          />
                        ) : (
                          <Text color={textColor}>{personalInfo.position}</Text>
                        )}
                      </HStack>
                      
                      <HStack>
                        <Icon as={MdEmail} color={textColorSecondary} w="20px" h="20px" />
                        <Text color={textColorSecondary} minW="100px">Email:</Text>
                        <HStack flex="1">
                          <Text color={textColor} fontWeight="medium">
                            {personalInfo.email || "No Email"}
                          </Text>
                          {personalInfo.email && (
                            <Badge colorScheme="green" variant="subtle" fontSize="xs">
                              Verified
                            </Badge>
                          )}
                        </HStack>
                      </HStack>
                      
                      <HStack>
                        <Icon as={MdSchool} color={textColorSecondary} w="20px" h="20px" />
                        <Text color={textColorSecondary} minW="100px">Education:</Text>
                        <HStack flex="1">
                          <Text color={textColor} fontWeight="medium">
                            {personalInfo.education || "No Institute"}
                          </Text>
                          {personalInfo.education && personalInfo.education !== "No Institute" && (
                            <Badge colorScheme="blue" variant="subtle" fontSize="xs">
                              Institute
                            </Badge>
                          )}
                        </HStack>
                      </HStack>
                      
                      <HStack>
                        <Icon as={MdLocationOn} color={textColorSecondary} w="20px" h="20px" />
                        <Text color={textColorSecondary} minW="100px">Location:</Text>
                        {isEditing ? (
                          <Input
                            value={editData.location}
                            onChange={(e) => setEditData({...editData, location: e.target.value})}
                            bg={inputBg}
                            border="1px solid"
                            borderColor={borderColor}
                            borderRadius="4px"
                            p="4px 8px"
                            color={textColor}
                            flex="1"
                            placeholder="Enter your location"
                            _focus={{ borderColor: brandColor }}
                          />
                        ) : (
                          <Text color={textColor}>{personalInfo.location || "Not specified"}</Text>
                        )}
                      </HStack>
                    </VStack>

                    {/* Post Section */}
                    <Divider my="4" />
                    <VStack spacing="3" align="stretch">
                      <Text color={textColorSecondary} fontSize="sm" fontWeight="500">
                        What are you thinking...
                      </Text>
                      <Textarea
                        value={postText}
                        onChange={(e) => setPostText(e.target.value)}
                        placeholder="Share your thoughts about sustainability..."
                        resize="vertical"
                        minH="80px"
                        bg={inputBg}
                        borderColor={borderColor}
                        _focus={{ borderColor: brandColor }}
                      />
                      <Flex justify="space-between" align="center">
                        <Icon as={MdCamera} color={textColorSecondary} w="20px" h="20px" />
                        <Button
                          colorScheme="brand"
                          size="sm"
                          onClick={handlePost}
                          isDisabled={!postText.trim()}
                        >
                          Post
                        </Button>
                      </Flex>
                    </VStack>
                  </VStack>
                </CardBody>
              </Card>

              {/* ✅ Real Savings Graph from transaction data */}
              <Card bg={cardBg} borderColor={borderColor}>
                <CardHeader>
                  <HStack>
                    <Icon as={MdTrendingUp} color={brandColor} w="24px" h="24px" />
                    <Heading size="md" color={textColor}>
                      Carbon Impact This Year
                    </Heading>
                  </HStack>
                </CardHeader>
                <CardBody>
                  {carbonLoading ? (
                    <Flex justify="center" align="center" h="300px">
                      <VStack>
                        <Spinner size="xl" color={brandColor} />
                        <Text color={textColorSecondary}>Loading carbon data...</Text>
                      </VStack>
                    </Flex>
                  ) : (
                    <VStack spacing="6" align="stretch">
                      {/* Summary Stats from real data */}
                      <SimpleGrid columns={2} gap="4">
                        <Stat textAlign="center" p="4" bg={subtleBg} borderRadius="lg">
                          <StatLabel color={textColorSecondary} fontSize="sm">Total ENTO Saved</StatLabel>
                          <StatNumber color={successColor} fontSize="xl">
                            {savingsData.reduce((sum, item) => sum + item.entoSaved, 0).toLocaleString()}
                          </StatNumber>
                          <StatHelpText color={textColorSecondary} fontSize="xs">
                            From {recentTransactions.length} transactions
                          </StatHelpText>
                        </Stat>
                        <Stat textAlign="center" p="4" bg={subtleBg} borderRadius="lg">
                          <StatLabel color={textColorSecondary} fontSize="sm">Total CO2 Saved</StatLabel>
                          <StatNumber color={brandColor} fontSize="xl">
                            {(dashboardData?.co2Savings || savingsData.reduce((sum, item) => sum + item.co2Saved, 0)).toLocaleString()} kg
                          </StatNumber>
                          <StatHelpText color={textColorSecondary} fontSize="xs">
                            Carbon footprint reduction
                          </StatHelpText>
                        </Stat>
                      </SimpleGrid>

                      {/* ✅ FIXED: Simple Bar Chart from real data - NO HOOKS IN CALLBACKS */}
                      {savingsData.length > 0 ? (
                        <Box>
                          <Text color={textColorSecondary} fontSize="sm" mb="4" textAlign="center">
                            Monthly ENTO Savings Trend (Real Data)
                          </Text>
                          <HStack spacing="2" align="end" h="120px" justify="center">
                            {savingsData.map((item, index) => {
                              const maxValue = Math.max(...savingsData.map(d => d.entoSaved)) || 1;
                              const height = Math.max(4, (item.entoSaved / maxValue) * 100);
                              const isCurrentMonth = index === savingsData.length - 1;
                              
                              return (
                                <VStack key={item.month} spacing="1" flex="1">
                                  <Box
                                    bg={isCurrentMonth ? brandColor : successColor}
                                    h={`${height}px`}
                                    w="100%"
                                    borderRadius="4px 4px 0 0"
                                    minH="4px"
                                    transition="all 0.3s ease"
                                    _hover={{
                                      bg: isCurrentMonth ? chartBrandColor : chartSuccessColor,
                                      transform: "scale(1.05)",
                                      cursor: "pointer"
                                    }}
                                    title={`${item.month}: ${item.entoSaved} ENTO, ${item.co2Saved} kg CO2`}
                                  />
                                  <Text color={textColorSecondary} fontSize="xs" fontWeight="bold">
                                    {item.month}
                                  </Text>
                                  <Text color={textColor} fontSize="xs" fontWeight="bold">
                                    {item.entoSaved}
                                  </Text>
                                </VStack>
                              );
                            })}
                          </HStack>
                        </Box>
                      ) : (
                        <Flex justify="center" align="center" h="120px" direction="column">
                          <Text color={textColorSecondary} fontSize="sm">
                            No transaction data available yet
                          </Text>
                          <Text color={textColorSecondary} fontSize="xs">
                            Start making carbon offset purchases to see your impact!
                          </Text>
                        </Flex>
                      )}

                      {/* Recent Transactions */}
                      {recentTransactions.length > 0 && (
                        <Box>
                          <Text color={textColorSecondary} fontSize="sm" mb="3" fontWeight="500">
                            Recent Activity
                          </Text>
                          <VStack spacing="2" align="stretch" maxH="200px" overflowY="auto">
                            {recentTransactions.slice(0, 6).map((tx, index) => (
                              <HStack key={tx._id || index} justify="space-between" p="2" bg={subtleBg} borderRadius="md" _hover={{ bg: hoverBg }}>
                                <HStack>
                                  <Icon 
                                    as={tx.type === 'carbon_offset_purchase' ? MdEco : tx.type === 'ento_transfer' ? MdAccountBalanceWallet : MdLocalFireDepartment} 
                                    color={tx.type === 'carbon_offset_purchase' ? successColor : brandColor} 
                                    w="16px" 
                                    h="16px" 
                                  />
                                  <VStack align="start" spacing="0">
                                    <Text color={textColor} fontSize="sm" fontWeight="500">
                                      {tx.type === 'carbon_offset_purchase' ? 'Carbon Offset' : tx.type === 'ento_transfer' ? 'ENTO Transfer' : 'Energy Usage'}
                                    </Text>
                                    <Text color={textColorSecondary} fontSize="xs">
                                      {new Date(tx.date || tx.createdAt).toLocaleDateString()}
                                    </Text>
                                  </VStack>
                                </HStack>
                                <VStack align="end" spacing="0">
                                  <Text color={textColor} fontSize="sm" fontWeight="bold">
                                    {tx.amount || 0} {tx.type === 'energy_consumption' ? 'kWh' : 'ENTO'}
                                  </Text>
                                  <Badge 
                                    colorScheme={tx.status === 'verified' ? 'green' : 'orange'} 
                                    variant="subtle" 
                                    fontSize="xs"
                                  >
                                    {tx.status || 'pending'}
                                  </Badge>
                                </VStack>
                              </HStack>
                            ))}
                          </VStack>
                        </Box>
                      )}

                      {/* Growth Indicator from real data */}
                      {savingsData.length > 1 && (
                        <HStack justify="center" p="3" bg={subtleBg} borderRadius="lg">
                          <Icon as={MdTrendingUp} color={successColor} w="20px" h="20px" />
                          <Text color={textColor} fontSize="sm" fontWeight="bold">
                            {(() => {
                              const firstMonth = savingsData[0]?.entoSaved || 0;
                              const lastMonth = savingsData[savingsData.length - 1]?.entoSaved || 0;
                              const growth = firstMonth > 0 ? ((lastMonth - firstMonth) / firstMonth * 100) : 0;
                              return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
                            })()} 
                            Growth This Year
                          </Text>
                        </HStack>
                      )}
                    </VStack>
                  )}
                </CardBody>
              </Card>
            </SimpleGrid>
          </Box>
        </CardBody>
      </Card>
    </Box>
  );
}
