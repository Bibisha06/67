import { Box, VStack, Text, Flex, Avatar, Icon } from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FiUser, FiCpu } from "react-icons/fi";
import { useRef, useEffect } from "react";

export default function TranscriptFeed({ transcript = [] }) {
  const scrollRef = useRef();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <VStack align="stretch" h="full" spacing="0">
      <Box mb="6">
        <Text fontSize="10px" fontWeight="700" color="var(--text-secondary)" letterSpacing="0.1em" fontFamily="var(--font-label)" mb="2">
          REAL-TIME TRANSCRIPT
        </Text>
        <Divider borderColor="var(--card-border)" />
      </Box>

      <Box 
        flex="1" 
        overflowY="auto" 
        ref={scrollRef}
        px="2"
        css={{
          '&::-webkit-scrollbar': { width: '4px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: 'var(--card-border)', borderRadius: '10px' },
        }}
      >
        <AnimatePresence initial={false}>
          {transcript.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Flex 
                mb="6" 
                direction={msg.role === 'assistant' ? 'row' : 'row-reverse'} 
                align="start"
              >
                <Avatar 
                  size="sm" 
                  icon={msg.role === 'assistant' ? <FiCpu /> : <FiUser />} 
                  bg={msg.role === 'assistant' ? 'var(--color-accent)' : 'var(--bg-alt-2)'}
                  color={msg.role === 'assistant' ? 'white' : 'var(--text-primary)'}
                  mt="1"
                />
                
                <VStack 
                  align={msg.role === 'assistant' ? 'start' : 'end'} 
                  mx="3" 
                  spacing="1" 
                  maxW="80%"
                >
                  <Box 
                    bg={msg.role === 'assistant' ? 'var(--bg-alt-1)' : 'var(--text-primary)'} 
                    color={msg.role === 'assistant' ? 'var(--text-primary)' : 'white'}
                    px="5" 
                    py="3" 
                    borderRadius={msg.role === 'assistant' ? "0 20px 20px 20px" : "20px 0 20px 20px"}
                    boxShadow="sm"
                    border="1px solid"
                    borderColor={msg.role === 'assistant' ? "var(--card-border)" : "transparent"}
                  >
                    <Text fontSize="14px" lineHeight="1.6" fontFamily="var(--font-sans)">
                      {msg.text}
                    </Text>
                  </Box>
                  <Text fontSize="10px" color="var(--text-secondary)" fontWeight="600">
                    {msg.confidence ? `CONFIDENCE: ${msg.confidence}%` : ''}
                  </Text>
                </VStack>
              </Flex>
            </motion.div>
          ))}
        </AnimatePresence>
      </Box>
    </VStack>
  );
}

const Divider = ({ borderColor }) => <Box w="full" borderBottom="1px solid" borderColor={borderColor} />;
