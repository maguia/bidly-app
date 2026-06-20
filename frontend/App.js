import 'react-native-gesture-handler';
import React from 'react';
import './web-scroll.css';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/context/AuthContext';

// Importar Pantallas
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';

import CatalogoScreen from './src/screens/CatalogoScreen';
import DetalleItemScreen from './src/screens/DetalleItemScreen';
import RecuperarPasswordScreen from './src/screens/RecuperarPasswordScreen';
import RegistroScreen from './src/screens/RegistroScreen';
import SolicitudEnviadaScreen from './src/screens/SolicitudEnviadaScreen';
import CompletarRegistroScreen from './src/screens/CompletarRegistroScreen';
import MedioPagoScreen from './src/screens/MedioPagoScreen';
import StreamingScreen from './src/screens/StreamingScreen';
import FacturaScreen from './src/screens/FacturaScreen';
import PerfilScreen from './src/screens/PerfilScreen';
import NotificacionesScreen from './src/screens/NotificacionesScreen';
import HistorialScreen from './src/screens/HistorialScreen';
import DetallePujaScreen from './src/screens/DetallePujaScreen';
import DeudasScreen from './src/screens/DeudasScreen';

// Importar el Tab Navigator (¡Solo una vez!)
import MainTabNavigator from './navigation/MainTabNavigator';

const Stack = createStackNavigator();

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen 
            name="RecuperarPassword" 
            component={RecuperarPasswordScreen}
            options={{
              headerShown: true,
              headerTitle: '',
              headerStyle: { backgroundColor: '#1A2E4A' },
              headerTintColor: '#C9973A',
           }}
          />
          <Stack.Screen
            name="Registro"
            component={RegistroScreen}
            options={{
              headerShown: true,
              headerTitle: 'Registrarse',
              headerStyle: { backgroundColor: '#1A2E4A' },
              headerTintColor: '#C9973A',
               headerRight: () => (
                <View style={{ marginRight: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>Paso 1 de 3</Text>
                </View>
              ),
            }}
          />
          <Stack.Screen
            name="SolicitudEnviada"
            component={SolicitudEnviadaScreen}
            options={{
              headerShown: true,
              headerTitle: 'Solicitud enviada',
              headerStyle: { backgroundColor: '#1A2E4A' },
              headerTintColor: '#C9973A',
            }}
          />
          <Stack.Screen
            name="CompletarRegistro"
            component={CompletarRegistroScreen}
            options={{
              headerShown: true,
              headerTitle: 'Completar registro',
              headerStyle: { backgroundColor: '#1A2E4A' },
              headerTintColor: '#C9973A',
              headerRight: () => (
                <View style={{ marginRight: 16 }}>
                  <Text style={{ color: '#fff', fontSize: 13 }}>Paso 2 de 3</Text>
                </View>
              ),
            }}
          />
          <Stack.Screen 
            name="MedioPago" 
            component={MedioPagoScreen} 
            options={{
              headerShown: true,
              headerTitle: 'Agregar medio de pago',
              headerStyle: { backgroundColor: '#1A2E4A' },
              headerTintColor: '#C9973A',
            }}
          />
          
          {/* Navegación principal con pestañas (Bottom Tabs) */}
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />
            
          
          <Stack.Screen name="Notificaciones" component={NotificacionesScreen} />

          <Stack.Screen name="Historial" component={HistorialScreen} />

           <Stack.Screen name="DetallePuja" component={DetallePujaScreen} />

          <Stack.Screen name="Deudas" component={DeudasScreen} />
          
          {/* Pantallas secundarias */}
          
          <Stack.Screen name="Catalogo" component={CatalogoScreen} />
          <Stack.Screen name="DetalleItem" component={DetalleItemScreen} />
          <Stack.Screen
            name="Streaming"
            component={StreamingScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Factura"
            component={FacturaScreen}
            options={{ headerShown: false }}
          />

        </Stack.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}