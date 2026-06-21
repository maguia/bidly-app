import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { usuarioService } from '../services/api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [toast, setToast] = useState(null);
  const ultimoIdVisto = useRef(null);

  useEffect(() => {
    if (!user) {
      ultimoIdVisto.current = null;
      return;
    }

    const chequear = async () => {
    try {
        const res = await usuarioService.notificaciones();
        const lista = res.data.notificaciones || [];
        if (!lista.length) return;

        const maxId = Math.max(...lista.map(n => n.id));
        const masReciente = lista.find(n => n.id === maxId);

        if (ultimoIdVisto.current === null) {
        ultimoIdVisto.current = maxId;
        // Si es muy reciente (ej. la app se recargó justo cuando llegó), igual la mostramos
        const segundosDesde = (Date.now() - new Date(masReciente.fecha).getTime()) / 1000;
        if (segundosDesde < 20 && !masReciente.leida) {
            setToast(masReciente);
        }
        return;
        }

        if (maxId > ultimoIdVisto.current) {
        setToast(masReciente);
        ultimoIdVisto.current = maxId;
        }
    } catch (error) {
        console.log('Error chequeando notificaciones:', error);
    }
    };

    chequear();
    const intervalo = setInterval(chequear, 10000);
    return () => clearInterval(intervalo);
  }, [user]);

  return (
    <NotificationContext.Provider value={{ toast, cerrarToast: () => setToast(null) }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationToast() {
  return useContext(NotificationContext);
}