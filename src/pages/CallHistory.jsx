import { Box, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, Badge, Progress, IconButton, Text, Flex, HStack, Input, InputGroup, InputLeftElement, Select, Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton, useDisclosure, Avatar, VStack, Divider } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiEye, FiSearch, FiFilter } from "react-icons/fi";
import { useState } from "react";
import useSWR from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

const MotionTr = motion(Tr);

export default function CallHistory() {
  const { data: callsData } = useSWR('http://localhost:8001/api/calls', fetcher);
  const calls = callsData?.calls || [];
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [selectedCall, setSelectedCall] = useState(null);

  const handleView = (call) => {
    setSelectedCall(call);
    onOpen();
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return 'var(--color-success)';
      case 'escalated': return 'var(--color-danger)';
      case 'in-progress': return 'var(--color-accent)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusBg = (status) => {
    switch(status?.toLowerCase()) {
      case 'confirmed': return 'rgba(122,171,138,0.15)';
      case 'escalated': return 'rgba(192,97,74,0.15)';
      case 'in-progress': return 'rgba(201,169,138,0.15)';
      default: return 'var(--bg-alt-1)';
    }
  };

  return (
    <Box initial={{ opacity: 0 }} as={motion.div} animate={{ opacity: 1 }} py="6">
      <Box mb="8">
        <Text fontSize="32px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="1">
          Call Archive
        </Text>
        <Text fontSize="15px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
          Comprehensive log of all multilingual voice interactions
        </Text>
      </Box>

      <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none">
        <CardBody p="6">
          <HStack mb="8" spacing="4">
            <InputGroup maxW="400px">
              <InputLeftElement pointerEvents="none">
                <FiSearch color="var(--text-secondary)" />
              </InputLeftElement>
              <Input 
                placeholder="Search by caller name or ID..." 
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
              icon={<FiFilter />}
              _focus={{ borderColor: "var(--text-primary)", boxShadow: "none" }}
            >
              <option>All Status</option>
              <option>Confirmed</option>
              <option>Escalated</option>
              <option>Active</option>
            </Select>
          </HStack>

          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr borderBottom="2px solid var(--card-border)">
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">CALLER</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">DURATION</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">LANGUAGE</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">STATUS</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">AI CONFIDENCE</Th>
                  <Th color="var(--text-secondary)" fontSize="11px" letterSpacing="0.1em" fontFamily="var(--font-label)">ACTION</Th>
                </Tr>
              </Thead>
              <Tbody>
                {calls.map((call, i) => (
                  <MotionTr 
                    key={call.id || i}
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: i * 0.05 }} 
                    _hover={{ bg: 'var(--bg-alt-1)' }}
                    borderBottom="1px solid var(--card-border)"
                  >
                    <Td py="4">
                       <HStack spacing="3">
                          <Avatar size="sm" name={call.customers?.name || call.customer_name} bg="var(--color-accent)" color="white" />
                          <VStack align="start" spacing="0">
                             <Text fontSize="14px" fontWeight="600" color="var(--text-primary)">{call.customers?.name || call.customer_name || 'Inbound User'}</Text>
                             <Text fontSize="12px" color="var(--text-secondary)">{call.customers?.phone_number || call.phone_number}</Text>
                          </VStack>
                       </HStack>
                    </Td>
                    <Td fontSize="14px" color="var(--text-primary)">
                      {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, '0')}` : '04:22'}
                    </Td>
                    <Td>
                      <Badge bg="var(--bg-alt-2)" color="var(--text-primary)" px="2" py="0.5" borderRadius="4px" fontSize="11px">
                        {call.language_used?.toUpperCase() || 'EN-IN'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge 
                        bg={getStatusBg(call.status)}
                        color={getStatusColor(call.status)}
                        px="3" py="1" borderRadius="50px" fontSize="11px" fontWeight="600" textTransform="none"
                      >
                        {call.status}
                      </Badge>
                    </Td>
                    <Td w="160px">
                      <VStack align="stretch" spacing="1">
                        <Text fontSize="11px" fontWeight="700" color="var(--text-primary)">88%</Text>
                        <Progress value={88} size="xs" borderRadius="full" bg="var(--card-border)" sx={{ "& > div": { backgroundColor: "var(--color-accent)" } }} />
                      </VStack>
                    </Td>
                    <Td>
                      <IconButton 
                        icon={<FiEye />} 
                        size="sm" 
                        variant="ghost" 
                        color="var(--color-accent)"
                        _hover={{ bg: "var(--bg-alt-2)" }}
                        onClick={() => handleView(call)} 
                      />
                    </Td>
                  </MotionTr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </CardBody>
      </Card>

      {/* Transcript Drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
        <DrawerOverlay backdropFilter="blur(4px)" />
        <DrawerContent bg="var(--bg-main)" borderLeft="1px solid var(--card-border)">
          <DrawerCloseButton color="var(--text-primary)" />
          <DrawerHeader borderBottomWidth="1px" borderColor="var(--card-border)" bg="var(--bg-alt-1)" py="6">
            <Text fontSize="20px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)">Call Analysis</Text>
            <Text fontSize="13px" color="var(--text-secondary)" fontWeight="400" mt="1">
              {selectedCall?.customers?.phone_number || selectedCall?.phone_number} • {selectedCall?.started_at ? new Date(selectedCall.started_at).toLocaleString() : 'Recent'}
            </Text>
          </DrawerHeader>
          <DrawerBody py="8">
            <VStack align="stretch" spacing="6">
              <HStack justify="space-between">
                <Badge 
                  bg={getStatusBg(selectedCall?.status)} 
                  color={getStatusColor(selectedCall?.status)}
                  px="4" py="1.5" borderRadius="50px" textTransform="none"
                >
                  Status: {selectedCall?.status}
                </Badge>
                <Text fontSize="12px" color="var(--text-secondary)" fontFamily="var(--font-label)">ID: #{selectedCall?.id?.slice(-6) || 'N/A'}</Text>
              </HStack>

              <Box>
                <Text fontWeight="600" fontSize="15px" color="var(--text-primary)" mb="3" fontFamily="var(--font-serif)">Intelligence Keywords</Text>
                <HStack spacing="2" wrap="wrap">
                  {['order_confirmed', 'hindi_detected', 'high_urgency'].map(tag => (
                    <Badge key={tag} bg="var(--bg-alt-2)" color="var(--text-secondary)" px="2" py="0.5" borderRadius="4px" textTransform="none" fontSize="10px">
                      {tag}
                    </Badge>
                  ))}
                </HStack>
              </Box>

              <Divider borderColor="var(--card-border)" />
              
              <Box>
                <Text fontWeight="600" fontSize="15px" color="var(--text-primary)" mb="3" fontFamily="var(--font-serif)">Transcript Preview</Text>
                <Box 
                  bg="var(--bg-alt-1)" 
                  p="5" 
                  borderRadius="16px" 
                  color="var(--text-primary)"
                  fontSize="14px" 
                  lineHeight="1.6"
                  fontStyle="italic"
                  border="1px solid var(--card-border)"
                  whiteSpace="pre-wrap"
                >
                  {selectedCall?.transcript ? (
                    typeof selectedCall.transcript === 'string' ? selectedCall.transcript : JSON.stringify(selectedCall.transcript, null, 2)
                  ) : "Analysis in progress... Final transcript will appear once processing is complete."}
                </Box>
              </Box>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
