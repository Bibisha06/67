import { Box, Grid, GridItem, Card, CardBody, Text, Flex, Icon, HStack } from "@chakra-ui/react";
import { motion } from "framer-motion";
import PhoneFrame from "../components/PhoneFrame";
import TranscriptFeed from "../components/TranscriptFeed";
import IntelligencePanel from "../components/IntelligencePanel";
import { useState, useEffect } from "react";
import { FiActivity } from "react-icons/fi";
import useSWR from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

export default function LiveCall() {
  const [transcript, setTranscript] = useState([
    { role: 'assistant', text: 'Connecting to voice pipeline...', confidence: 100 },
  ]);
  const [slots, setSlots] = useState({ items: [], address: "Not detected" });
  const [logs, setLogs] = useState([{ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), msg: 'Session initialized' }]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Poll for latest call data
  const { data: callsData } = useSWR('http://localhost:8001/api/calls', fetcher, { refreshInterval: 2000 });
  const calls = callsData?.calls || [];
  const activeCall = calls.find(c => c.status === 'active' || c.status === 'in-progress') || calls[0];

  useEffect(() => {
    if (activeCall) {
      if (activeCall.status === 'active' || activeCall.status === 'in-progress') {
        setIsProcessing(true);
        // Sync transcript if available in backend
        if (activeCall.transcript && Array.isArray(activeCall.transcript)) {
           const mapped = activeCall.transcript.map(t => ({
             role: t.role,
             text: t.message || t.text,
             confidence: t.confidence || 92
           }));
           if (mapped.length > 0) setTranscript(mapped);
        }
      } else {
        setIsProcessing(false);
      }
    }
  }, [activeCall]);

  const endCall = async () => {
    if (!activeCall?.id) return;
    try {
      await axios.post('http://localhost:8001/api/call/end', { 
        call_id: activeCall.id,
        final_status: 'completed',
        language_used: activeCall.language_used || 'en'
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Box 
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      py="6"
      h="calc(100vh - 100px)"
      display="flex"
      flexDirection="column"
    >
      <Box mb="8">
        <HStack spacing="3" mb="1">
           <Icon as={FiActivity} color="var(--color-accent)" />
           <Text fontSize="32px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)">
             Live Call Monitor
           </Text>
        </HStack>
        <Text fontSize="15px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
          Real-time visualization of active AI voice interactions
        </Text>
      </Box>

      <Grid templateColumns={{ base: "1fr", lg: "repeat(12, 1fr)" }} gap="8" flex="1" overflow="hidden">
        {/* Phone UI */}
        <GridItem colSpan={{ base: 1, lg: 3 }} display="flex" justify="center" alignSelf="center">
          <PhoneFrame 
            callerName={activeCall?.customers?.name || activeCall?.customer_name || "Inbound User"} 
            phoneNumber={activeCall?.customers?.phone_number || activeCall?.phone_number} 
            isProcessing={isProcessing}
            onEndCall={endCall}
          />
        </GridItem>

        {/* Transcript */}
        <GridItem colSpan={{ base: 1, lg: 6 }} h="full">
          <Card h="full" bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="24px" boxShadow="none" overflow="hidden">
            <CardBody p="8">
              <TranscriptFeed transcript={transcript} />
            </CardBody>
          </Card>
        </GridItem>

        {/* Intelligence */}
        <GridItem colSpan={{ base: 1, lg: 3 }} h="full">
          <Card h="full" bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="24px" boxShadow="none" overflow="hidden">
            <CardBody p="8">
              <IntelligencePanel slots={slots} confidence={activeCall?.confidence || 88} logs={logs} />
            </CardBody>
          </Card>
        </GridItem>
      </Grid>
    </Box>
  );
}
