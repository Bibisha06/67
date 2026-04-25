import { Box, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, Badge, IconButton, Text, Flex, HStack, Input, InputGroup, InputLeftElement, Select, Avatar, VStack, Divider, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, useDisclosure, Stat, StatLabel, StatNumber, Grid, Icon } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiEye, FiSearch, FiGlobe, FiShoppingBag, FiCalendar } from "react-icons/fi";
import { useState } from "react";
import useSWR from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

const MotionBox = motion(Box);
const MotionTr = motion(Tr);

export default function Customers() {
  const { data: customersData } = useSWR('http://localhost:8001/api/customers', fetcher);
  const customers = customersData?.customers || [];
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const handleView = (customer) => {
    setSelectedCustomer(customer);
    onOpen();
  };

  return (
    <Box as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} py="6">
      <Box mb="8">
        <Text fontSize="32px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="1">
          Customer Directory
        </Text>
        <Text fontSize="15px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
          Detailed profile management for all voice agent interactions
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap="6" mb="10">
        <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none">
          <CardBody>
            <Stat>
               <StatLabel color="var(--text-secondary)" fontSize="11px" fontWeight="700" letterSpacing="0.1em" fontFamily="var(--font-label)">TOTAL RECORDS</StatLabel>
               <StatNumber fontSize="32px" color="var(--text-primary)" fontFamily="var(--font-serif)">{customers.length}</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none">
          <CardBody>
            <Stat>
               <StatLabel color="var(--text-secondary)" fontSize="11px" fontWeight="700" letterSpacing="0.1em" fontFamily="var(--font-label)">RETURNING USERS</StatLabel>
               <StatNumber fontSize="32px" color="var(--text-primary)" fontFamily="var(--font-serif)">84%</StatNumber>
            </Stat>
          </CardBody>
        </Card>
        <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none">
          <CardBody>
            <Stat>
               <StatLabel color="var(--text-secondary)" fontSize="11px" fontWeight="700" letterSpacing="0.1em" fontFamily="var(--font-label)">PRIMARY LANGUAGE</StatLabel>
               <StatNumber fontSize="32px" color="var(--text-primary)" fontFamily="var(--font-serif)">Hindi</StatNumber>
            </Stat>
          </CardBody>
        </Card>
      </Grid>

      <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none">
        <CardBody p="6">
          <HStack mb="8" spacing="4">
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="var(--text-secondary)" />
              </InputLeftElement>
              <Input 
                placeholder="Search customers..." 
                fontSize="14px" 
                bg="var(--bg-main)"
                border="1px solid var(--card-border)"
                _focus={{ borderColor: "var(--text-primary)", boxShadow: "none" }}
              />
            </InputGroup>
            <Select 
              w="200px" 
              fontSize="14px" 
              bg="var(--bg-main)"
              border="1px solid var(--card-border)"
              _focus={{ borderColor: "var(--text-primary)", boxShadow: "none" }}
            >
              <option>All Languages</option>
              <option>Hindi</option>
              <option>English</option>
              <option>Kannada</option>
            </Select>
          </HStack>

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr borderBottom="2px solid var(--card-border)">
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">CUSTOMER</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">PHONE NUMBER</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">LANGUAGE</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">TOTAL ORDERS</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">LAST CALL</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">ACTION</Th>
                </Tr>
              </Thead>
              <Tbody>
                {customers.map((customer, i) => (
                  <MotionTr 
                    key={customer.id || i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    _hover={{ bg: 'var(--bg-alt-1)' }}
                    borderBottom="1px solid var(--card-border)"
                  >
                    <Td py="4">
                      <HStack spacing="3">
                        <Avatar size="sm" name={customer.name} bg="var(--color-accent)" color="white" />
                        <Text fontSize="14px" fontWeight="600" color="var(--text-primary)">{customer.name || 'Unknown User'}</Text>
                      </HStack>
                    </Td>
                    <Td fontSize="14px" color="var(--text-secondary)" fontFamily="var(--font-sans)">{customer.phone_number}</Td>
                    <Td>
                      <Badge bg="rgba(201,169,138,0.15)" color="var(--color-accent)" px="3" py="0.5" borderRadius="4px" fontSize="11px">
                        {customer.preferred_lang?.toUpperCase() || 'HI-IN'}
                      </Badge>
                    </Td>
                    <Td fontSize="14px" fontWeight="600" color="var(--text-primary)">{customer.order_count || 0}</Td>
                    <Td fontSize="13px" color="var(--text-secondary)">{customer.created_at ? new Date(customer.created_at).toLocaleDateString() : 'Recently'}</Td>
                    <Td>
                      <IconButton 
                        icon={<FiEye />} 
                        size="sm" 
                        variant="ghost" 
                        color="var(--color-accent)"
                        _hover={{ bg: "var(--bg-alt-2)" }}
                        onClick={() => handleView(customer)} 
                      />
                    </Td>
                  </MotionTr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Customer Detail Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay backdropFilter="blur(4px)" />
        <ModalContent borderRadius="20px" bg="var(--bg-main)" border="1px solid var(--card-border)">
          <ModalHeader borderBottomWidth="1px" borderColor="var(--card-border)" py="6" bg="var(--bg-alt-1)" borderRadius="20px 20px 0 0">
             <HStack spacing="4">
                <Avatar size="lg" name={selectedCustomer?.name} bg="var(--color-accent)" color="white" />
                <VStack align="start" spacing="0">
                   <Text fontSize="24px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)">{selectedCustomer?.name || 'Customer Profile'}</Text>
                   <Text fontSize="14px" color="var(--text-secondary)">{selectedCustomer?.phone_number}</Text>
                </VStack>
             </HStack>
          </ModalHeader>
          <ModalCloseButton color="var(--text-primary)" />
          <ModalBody py="10">
             <Grid templateColumns="repeat(2, 1fr)" gap="10" mb="10">
                <VStack align="start" spacing="1">
                   <HStack color="var(--text-secondary)" fontSize="10px" fontWeight="700" letterSpacing="0.1em" fontFamily="var(--font-label)">
                      <Icon as={FiGlobe} /> <Text>PRIMARY LANGUAGE</Text>
                   </HStack>
                   <Text fontWeight="600" color="var(--text-primary)" fontSize="16px">{selectedCustomer?.preferred_lang || 'Hindi (Indo-Aryan)'}</Text>
                </VStack>
                <VStack align="start" spacing="1">
                   <HStack color="var(--text-secondary)" fontSize="10px" fontWeight="700" letterSpacing="0.1em" fontFamily="var(--font-label)">
                      <Icon as={FiCalendar} /> <Text>MEMBER SINCE</Text>
                   </HStack>
                   <Text fontWeight="600" color="var(--text-primary)" fontSize="16px">{selectedCustomer?.created_at ? new Date(selectedCustomer.created_at).toLocaleDateString() : 'Jan 12, 2026'}</Text>
                </VStack>
             </Grid>

             <Divider borderColor="var(--card-border)" mb="8" />

             <VStack align="stretch" spacing="5">
                <HStack justify="space-between">
                   <Text fontSize="16px" fontWeight="600" color="var(--text-primary)" fontFamily="var(--font-serif)">Recent Activity</Text>
                   <Badge bg="rgba(122,171,138,0.15)" color="var(--color-success)" borderRadius="50px" px="3" py="1" fontSize="11px">Active</Badge>
                </HStack>
                <Box bg="var(--bg-alt-1)" p="5" borderRadius="16px" border="1px solid var(--card-border)">
                   <HStack mb="3">
                      <Icon as={FiShoppingBag} color="var(--color-accent)" />
                      <Text fontSize="11px" fontWeight="700" color="var(--text-secondary)" letterSpacing="0.05em">LAST ORDER: #ORD-9921</Text>
                   </HStack>
                   <Text fontSize="14px" color="var(--text-primary)" lineHeight="1.5">
                      The customer successfully placed an order for 2x Organic Soy Candles and requested gift wrapping.
                   </Text>
                </Box>
             </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
}
