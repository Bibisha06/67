import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, ColorModeScript } from '@chakra-ui/react'
import App from './App.jsx'
import theme from './theme.js'
import './index.css'

// Clear any stale dark mode stored from previous sessions
if (typeof window !== 'undefined') {
  localStorage.removeItem('chakra-ui-color-mode');
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.classList.remove('chakra-ui-dark');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode="light" />
      <App />
    </ChakraProvider>
  </React.StrictMode>,
)
