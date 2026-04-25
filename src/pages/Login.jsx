import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  Heading,
  HStack,
  Icon,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Link,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

import automatonLogo from "../assets/automatonai-logo.png";
import advitLogo from "../assets/advit-logo.png";

const MotionBox = motion(Box);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);

export default function Login() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate("/");
    }, 1500);
  };

  return (
    <Box
      position="relative"
      minH="100vh"
      w="100%"
      bg="linear-gradient(135deg, var(--bg-main) 0%, var(--bg-alt-2) 50%, var(--card-border) 100%)"
      overflow="hidden"
    >
      {/* Background blobs and noise */}
      <Box className="blob-bg-1" />
      <Box className="blob-bg-2" />
      <Box className="noise-overlay" />

      <Flex
        position="relative"
        zIndex={2}
        minH="100vh"
        align="center"
        justify="center"
        direction="column"
        p={4}
      >
        {/* HERO WELCOME MESSAGE */}
        <VStack spacing={3} mb={8} textAlign="center">
          <MotionText
            className="tracking-wide-label"
            fontSize="sm"
            color="var(--text-secondary)"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            VOICE AGENT PLATFORM
          </MotionText>
          
          <MotionHeading
            as="h1"
            fontSize="52px"
            color="var(--text-primary)"
            fontWeight="500"
            fontFamily="var(--font-serif)"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
          >
            Welcome to Automative VoxNest
          </MotionHeading>
          
          <MotionText
            fontSize="16px"
            color="var(--text-secondary)"
            fontFamily="var(--font-sans)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Intelligent Voice Agent Command Center
          </MotionText>
          
          <MotionText
            className="tracking-wide-label"
            fontSize="xs"
            color="var(--text-secondary)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Powered by LLaMA · Whisper · Sarvam AI · LiveKit
          </MotionText>
        </VStack>

        {/* LOGO SECTION */}
        <HStack spacing={8} mb={10} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8, duration: 0.8 }}>
          <Box
            as={motion.div}
            whileHover={{ scale: 1.04 }}
            transition="0.3s ease"
            filter="drop-shadow(0 4px 12px rgba(60,30,10,0.08))"
          >
            <Image src={automatonLogo} alt="AutomatonAI" h="72px" objectFit="contain" />
          </Box>
          <Box w="1px" h="60px" bg="var(--text-secondary)" opacity={0.3} />
          <Box
            as={motion.div}
            whileHover={{ scale: 1.04 }}
            transition="0.3s ease"
            filter="drop-shadow(0 4px 12px rgba(60,30,10,0.08))"
          >
            <Image src={advitLogo} alt="ADVIT AI Labs" h="72px" objectFit="contain" />
          </Box>
        </HStack>

        {/* LOGIN CARD */}
        <MotionBox
          as="form"
          onSubmit={handleLogin}
          bg="var(--card-bg)"
          border="1px solid var(--card-border)"
          borderRadius="20px"
          boxShadow="0 12px 40px rgba(60, 30, 10, 0.08)"
          p={8}
          w="100%"
          maxW="400px"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.4 }}
        >
          <VStack spacing={2} mb={6} align="center">
            <Text className="tracking-wide-label" fontSize="xs" color="var(--text-secondary)">
              SIGN IN
            </Text>
            <Text fontSize="26px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)">
              Access Your Dashboard
            </Text>
            <Text color="var(--text-secondary)" fontSize="13px" fontFamily="var(--font-sans)">
              Enter your credentials to continue
            </Text>
          </VStack>

          <Stack spacing={4}>
            <FormControl id="email">
              <Input
                type="email"
                placeholder="Email address"
                bg="var(--bg-main)"
                color="var(--text-primary)"
                border="1px solid var(--card-border)"
                _placeholder={{ color: "var(--text-secondary)" }}
                _focus={{ borderColor: "var(--text-primary)", boxShadow: "none", bg: "var(--bg-main)" }}
                _hover={{ bg: "var(--bg-main)", borderColor: "var(--text-secondary)" }}
                borderRadius="8px"
                py={6}
                required
              />
            </FormControl>

            <FormControl id="password">
              <InputGroup size="md">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  bg="var(--bg-main)"
                  color="var(--text-primary)"
                  border="1px solid var(--card-border)"
                  _placeholder={{ color: "var(--text-secondary)" }}
                  _focus={{ borderColor: "var(--text-primary)", boxShadow: "none", bg: "var(--bg-main)" }}
                  _hover={{ bg: "var(--bg-main)", borderColor: "var(--text-secondary)" }}
                  borderRadius="8px"
                  py={6}
                  required
                />
                <InputRightElement h="100%">
                  <Icon
                    as={showPassword ? FiEyeOff : FiEye}
                    color="var(--text-secondary)"
                    cursor="pointer"
                    onClick={() => setShowPassword(!showPassword)}
                    _hover={{ color: "var(--text-primary)" }}
                  />
                </InputRightElement>
              </InputGroup>
            </FormControl>

            <Flex justify="space-between" align="center" mt={2}>
              <Checkbox colorScheme="orange" size="sm" color="var(--text-secondary)" iconColor="white">
                <Text fontSize="13px">Remember me</Text>
              </Checkbox>
              <Link color="var(--color-accent)" fontSize="13px" fontWeight="500" _hover={{ color: "var(--text-primary)" }}>
                Forgot password?
              </Link>
            </Flex>

            <Button
              type="submit"
              w="100%"
              mt={4}
              py={6}
              bg="var(--btn-primary)"
              color="var(--bg-main)"
              fontFamily="var(--font-label)"
              textTransform="uppercase"
              letterSpacing="0.1em"
              fontSize="14px"
              fontWeight="500"
              borderRadius="50px"
              isLoading={isLoading}
              loadingText="Signing in..."
              _hover={{
                bg: "var(--btn-primary-hover)",
                boxShadow: "0 4px 15px rgba(60,30,10,0.15)",
              }}
              _active={{
                transform: "translateY(0)",
              }}
              transition="all 0.3s ease"
            >
              LOGIN
            </Button>
          </Stack>
        </MotionBox>
      </Flex>
    </Box>
  );
}
