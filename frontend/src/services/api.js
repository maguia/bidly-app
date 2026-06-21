import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';


// IP de tu computadora donde corre el backend
// 10.0.2.2 es la IP especial para conectar el emulador Android a localhost
const BASE_URL = Platform.OS === 'web' 
  ? 'http://localhost:3000'          // web
  : 'http://192.168.1.35:3000';       // celular físico — poné tu IP real


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

  listarConFiltro: (query) =>
    api.get(`/subastas?${query}`),

  estadoPuja: (subastaId, itemId, pujaId) =>
    api.get(`/subastas/${subastaId}/catalogo/${itemId}/pujas/${pujaId}/estado`),

  confirmarPuja: (subastaId, itemId, pujaId) =>
    api.post(`/subastas/${subastaId}/catalogo/${itemId}/pujas/${pujaId}/confirmar`),

  factura: (subastaId, itemId) => 
    api.get(`/subastas/${subastaId}/catalogo/${itemId}/factura`),
  
  confirmarEnvio: (subastaId, itemId, metodo) => 
    api.post(`/subastas/${subastaId}/catalogo/${itemId}/envio`, { metodo }),
};

// ─── Usuarios ───────────────────────────────────────────
export const usuarioService = {
  perfil: () => 
    api.get('/usuarios/me'),
  
  verificacion: () => 
    api.get('/usuarios/me/verificacion'),

  agregarMedioPago: (datos) =>
    api.post('/usuarios/me/medios-pago', datos),

  traerMediosPago: () => 
    api.get('/usuarios/me/medios-pago'),

  eliminarMedioPago: (id) => 
    api.delete(`/usuarios/me/medios-pago/${id}`),

  actualizarDireccion: (direccion) => 
    api.put('/usuarios/me/direccion', { direccion }),

  historial: () => 
    api.get('/usuarios/me/historial'),

  actualizarFoto: (fotoBase64) => 
    api.put('/usuarios/me/foto', { foto: fotoBase64 }),

  deuda: () => 
    api.get('/usuarios/me/deudas'),
  
  pagarDeuda: (medioId) => 
    api.post('/usuarios/me/deudas/pagar', { medioId }),

  notificaciones: () => 
    api.get('/usuarios/me/notificaciones'),
  
  marcarNotificacionLeida: (id) => 
    api.put(`/usuarios/me/notificaciones/${id}/leida`),
};

export const consignacionesService = {
  listar: () => 
    api.get('/consignaciones'),

  crear: (datos) => 
    api.post('/consignaciones', datos),

  detalle: (id) => 
    api.get(`/consignaciones/${id}`),

  confirmarEntrega: (id) => 
    api.post(`/consignaciones/${id}/confirmar-entrega`),

  inspeccion: (id) => 
    api.get(`/consignaciones/${id}/inspeccion`),

  decisionFinal: (id, aceptar, cvuCobroVenta) => 
    api.post(`/consignaciones/${id}/decision-final`, { aceptar, cvuCobroVenta }),

  seguro: (id) => 
    api.get(`/consignaciones/${id}/seguro`),
};
