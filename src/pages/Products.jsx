import { Box, Text, Grid, Card, CardBody, Badge, VStack, HStack, Icon, Flex, Heading, Image, Input, InputGroup, InputLeftElement } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FiBox, FiSearch, FiCheckCircle, FiXCircle, FiTag } from "react-icons/fi";
import useSWR from 'swr';
import axios from 'axios';
import { useState } from "react";

const fetcher = url => axios.get(url).then(res => res.data);

const MotionBox = motion(Box);

export default function Products() {
  const { data: productsData } = useSWR('http://localhost:8001/api/products', fetcher);
  const products = productsData?.products || [];
  const [search, setSearch] = useState('');

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <Box as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} py="6">
      {/* Header Section */}
      <Box mb="10">
        <Text fontSize="32px" fontWeight="500" fontFamily="var(--font-serif)" color="var(--text-primary)" mb="1">
          Product Catalog
        </Text>
        <Text fontSize="15px" color="var(--text-secondary)" fontFamily="var(--font-sans)">
          Manage the authorized inventory available for the AI Voice Agent
        </Text>
      </Box>

      <HStack mb="10" justify="space-between" spacing="4">
        <InputGroup maxW="460px">
          <InputLeftElement pointerEvents="none">
            <FiSearch color="var(--text-secondary)" />
          </InputLeftElement>
          <Input 
            placeholder="Search catalog by name or SKU..." 
            bg="var(--bg-main)"
            border="1px solid var(--card-border)"
            _focus={{ borderColor: "var(--text-primary)", boxShadow: "none" }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </InputGroup>
        <Badge bg="var(--bg-alt-2)" color="var(--text-primary)" px="4" py="1.5" borderRadius="50px" fontSize="11px" letterSpacing="0.05em" fontFamily="var(--font-label)">
          {products.length} TOTAL ITEMS
        </Badge>
      </HStack>

      <Grid templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)", xl: "repeat(4, 1fr)" }} gap="6">
        {filteredProducts.map((product, i) => (
          <MotionBox
            key={product.id || i}
            whileHover={{ y: -8 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card h="full" bg="var(--card-bg)" border="1px solid var(--card-border)" borderRadius="20px" boxShadow="none" overflow="hidden">
              <CardBody p="0">
                <Box h="160px" bg="var(--bg-alt-1)" display="flex" alignItems="center" justifyContent="center" position="relative">
                   <Icon as={FiTag} fontSize="48px" color="var(--card-border)" />
                   {product.price > 500 && (
                     <Badge position="absolute" top="4" right="4" bg="var(--color-accent)" color="white" borderRadius="4px" px="2">PREMIUM</Badge>
                   )}
                </Box>
                <VStack p="6" align="start" spacing="4">
                  <VStack align="start" spacing="1" w="full">
                    <Flex justify="space-between" w="full" align="start">
                      <Text fontWeight="600" fontSize="17px" color="var(--text-primary)" fontFamily="var(--font-serif)" lineHeight="1.2">
                        {product.name}
                      </Text>
                      <Badge 
                        bg={product.is_available !== false ? "rgba(122,171,138,0.15)" : "rgba(192,97,74,0.15)"} 
                        color={product.is_available !== false ? "var(--color-success)" : "var(--color-danger)"} 
                        variant="subtle"
                        fontSize="10px"
                        borderRadius="4px"
                        px="2"
                      >
                        {product.is_available !== false ? "IN STOCK" : "OOS"}
                      </Badge>
                    </Flex>
                    <Text fontSize="12px" color="var(--text-secondary)" fontFamily="var(--font-sans)">SKU: {product.sku || 'N/A'}</Text>
                  </VStack>
                  
                  <Text fontSize="24px" fontWeight="500" color="var(--text-primary)" fontFamily="var(--font-serif)">
                    ${product.price?.toFixed(2)}
                  </Text>
                  
                  <HStack w="full" pt="4" borderTop="1px solid var(--card-border)" spacing="2">
                    <Icon 
                      as={product.is_available !== false ? FiCheckCircle : FiXCircle} 
                      color={product.is_available !== false ? "var(--color-success)" : "var(--card-border)"} 
                    />
                    <Text fontSize="11px" fontWeight="600" color="var(--text-secondary)" letterSpacing="0.02em" fontFamily="var(--font-label)">
                      {product.is_available !== false ? "AI AGENT AUTHORIZED" : "HIDDEN FROM AGENT"}
                    </Text>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>
          </MotionBox>
        ))}
      </Grid>
    </Box>
  );
}
