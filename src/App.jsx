import { BrowserRouter, Routes, Route } from 'react-router'
import Autenticacion from './Auth/Autenticacion'
import SeleccionRol from './pages/SeleccionRol'
import RegistroConductor from './pages/RegistroConductor'
import Home from './pages/home/Home'
import AuthCallback from './pages/callback/AuthCallback'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Autenticacion/>}/>
        <Route path='/seleccion-rol' element={<SeleccionRol/>}/>
        <Route path='/registro-conductor' element={<RegistroConductor/>}/>
        <Route path='/home' element={<Home/>}/>
        <Route path="/auth-callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App