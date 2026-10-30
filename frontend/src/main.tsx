import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/auth'
import { ThemeProvider } from './context/ThemeContext'

// async function enableMocking() {
//   if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS === 'true') {
//     const { worker } = await import('./mocks/browser')
//     await worker.start({
//       onUnhandledRequest: 'bypass',
//       serviceWorker: { url: '/mockServiceWorker.js' },
//     });
//   }
// }

// enableMocking().then(() => {
//   createRoot(document.getElementById('root')!).render(
//     <StrictMode>
//       <AuthProvider>
//         <ThemeProvider>  
//           <App />
//         </ThemeProvider>
//       </AuthProvider>
//     </StrictMode>,
//   )
// });
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
);