import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Badge,
  Input,
  InputGroup,
  InputLeftElement,
  Avatar,
  IconButton,
  Button,
  Progress,
  Icon,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import {
  FiUsers,
  FiPhoneCall,
  FiAlertCircle,
  FiClock,
  FiSearch,
  FiPlus,
  FiPhone,
  FiShoppingBag,
  FiCheckCircle,
} from "react-icons/fi";
import { Link as RouterLink } from "react-router-dom";
import useSWR from "swr";
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";

const fetcher = (url) => fetch(url).then((res) => res.json());

const MotionBox = motion(Box);

// CountUp Component
const CountUp = ({ end, duration = 1.5 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / (duration * 1000), 1);
      const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeProgress * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// --- HERO BANNER ---
function HeroBanner() {
  const bannerBg = "linear-gradient(90deg, var(--card-border) 0%, var(--bg-alt-2) 50%, var(--bg-main) 100%)";
  
  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius="20px"
      px={{ base: 6, md: 10 }}
      py={{ base: 8, md: 10 }}
      bg={bannerBg}
      border="1px solid var(--card-border)"
      mb="10"
      mt="2"
    >
      <Flex position="relative" zIndex="1" direction={{ base: "column", lg: "row" }} justify="space-between" align={{ base: "start", lg: "center" }} gap="6">
        <VStack align="start" spacing="2">
          <Text className="tracking-wide-label" fontSize="12px" color="var(--text-secondary)">
            VOICE COMMAND CENTER
          </Text>
          <Text fontSize={{ base: "36px", md: "46px" }} fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" lineHeight="1.1">
            Automative VoxNest
          </Text>
          <Text fontSize="17px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
            Real-time monitoring of your multilingual voice agent ecosystem
          </Text>
        </VStack>

        <HStack spacing="3" wrap="wrap" justify={{ base: "start", lg: "end" }}>
          {["🎙 LiveKit", "🧠 LLaMA-3.3-70b", "🗣 Sarvam TTS", "🎧 Groq Whisper"].map((tag) => (
            <Badge
              key={tag}
              px="4"
              py="1.5"
              borderRadius="50px"
              bg="var(--bg-alt-2)"
              color="var(--text-primary)"
              border="1px solid var(--card-border)"
              fontFamily="var(--font-sans)"
              textTransform="none"
              fontSize="12px"
              fontWeight="500"
            >
              {tag}
            </Badge>
          ))}
        </HStack>
      </Flex>
    </Box>
  );
}

// --- STAT CARD ---
function StatCard({ label, value, icon, colorHex, helpText, delay }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
      _hover={{ transform: "translateY(-3px)", boxShadow: "0 8px 24px rgba(60,30,10,0.06)" }}
    >
      <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderLeft={`4px solid ${colorHex}`} borderRadius="16px" boxShadow="none" transition="all 0.3s">
        <CardBody py="5" px="6">
          <Flex justify="space-between" align="center" mb="3">
            <Text className="tracking-wide-label" fontSize="10px" color="var(--text-secondary)">
              {label}
            </Text>
            <Flex w="36px" h="36px" borderRadius="10px" bg={`${colorHex}22`} color={colorHex} align="center" justify="center">
              <Icon as={icon} fontSize="16px" />
            </Flex>
          </Flex>
          <Text fontSize="32px" fontWeight="600" fontFamily="var(--font-serif)" color="var(--text-primary)" lineHeight="1">
            <CountUp end={value} />
          </Text>
          <Text fontSize="12px" color="var(--text-secondary)" mt="2" fontFamily="var(--font-sans)">
            {helpText}
          </Text>
        </CardBody>
      </Card>
    </MotionBox>
  );
}

