import { BrowserRouter, Routes, Route } from 'react-router'
import Autenticacion from './Auth/Autenticacion'
import Home from './pages/home/Home'
import AuthCallback from './pages/callback/AuthCallback'
function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path='/' element={<Autenticacion/>}/>
          <Route path='/home' element={<Home/>}/>
          <Route path="/auth-callback" element={<AuthCallback />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
