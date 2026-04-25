import { Box, VStack, Text, HStack, Icon, Badge, Progress, Flex, Divider, Tag, TagLabel, Button, Tooltip } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCpu, FiMapPin, FiShoppingCart, FiCheck, FiAlertCircle, FiDatabase } from "react-icons/fi";

export default function IntelligencePanel({ slots = {}, confidence = 0, logs = [] }) {
  const items = slots.items || [];
  const address = slots.address || "Not detected";
  
  return (
    <VStack align="stretch" spacing="6" h="full">
      <HStack>
        <Icon as={FiCpu} color="var(--color-accent)" fontSize="18px" />
        <Text fontWeight="600" fontSize="15px" fontFamily="var(--font-serif)" color="var(--text-primary)">AI Intelligence</Text>
      </HStack>

      {/* Order Slots */}
      <Box p="5" bg="var(--bg-alt-1)" borderRadius="20px" border="1px solid var(--card-border)">
        <HStack mb="5">
          <Icon as={FiShoppingCart} color="var(--text-secondary)" fontSize="14px" />
          <Text fontSize="10px" fontWeight="700" color="var(--text-secondary)" letterSpacing="0.1em" fontFamily="var(--font-label)">ORDER SLOTS</Text>
        </HStack>
        
        <VStack align="stretch" spacing="4">
          <Box>
            <Text fontSize="10px" color="var(--text-secondary)" mb="2" fontWeight="700">EXTRACTED ITEMS</Text>
            <HStack flexWrap="wrap" spacing="2">
              {items.map((item, i) => (
                <Tag key={i} size="sm" bg="rgba(201,169,138,0.2)" color="var(--color-accent)" borderRadius="4px" variant="subtle">
                  <TagLabel fontWeight="600">{item.name} x{item.qty}</TagLabel>
                </Tag>
              ))}
              {items.length === 0 && <Text fontSize="13px" color="var(--text-secondary)" fontStyle="italic">Waiting for detection...</Text>}
            </HStack>
          </Box>

          <Box>
            <Text fontSize="10px" color="var(--text-secondary)" mb="2" fontWeight="700">DELIVERY ADDRESS</Text>
            <HStack>
              <Icon as={FiMapPin} color="var(--color-accent)" fontSize="12px" />
              <Text fontSize="13px" fontWeight="500" color="var(--text-primary)">{address}</Text>
            </HStack>
          </Box>

          <Box pt="2">
            <Flex justify="space-between" mb="2">
              <Text fontSize="10px" color="var(--text-secondary)" fontWeight="700">CONFIDENCE</Text>
              <Text fontSize="11px" fontWeight="700" color={confidence > 80 ? "var(--color-success)" : "var(--color-accent)"}>{confidence}%</Text>
            </Flex>
            <Progress 
              value={confidence} 
              size="xs" 
              borderRadius="full" 
              bg="var(--card-border)"
              sx={{ "& > div": { backgroundColor: confidence > 80 ? "var(--color-success)" : "var(--color-accent)" } }}
            />
          </Box>
        </VStack>
      </Box>

      {/* Log */}
      <Box flex="1" overflow="hidden">
        <HStack mb="4">
          <Icon as={FiDatabase} color="var(--text-secondary)" fontSize="14px" />
          <Text fontSize="10px" fontWeight="700" color="var(--text-secondary)" letterSpacing="0.1em" fontFamily="var(--font-label)">REALTIME ENGINE LOG</Text>
        </HStack>
        <Box 
          h="180px" 
          overflowY="auto" 
          pr="2"
          css={{
            '&::-webkit-scrollbar': { width: '3px' },
            '&::-webkit-scrollbar-track': { background: 'transparent' },
            '&::-webkit-scrollbar-thumb': { background: 'var(--card-border)', borderRadius: '10px' },
          }}
        >
          <AnimatePresence initial={false}>
            {logs.map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Text fontSize="11px" py="1.5" borderBottom="1px solid var(--bg-alt-2)" color="var(--text-secondary)" fontFamily="var(--font-sans)">
                  <Text as="span" color="var(--color-accent)" fontWeight="700">[{log.time}]</Text> {log.msg}
                </Text>
              </motion.div>
            ))}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Actions */}
      <VStack spacing="3" pt="4">
         <Button 
            w="full" 
            bg="var(--color-success)" 
            color="white" 
            size="lg" 
            borderRadius="50px"
            leftIcon={<FiCheck />} 
            isDisabled={items.length === 0}
            _hover={{ opacity: 0.9 }}
          >
            Confirm Order
          </Button>
         <Button 
            w="full" 
            variant="outline" 
            borderColor="var(--card-border)"
            color="var(--text-primary)" 
            size="lg" 
            borderRadius="50px"
            leftIcon={<FiAlertCircle />}
            _hover={{ bg: "var(--bg-alt-1)" }}
          >
            Escalate to Human
          </Button>
      </VStack>
    </VStack>
  );
}
