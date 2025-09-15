import React, { useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Icon
} from '@chakra-ui/react';
import { MdSettings, MdNotifications, MdBarChart } from 'react-icons/md';
import MeterAlertSystem from './MeterAlertSystem';
import AlertSystem from './AlertSystem'; // Your existing alert system
import AlertConfiguration from './AlertConfiguration';

const AlertDashboard = ({ userId }) => {
  const [alertConfig, setAlertConfig] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleConfigSave = (config) => {
    setAlertConfig(config);
    onClose();
  };

  return (
    <Box w="100%" p={6}>
      <HStack justify="space-between" mb={6}>
        <HStack>
          <Icon as={MdNotifications} w={6} h={6} color="blue.500" />
          <Text fontSize="2xl" fontWeight="bold">
            Alert Center
          </Text>
        </HStack>
        
        <Button
          leftIcon={<MdSettings />}
          onClick={onOpen}
          variant="outline"
          colorScheme="blue"
          size="sm"
        >
          Configure Alerts
        </Button>
      </HStack>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>
            <Icon as={MdBarChart} mr={2} />
            Energy Meter Alerts
          </Tab>
          <Tab>
            <Icon as={MdNotifications} mr={2} />
            System Alerts
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Text fontSize="md" color="gray.600">
                Monitor energy consumption alerts across all buildings in your institute
              </Text>
              <MeterAlertSystem userId={userId} />
            </VStack>
          </TabPanel>

          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Text fontSize="md" color="gray.600">
                General system alerts and notifications
              </Text>
              <AlertSystem />
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Configuration Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Alert Configuration</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <AlertConfiguration onConfigSave={handleConfigSave} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AlertDashboard;