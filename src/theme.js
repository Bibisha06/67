import { extendTheme } from "@chakra-ui/react";

const theme = extendTheme({
  config: {
    initialColorMode: "light",
    useSystemColorMode: false,
    disableTransitionOnChange: false,
  },
  fonts: {
    heading: '"Cormorant Garamond", serif',
    body: '"DM Sans", sans-serif',
  },
  colors: {
    // Override Chakra's blue entirely with warm tones
    blue: {
      50: "#fdf9f6",
      100: "#f0e8e0",
      200: "#e8ddd4",
      300: "#d4c4b4",
      400: "#c9a98a",
      500: "#c9a98a",
      600: "#a8875c",
      700: "#8c6b3e",
      800: "#3d2314",
      900: "#2c1a0e",
    },
    // Override teal, cyan, purple with warm neutrals
    teal: {
      50: "#fdf9f6", 100: "#f0e8e0", 200: "#e8ddd4",
      300: "#d4c4b4", 400: "#c9a98a", 500: "#c9a98a",
      600: "#a8875c", 700: "#8c6b3e", 800: "#3d2314", 900: "#2c1a0e",
    },
    cyan: {
      50: "#fdf9f6", 100: "#f0e8e0", 200: "#e8ddd4",
      300: "#d4c4b4", 400: "#c9a98a", 500: "#c9a98a",
      600: "#a8875c", 700: "#8c6b3e", 800: "#3d2314", 900: "#2c1a0e",
    },
    purple: {
      50: "#fdf9f6", 100: "#f0e8e0", 200: "#e8ddd4",
      300: "#d4c4b4", 400: "#c9a98a", 500: "#c9a98a",
      600: "#a8875c", 700: "#8c6b3e", 800: "#3d2314", 900: "#2c1a0e",
    },
    // Warm green for success states
    green: {
      50: "#f0f5f1", 100: "#d8eadc", 200: "#b8d6bf",
      300: "#96c0a1", 400: "#7aab8a", 500: "#7aab8a",
      600: "#5e8e6d", 700: "#456a50", 800: "#2e4736", 900: "#1a2e22",
    },
    // Warm red for danger
    red: {
      50: "#faf2f0", 100: "#f0d9d4", 200: "#e3b4ab",
      300: "#d48e82", 400: "#c0614a", 500: "#c0614a",
      600: "#9e4a35", 700: "#7d3525", 800: "#5c2318", 900: "#3a130c",
    },
    // Warm orange/amber for warnings
    orange: {
      50: "#fdf5ec", 100: "#f8e4cc", 200: "#f0c99a",
      300: "#e8ae68", 400: "#d4924a", 500: "#d4924a",
      600: "#b8773a", 700: "#935d2a", 800: "#6e441e", 900: "#4a2c12",
    },
  },
  styles: {
    global: {
      "html, body, #root": {
        minHeight: "100%",
        scrollBehavior: "smooth",
        colorScheme: "light",
      },
      body: {
        bg: "#faf7f4",
        color: "#2c1a0e",
        backgroundImage: "none",
      },
      // Force all Chakra dark mode overrides to light
      "[data-theme='dark'] body, .chakra-ui-dark body": {
        bg: "#faf7f4 !important",
        color: "#2c1a0e !important",
      },
    },
  },
  components: {
    Button: {
      baseStyle: {
        borderRadius: "999px",
        fontWeight: "600",
      },
      defaultProps: {
        colorScheme: "orange",
      },
    },
    Badge: {
      defaultProps: {
        colorScheme: "orange",
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: "16px",
          boxShadow: "none",
          border: "1px solid #e8ddd4",
          background: "#ffffff",
        },
      },
    },
    Progress: {
      baseStyle: {
        filledTrack: {
          borderRadius: "full",
          bg: "#c9a98a",
        },
        track: {
          borderRadius: "full",
          bg: "#e8ddd4",
        },
      },
      defaultProps: {
        colorScheme: "orange",
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: "#2c1a0e",
      },
    },
    Checkbox: {
      defaultProps: {
        colorScheme: "orange",
      },
    },
  },
});

export default theme;
