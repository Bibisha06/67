import { Box, VStack, Text, IconButton, Icon, Flex, Circle, Heading } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiPhoneOff, FiMic, FiVolume2, FiMoreHorizontal, FiUser } from "react-icons/fi";

const MotionBox = motion(Box);
const MotionCircle = motion(Circle);

export default function PhoneFrame({ callerName = "Inbound Caller", phoneNumber = "+91 90000 00000", isProcessing = false, onEndCall }) {
  return (
    <Box 
      w="310px" 
      h="620px" 
      bg="var(--bg-sidebar)" 
      borderRadius="45px" 
      p="3" 
      position="relative" 
      boxShadow="2xl"
      border="8px solid rgba(255,255,255,0.05)"
    >
      {/* Speaker/Notch */}
      <Box 
        position="absolute" 
        top="0" 
        left="50%" 
        transform="translateX(-50%)" 
        w="120px" 
        h="25px" 
        bg="var(--bg-sidebar)" 
        borderRadius="0 0 15px 15px" 
        zIndex="2" 
      />

      {/* Screen Content */}
      <Box 
        w="full" 
        h="full" 
        bg="linear-gradient(180deg, var(--bg-sidebar) 0%, #1e110a 100%)" 
        borderRadius="35px" 
        position="relative" 
        overflow="hidden"
        color="white"
        display="flex"
        flexDirection="column"
        alignItems="center"
        pt="16"
        pb="10"
      >
        {/* Call Info */}
        <VStack spacing="4" mb="12">
          <MotionBox
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Circle size="90px" bg="rgba(255,255,255,0.05)" border="1px solid rgba(255,255,255,0.1)">
              <Icon as={FiUser} fontSize="40px" color="var(--color-accent)" />
            </Circle>
          </MotionBox>
          <VStack spacing="1">
            <Heading fontSize="22px" fontWeight="500" fontFamily="var(--font-serif)">{callerName}</Heading>
            <Text fontSize="14px" color="rgba(255,255,255,0.4)" fontFamily="var(--font-sans)">{phoneNumber}</Text>
          </VStack>
          <Badge bg="var(--color-success)" color="white" borderRadius="50px" px="3" fontSize="10px">ACTIVE VOICE SESSION</Badge>
        </VStack>

        {/* Visualizer */}
        <Flex flex="1" align="center" justify="center" w="full">
          <HStack spacing="3" h="40px" align="center">
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <MotionBox
                key={i}
                w="3px"
                bg="var(--color-accent)"
                initial={{ height: "10px" }}
                animate={{ height: isProcessing ? ["10px", "40px", "15px", "30px", "10px"] : "10px" }}
                transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.1 }}
                borderRadius="full"
              />
            ))}
          </HStack>
        </Flex>

        {/* Controls */}
        <VStack spacing="10" w="full">
          <Grid templateColumns="repeat(3, 1fr)" gap="10">
            <ControlBtn icon={FiMic} label="Mute" />
            <ControlBtn icon={FiVolume2} label="Speaker" />
            <ControlBtn icon={FiMoreHorizontal} label="Add" />
          </Grid>
          
          <IconButton
            aria-label="End Call"
            icon={<FiPhoneOff />}
            bg="var(--color-danger)"
            color="white"
            size="lg"
            fontSize="24px"
            borderRadius="full"
            w="65px"
            h="65px"
            _hover={{ bg: "#d4563d", transform: "scale(1.05)" }}
            onClick={onEndCall}
          />
        </VStack>
      </Box>
    </Box>
  );
}

function ControlBtn({ icon, label }) {
  return (
    <VStack spacing="2">
      <Circle size="50px" bg="rgba(255,255,255,0.08)" cursor="pointer" _hover={{ bg: "rgba(255,255,255,0.15)" }} transition="0.2s">
        <Icon as={icon} color="white" fontSize="20px" />
      </Circle>
      <Text fontSize="10px" color="rgba(255,255,255,0.4)" fontWeight="600" textTransform="uppercase">{label}</Text>
    </VStack>
  );
}

const Badge = ({ children, ...props }) => (
  <Box px="2" py="0.5" borderRadius="4px" fontSize="11px" fontWeight="700" {...props}>
    {children}
  </Box>
);
