import { Box, VStack, Text, Link, HStack, Icon, Avatar, Spacer, Divider } from "@chakra-ui/react";
import { Link as RouterLink, useLocation } from "react-router-dom";
import { FiHome, FiActivity, FiPhoneCall, FiShoppingBag, FiAlertCircle, FiUsers, FiSettings, FiLogOut, FiPackage } from "react-icons/fi";


const NavItem = ({ icon, label, to, active }) => {
  return (
    <Link
      as={RouterLink}
      to={to}
      w="full"
      _hover={{ textDecoration: "none" }}
    >
      <Box
        px="6"
        py="3.5"
        display="flex"
        alignItems="center"
        borderLeft="3px solid"
        borderColor={active ? "var(--color-accent)" : "transparent"}
        bg={active ? "rgba(255,255,255,0.05)" : "transparent"}
        color={active ? "white" : "rgba(255,255,255,0.6)"}
        transition="all 0.3s ease"
        _hover={{
          color: "white",
          bg: "rgba(255,255,255,0.02)"
        }}
      >
        <Icon as={icon} mr="4" fontSize="18px" />
        <Text fontFamily="var(--font-label)" fontSize="11px" fontWeight="500" letterSpacing="0.1em" textTransform="uppercase">
          {label}
        </Text>
      </Box>
    </Link>
  );
};

export default function Sidebar() {
  const location = useLocation();

  return (
    <Box
      w="260px"
      h="100vh"
      bg="var(--bg-sidebar)"
      position="fixed"
      left="0"
      top="0"
      py="6"
      display={{ base: "none", md: "block" }}
      color="white"
      borderRight="1px solid rgba(255,255,255,0.05)"
      zIndex="1000"
    >
      <VStack align="start" h="full" spacing="6">
        {/* BRAND TEXT */}
        <Box px="6" mb="4" w="full" pt="2">
          <Text fontSize="24px" fontWeight="500" color="white" letterSpacing="tight" fontFamily="var(--font-serif)">
            VoxNest
          </Text>
          <Text fontSize="9px" color="rgba(255,255,255,0.4)" fontWeight="700" letterSpacing="0.2em" fontFamily="var(--font-label)" mt="1">
            VOICE COMMAND CENTER
          </Text>
        </Box>

        <VStack w="full" align="start" spacing="1">
          <Box px="6" mb="2">
            <Text fontSize="10px" color="rgba(255,255,255,0.2)" fontWeight="700" letterSpacing="0.1em">
              ANALYTICS
            </Text>
          </Box>
          <NavItem icon={FiHome} label="Dashboard" to="/" active={location.pathname === "/"} />
          <NavItem icon={FiActivity} label="Live Monitoring" to="/live" active={location.pathname === "/live"} />
          <NavItem icon={FiPhoneCall} label="Call History" to="/calls" active={location.pathname === "/calls"} />
          
          <Box px="6" mt="6" mb="2">
            <Text fontSize="10px" color="rgba(255,255,255,0.2)" fontWeight="700" letterSpacing="0.1em">
              MANAGEMENT
            </Text>
          </Box>
          <NavItem icon={FiPackage} label="Product Catalog" to="/products" active={location.pathname === "/products"} />
          <NavItem icon={FiAlertCircle} label="Escalations" to="/escalations" active={location.pathname === "/escalations"} />
          <NavItem icon={FiUsers} label="Customers" to="/customers" active={location.pathname === "/customers"} />
        </VStack>

        <Spacer />

        <Box w="full" px="6" pb="4">
          <Divider borderColor="rgba(255,255,255,0.1)" mb="4" />
          <HStack spacing="3">
            <Avatar size="sm" name="Admin User" bg="var(--color-accent)" color="white" />
            <VStack align="start" spacing="0">
              <Text fontSize="13px" fontWeight="600" fontFamily="var(--font-sans)">Admin User</Text>
              <HStack spacing="1" cursor="pointer" color="rgba(255,255,255,0.4)" _hover={{ color: "var(--color-accent)" }} transition="0.2s">
                <Icon as={FiLogOut} fontSize="10px" />
                <Text fontSize="11px" fontFamily="var(--font-label)" textTransform="uppercase" letterSpacing="0.05em">Log out</Text>
              </HStack>
            </VStack>
          </HStack>
        </Box>
      </VStack>
    </Box>
  );
}
