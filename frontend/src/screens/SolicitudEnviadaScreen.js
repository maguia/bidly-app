import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function SolicitudEnviadaScreen({ route, navigation }) {
  const { email } = route.params;
  const { logout } = useAuth();

  const handleInvitado = async () => {
    await logout();
    navigation.replace('MainTabs');
  };

  return (
    <View style={styles.container}>

      {/* Ícono reloj */}
      <Text style={styles.icono}>⏳</Text>

      {/* Título */}
      <Text style={styles.titulo}>Verificación en proceso</Text>

      {/* Descripción */}
      <Text style={styles.descripcion}>
        La empresa está revisando tus datos.{'\n'}
        Cuando sean aprobados, recibirás un email para{'\n'}
        completar tu registro y generar tu clave.
      </Text>

      {/* Email */}
      <View style={styles.emailBox}>
        <Text style={styles.emailLabel}>Revisá tu bandeja de entrada en</Text>
        <Text style={styles.emailValor}>{email}</Text>
      </View>

      {/* Nota */}
      <Text style={styles.nota}>Este proceso puede demorar algunos días hábiles</Text>

      {/* Continuar como invitado */}
      <TouchableOpacity onPress={handleInvitado}>
        <Text style={styles.invitado}>Continuar como invitado</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  icono: {
    fontSize: 80,
    marginBottom: 20,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C9973A',
    textAlign: 'center',
    marginBottom: 16,
  },
  descripcion: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  emailBox: {
    backgroundColor: '#1A2E4A',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    marginBottom: 20,
  },
  emailLabel: {
    color: '#aaa',
    fontSize: 13,
    marginBottom: 6,
  },
  emailValor: {
    color: '#C9973A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  nota: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
  },
  invitado: {
    color: '#1A2E4A',
    fontSize: 15,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});