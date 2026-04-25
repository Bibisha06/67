import { Box, Flex } from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import TopBar from "../components/TopBar";

const MotionBox = motion(Box);

export default function DashboardLayout() {
  const location = useLocation();

  return (
    <Flex minH="100vh" bg="var(--bg-main)">
      <Sidebar />
      <Box
        flex="1"
        ml={{ base: 0, md: "260px" }}
        transition="margin-left 0.3s"
        display="flex"
        flexDirection="column"
        bg="var(--bg-main)"
      >
        <TopBar />
        <Box px={{ base: 4, md: 8 }} py="8" overflowY="auto" flex="1">
          <AnimatePresence mode="wait" initial={false}>
            <MotionBox
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <Outlet />
            </MotionBox>
          </AnimatePresence>
        </Box>
      </Box>
    </Flex>
  );
}
