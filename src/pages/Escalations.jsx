import { Box, Text, Grid, Card, CardBody, Avatar, Badge, VStack, HStack, Button, Icon, Flex, Spacer, Progress, Heading, Divider } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiShield, FiCheck, FiEye, FiAlertCircle } from "react-icons/fi";
import useSWR from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

const MotionBox = motion(Box);

export default function Escalations() {
  const { data: escalationsData } = useSWR('http://localhost:8001/api/escalations', fetcher);
  const escalations = escalationsData?.escalations || [];

  return (
    <Box as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} py="6">
      {/* Header Section */}
      <Box mb="10">
        <Text fontSize="32px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="1">
          Escalation Command
        </Text>
        <Text fontSize="15px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
          Human intervention required for complex or low-confidence voice sessions
        </Text>
      </Box>

      {escalations.length === 0 ? (
        <Flex direction="column" align="center" justify="center" py="32" bg="var(--bg-alt-1)" borderRadius="24px" border="2px dashed var(--card-border)">
           <Icon as={FiCheck} fontSize="56px" color="var(--color-success)" mb="6" />
           <Text fontSize="22px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="2">Zero Pending Escalations</Text>
           <Text fontSize="14px" color="var(--text-secondary)" fontFamily="var(--font-sans)">The voice agents are operating with high precision today.</Text>
        </Flex>
      ) : (
        <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} gap="8">
          {escalations.map((esc, i) => (
            <MotionBox
              key={esc.id || i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card 
                bg="var(--card-bg)" 
                border="1px solid var(--card-border)" 
                borderTop="4px solid var(--color-danger)"
                borderRadius="20px" 
                boxShadow="none"
              >
                <CardBody p="6">
                  <VStack align="stretch" spacing="5">
                    <HStack justify="space-between" align="start">
                      <HStack spacing="3">
                        <Avatar size="sm" name={esc.customers?.name} bg="var(--color-danger)" color="white" />
                        <VStack align="start" spacing="0">
                          <Text fontSize="15px" fontWeight="600" color="var(--text-primary)" fontFamily="var(--font-serif)">{esc.customers?.name || 'Inbound User'}</Text>
                          <Text fontSize="12px" color="var(--text-secondary)" fontFamily="var(--font-sans)">{esc.created_at ? new Date(esc.created_at).toLocaleTimeString() : 'Recently'}</Text>
                        </VStack>
                      </HStack>
                      <Badge bg="rgba(192,97,74,0.15)" color="var(--color-danger)" borderRadius="4px" fontSize="10px" px="2">URGENT</Badge>
                    </HStack>

                    <Box bg="var(--bg-alt-1)" p="4" borderRadius="12px" border="1px solid var(--card-border)">
                       <Text fontSize="10px" color="var(--text-secondary)" fontWeight="700" letterSpacing="0.05em" fontFamily="var(--font-label)" mb="2">ESCALATION REASON</Text>
                       <Text fontSize="13px" color="var(--text-primary)" fontStyle="italic" lineHeight="1.5">
                         "{esc.reason || 'Voice agent was unable to extract specific order details after multiple attempts.'}"
                       </Text>
                    </Box>

                    <Box>
                      <Flex justify="space-between" mb="2">
                         <Text fontSize="11px" fontWeight="700" color="var(--text-secondary)" letterSpacing="0.05em" fontFamily="var(--font-label)">AI CONFIDENCE</Text>
                         <Text fontSize="11px" fontWeight="700" color="var(--color-danger)">42%</Text>
                      </Flex>
                      <Progress value={42} size="xs" borderRadius="full" bg="var(--card-border)" sx={{ "& > div": { backgroundColor: "var(--color-danger)" } }} />
                    </Box>

                    <Divider borderColor="var(--card-border)" />

                    <HStack spacing="3">
                      <Button 
                        flex="1" 
                        size="sm" 
                        bg="var(--color-success)" 
                        color="white" 
                        borderRadius="50px"
                        _hover={{ opacity: 0.9 }}
                        leftIcon={<FiCheck />}
                      >
                        Resolve
                      </Button>
                      <Button 
                        flex="1" 
                        size="sm" 
                        variant="outline" 
                        borderColor="var(--card-border)"
                        color="var(--text-primary)"
                        borderRadius="50px"
                        _hover={{ bg: "var(--bg-alt-1)" }}
                        leftIcon={<FiEye />}
                      >
                        Audit
                      </Button>
                    </HStack>
                  </VStack>
                </CardBody>
              </Card>
            </MotionBox>
          ))}
        </Grid>
      )}
    </Box>
  );
}
