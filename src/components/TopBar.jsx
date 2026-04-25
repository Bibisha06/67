import {
  Box,
  Flex,
  HStack,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Avatar,
  Text,
  Badge,
  Icon,
} from "@chakra-ui/react";
import { FiSearch, FiBell, FiSun, FiMenu } from "react-icons/fi";
import { useLocation } from "react-router-dom";

export default function TopBar({ onOpenSidebar }) {
  const location = useLocation();
  const pathName = location.pathname === "/" ? "Overview" : location.pathname.substring(1).replace("-", " ");
  const title = pathName.charAt(0).toUpperCase() + pathName.slice(1);

  return (
    <Box
      as="header"
      position="sticky"
      top="0"
      bg="var(--bg-alt-1)"
      w="full"
      h="72px"
      px={{ base: 4, md: 8 }}
      zIndex="10"
      borderBottom="1px solid var(--card-border)"
      backdropFilter="blur(10px)"
    >
      <Flex h="full" align="center" justify="space-between">
        {/* Mobile Sidebar Toggle */}
        <IconButton
          display={{ base: "flex", md: "none" }}
          onClick={onOpenSidebar}
          variant="ghost"
          aria-label="Open menu"
          icon={<FiMenu />}
          color="var(--text-primary)"
          mr={4}
        />

        {/* BREADCRUMB */}
        <Flex align="center" display={{ base: "none", sm: "flex" }}>
          <Text fontFamily="var(--font-serif)" fontSize="20px" fontWeight="500" color="var(--text-primary)">
            Dashboard <Text as="span" color="var(--text-secondary)" mx="2">/</Text> {title}
          </Text>
        </Flex>

        {/* CENTER STATUS BADGE */}
        <Box display={{ base: "none", lg: "block" }}>
          <Badge
            px="4"
            py="1.5"
            borderRadius="50px"
            bg="rgba(122,171,138,0.15)"
            color="var(--color-success)"
            fontFamily="var(--font-label)"
            letterSpacing="0.05em"
            textTransform="none"
            fontSize="12px"
            fontWeight="500"
            display="flex"
            alignItems="center"
            gap="2"
            border="1px solid rgba(122,171,138,0.3)"
          >
            <Box className="pulse-dot-warm" w="6px" h="6px" borderRadius="full" bg="var(--color-success)" color="var(--color-success)" />
            All Services Operational
          </Badge>
        </Box>

        {/* RIGHT CONTROLS */}
        <HStack spacing="4">
          <InputGroup w={{ base: "full", md: "240px" }} display={{ base: "none", md: "block" }}>
            <InputLeftElement pointerEvents="none">
              <Icon as={FiSearch} color="var(--text-secondary)" />
            </InputLeftElement>
            <Input
              type="text"
              placeholder="Search..."
              bg="var(--bg-main)"
              border="1px solid var(--card-border)"
              color="var(--text-primary)"
              fontFamily="var(--font-sans)"
              fontSize="13px"
              borderRadius="50px"
              _placeholder={{ color: "var(--text-secondary)" }}
              _focus={{ borderColor: "var(--text-primary)", boxShadow: "none" }}
              _hover={{ borderColor: "var(--text-secondary)" }}
            />
          </InputGroup>

          <HStack spacing="2">
            <IconButton
              aria-label="Toggle dark mode"
              icon={<FiSun />}
              variant="ghost"
              color="var(--text-primary)"
              _hover={{ bg: "var(--bg-alt-2)" }}
              borderRadius="full"
            />
            <Box position="relative">
              <IconButton
                aria-label="Notifications"
                icon={<FiBell />}
                variant="ghost"
                color="var(--text-secondary)"
                _hover={{ bg: "var(--bg-alt-2)", color: "var(--text-primary)" }}
                borderRadius="full"
              />
              <Box position="absolute" top="10px" right="10px" w="8px" h="8px" bg="var(--color-danger)" borderRadius="full" border="2px solid var(--bg-alt-1)" />
            </Box>

            <Menu>
              <MenuButton ml="2">
                <Avatar size="sm" name="Admin User" src="" border="2px solid var(--card-border)" bg="var(--color-accent)" color="white" />
              </MenuButton>
              <MenuList bg="var(--card-bg)" borderColor="var(--card-border)" boxShadow="0 10px 30px rgba(60,30,10,0.1)">
                <MenuItem bg="transparent" _hover={{ bg: "var(--bg-alt-1)" }} color="var(--text-primary)" fontFamily="var(--font-sans)">Profile</MenuItem>
                <MenuItem bg="transparent" _hover={{ bg: "var(--bg-alt-1)" }} color="var(--text-primary)" fontFamily="var(--font-sans)">Settings</MenuItem>
                <MenuItem bg="transparent" _hover={{ bg: "var(--bg-alt-1)" }} color="var(--color-danger)" fontFamily="var(--font-sans)">Logout</MenuItem>
              </MenuList>
            </Menu>
          </HStack>
        </HStack>
      </Flex>
    </Box>
  );
}