// --- MAIN DASHBOARD COMPONENT ---
export default function Dashboard() {
  // Service Data
  const { data: health } = useSWR("http://localhost:4000/health", fetcher, { refreshInterval: 5000 });
  
  // Backend Data
  const { data: callsData } = useSWR("http://localhost:8001/api/calls", fetcher, { refreshInterval: 5000 });
  const { data: ordersData } = useSWR("http://localhost:8001/api/orders", fetcher, { refreshInterval: 10000 });
  const { data: customersData } = useSWR("http://localhost:8001/api/customers", fetcher, { refreshInterval: 15000 });
  const { data: escalationsData } = useSWR("http://localhost:8001/api/escalations", fetcher, { refreshInterval: 10000 });

  const calls = callsData?.calls || [];
  const orders = ordersData?.orders || [];
  const customers = customersData?.customers || [];
  const escalations = escalationsData?.escalations || [];

  const confirmedOrdersCount = orders.filter(o => o.status === 'confirmed').length;

  return (
    <Box py="4">
      <HeroBanner />

      {/* TOP STATS */}
      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap="6" mb="10">
        <StatCard label="ACTIVE SESSIONS" value={health?.active_sessions || 0} icon={FiPhoneCall} colorHex="var(--color-accent)" helpText="Live voice pipelines" delay={0.1} />
        <StatCard label="CONFIRMED ORDERS" value={confirmedOrdersCount} icon={FiShoppingBag} colorHex="var(--color-success)" helpText="Total voice orders" delay={0.2} />
        <StatCard label="ESCALATIONS" value={escalations.length} icon={FiAlertCircle} colorHex="var(--color-danger)" helpText="Pending human review" delay={0.3} />
        <StatCard label="TOTAL CUSTOMERS" value={customers.length} icon={FiUsers} colorHex="var(--color-accent)" helpText="Unique directory entries" delay={0.4} />
      </Grid>

      <Grid templateColumns={{ base: "1fr", lg: "65% 33%" }} gap="6" mb="10">
        {/* LEFT COLUMN: Recent Activity */}
        <GridItem>
          <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="16px" boxShadow="none" h="full">
            <CardBody p="6">
              <Flex justify="space-between" align="center" mb="6">
                <Text fontSize="27px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)">
                  Recent Conversations
                </Text>
                <Button as={RouterLink} to="/history" variant="link" color="var(--color-accent)" fontSize="15px" fontFamily="var(--font-sans)">
                  View Archive &rarr;
                </Button>
              </Flex>

              <Box overflowX="auto">
                <Box as="table" w="full" borderCollapse="collapse">
                  <Box as="thead">
                    <Box as="tr" borderBottom="1px solid var(--card-border)">
                      {["CALLER", "LANGUAGE", "DURATION", "STATUS", "ACTION"].map((heading) => (
                        <Box as="th" key={heading} textAlign="left" className="tracking-wide-label" fontSize="11px" color="var(--text-secondary)" px="4" py="3">
                          {heading}
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box as="tbody">
                    {calls.slice(0, 5).map((call, index) => (
                      <MotionBox
                        as="tr"
                        key={call.id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        _hover={{ bg: "var(--bg-alt-1)" }}
                        borderBottom="1px solid var(--card-border)"
                      >
                        <Box as="td" px="4" py="3">
                          <HStack spacing="3">
                            <Avatar size="sm" name={call.customers?.name || call.customer_name} bg="var(--color-accent)" color="white" />
                            <VStack align="start" spacing="0">
                              <Text fontSize="15px" fontWeight="600" color="var(--text-primary)">{call.customers?.name || call.customer_name || 'Inbound User'}</Text>
                              <Text fontSize="12px" color="var(--text-secondary)">{call.customers?.phone_number || call.phone_number}</Text>
                            </VStack>
                          </HStack>
                        </Box>
                        <Box as="td" px="4" py="3" color="var(--text-secondary)" fontSize="13px">
                          {call.language_used?.toUpperCase() || 'HI-IN'}
                        </Box>
                        <Box as="td" px="4" py="3" color="var(--text-secondary)" fontSize="12px">
                          {call.duration_seconds ? `${Math.floor(call.duration_seconds / 60)}:${(call.duration_seconds % 60).toString().padStart(2, "0")}` : '02:44'}
                        </Box>
                        <Box as="td" px="4" py="3">
                          <Badge
                            bg={
                              call.status === "confirmed" ? "rgba(122,171,138,0.15)" :
                              call.status === "escalated" ? "rgba(192,97,74,0.15)" : "rgba(201,169,138,0.15)"
                            }
                            color={
                              call.status === "confirmed" ? "var(--color-success)" :
                              call.status === "escalated" ? "var(--color-danger)" : "var(--color-accent)"
                            }
                            borderRadius="50px" px="3" py="1" textTransform="none" fontSize="12px" fontWeight="500"
                          >
                            {call.status}
                          </Badge>
                        </Box>
                        <Box as="td" px="4" py="3">
                           <IconButton icon={<FiSearch />} size="sm" variant="ghost" as={RouterLink} to="/history" />
                        </Box>
                      </MotionBox>
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardBody>
          </Card>
        </GridItem>

        {/* RIGHT COLUMN: Service Health */}
        <GridItem>
          <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="16px" boxShadow="none" h="full">
            <CardBody p="6">
              <Text fontSize="27px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="6">
                System Health
              </Text>

              <VStack spacing="5" align="stretch" mb="8">
                {[
                  { name: "LiveKit Realtime Node", up: true },
                  { name: "Llama-3.3-70b API", up: true },
                  { name: "Supabase Database", up: true },
                  { name: "Sarvam TTS Engine", up: true },
                ].map((service, idx) => (
                  <Flex key={idx} justify="space-between" align="center">
                    <HStack spacing="3">
                       <Box className="pulse-dot-warm" w="8px" h="8px" borderRadius="full" bg="var(--color-success)" />
                       <Text fontSize="15px" fontWeight="500" color="var(--text-primary)">{service.name}</Text>
                    </HStack>
                    <Badge colorScheme="green" variant="subtle" fontSize="9px">ONLINE</Badge>
                  </Flex>
                ))}
              </VStack>

              <Box mb="8">
                <Flex justify="space-between" mb="2">
                  <Text fontSize="12px" color="var(--text-secondary)">AI Ingestion Load</Text>
                  <Text fontSize="12px" fontWeight="600" color="var(--text-primary)">28%</Text>
                </Flex>
                <Progress value={28} size="xs" borderRadius="full" bg="var(--card-border)" sx={{ "& > div": { backgroundColor: "var(--color-accent)" } }} />
              </Box>

              <VStack spacing="3">
                <Button as={RouterLink} to="/live" w="full" bg="var(--btn-primary)" color="var(--bg-main)" borderRadius="50px" fontSize="14px" fontWeight="500" _hover={{ bg: "var(--btn-primary-hover)" }}>
                  Open Live Monitor
                </Button>
                <Button as={RouterLink} to="/escalations" w="full" variant="outline" borderColor="var(--card-border)" color="var(--text-primary)" borderRadius="50px" fontSize="14px" fontWeight="500" _hover={{ bg: "var(--bg-alt-1)" }}>
                  Manage Escalations
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* ORDERS TABLE */}
      <Box mb="10">
        <Text fontSize="27px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="4">Recent Orders</Text>
        <Card bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="16px" boxShadow="none" overflow="hidden">
           {orders.length === 0 ? (
             <VStack py="12" spacing="4" justify="center">
                <Icon as={FiShoppingBag} fontSize="32px" color="var(--card-border)" />
                <Text color="var(--text-secondary)" fontSize="14px" fontStyle="italic">No orders synchronized from voice pipeline yet.</Text>
             </VStack>
           ) : (
             <Box overflowX="auto">
                <Box as="table" w="full" borderCollapse="collapse">
                   <Box as="thead" bg="var(--bg-alt-1)">
                      <Box as="tr" borderBottom="1px solid var(--card-border)">
                        {["ORDER ID", "CUSTOMER", "TOTAL", "STATUS", "ITEMS", "DATE"].map((h) => (
                          <Box as="th" key={h} textAlign="left" className="tracking-wide-label" fontSize="11px" color="var(--text-secondary)" px="6" py="4">{h}</Box>
                        ))}
                      </Box>
                   </Box>
                   <Box as="tbody">
                      {orders.map((order, i) => (
                        <Box as="tr" key={order.id || i} borderBottom="1px solid var(--card-border)" _hover={{ bg: "var(--bg-alt-1)" }}>
                           <Box as="td" px="6" py="4" color="var(--text-primary)" fontSize="14px" fontWeight="600">#{order.id?.slice(-6).toUpperCase()}</Box>
                           <Box as="td" px="6" py="4" color="var(--text-primary)" fontSize="14px">{order.customers?.name || order.phone_number}</Box>
                           <Box as="td" px="6" py="4" color="var(--text-primary)" fontSize="14px" fontWeight="600">${order.total_amount?.toFixed(2)}</Box>
                           <Box as="td" px="6" py="4">
                              <Badge bg="rgba(122,171,138,0.15)" color="var(--color-success)" borderRadius="50px" px="3" py="0.5">{order.status}</Badge>
                           </Box>
                           <Box as="td" px="6" py="4" color="var(--text-secondary)" fontSize="13px">
                              {order.order_items?.length || 0} items detected
                           </Box>
                           <Box as="td" px="6" py="4" color="var(--text-secondary)" fontSize="12px">
                              {new Date(order.created_at).toLocaleDateString()}
                           </Box>
                        </Box>
                      ))}
                   </Box>
                </Box>
             </Box>
           )}
        </Card>
      </Box>

      {/* FAB */}
      <MotionBox
        position="fixed"
        right={{ base: "20px", md: "30px" }}
        bottom={{ base: "20px", md: "30px" }}
        zIndex="25"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
      >
        <IconButton
          aria-label="New Call"
          icon={<FiPlus />}
          bg="var(--btn-primary)"
          color="var(--bg-main)"
          size="lg"
          borderRadius="full"
          boxShadow="0 10px 20px rgba(60,30,10,0.15)"
          _hover={{ bg: "var(--btn-primary-hover)", transform: "scale(1.05)" }}
        />
      </MotionBox>
    </Box>
  );
}
