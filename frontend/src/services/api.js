import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IP de tu computadora donde corre el backend
// 10.0.2.2 es la IP especial para conectar el emulador Android a localhost

const BASE_URL = 'http://localhost:3000';
//const BASE_URL = 'http://10.0.2.2:3000';

const api = axios.create({ baseURL: BASE_URL });

// Esto agrega el token automáticamente a cada request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ───────────────────────────────────────────────
export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),

  registro: (datos) =>
    api.post('/auth/registro/solicitud', datos),

  verificarCodigo: (token) => //codigo de primer registro
    api.post('/auth/registro/verificar-codigo', { token }),

  completarRegistro: (token, password, passwordConfirm) =>
    api.post('/auth/registro/completar', { token, password, passwordConfirm }),
  recuperarPassword: (email) =>
    api.post('/auth/password/recuperar', { email }),

  verificarCodigo2: (email, codigo, nuevaPassword, confirmarPassword) =>
    api.post('/auth/password/verificar', { email, codigo, nuevaPassword, confirmarPassword }),
  
  verificarCodigoRecuperacion: (email, codigo) => //verificacion de código para recuperar contraseña
    api.post('/auth/password/verificar-codigo', { email, codigo }),
};

// ─── Subastas ───────────────────────────────────────────
export const subastasService = {
  listar: () => 
    api.get('/subastas'),
  
  catalogo: (subastaId) => 
    api.get(`/subastas/${subastaId}/catalogo`),
  
  itemDetalle: (subastaId, itemId) => 
    api.get(`/subastas/${subastaId}/catalogo/${itemId}`),
  
  pujar: (subastaId, itemId, monto, medioId) =>
    api.post(`/subastas/${subastaId}/catalogo/${itemId}/pujas`, { monto, medioId }),

  historial: (subastaId) =>
    api.get(`/subastas/${subastaId}/historial`),
};

// ─── Usuarios ───────────────────────────────────────────
export const usuarioService = {
  perfil: () => 
    api.get('/usuarios/me'),
  
  verificacion: () => 
    api.get('/usuarios/me/verificacion'),

  agregarMedioPago: (datos) =>
    api.post('/usuarios/me/medios-pago', datos),
};