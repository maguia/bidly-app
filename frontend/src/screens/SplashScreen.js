import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Dimensions
} from 'react-native';
import { useFonts, Unbounded_700Bold } from '@expo-google-fonts/unbounded';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const barraAncho = useRef(new Animated.Value(0)).current;
  const opacidad = useRef(new Animated.Value(0)).current;
  
  const [fontsLoaded] = useFonts({
    Unbounded_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;

    // Fade in del contenido
    Animated.timing(opacidad, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Animación de la barra de carga
    Animated.timing(barraAncho, {
      toValue: width * 0.4,
      duration: 2500,
      useNativeDriver: false,
    }).start();

    // Navegar al Login después de 3 segundos
    const timer = setTimeout(() => {
      navigation.replace('Login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [fontsLoaded]);

  // Mientras carga la fuente no muestra nada
  if (!fontsLoaded) return null;

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contenido, { opacity: opacidad }]}>

        {/* Título con tipografía Unbounded */}
        <Text style={styles.titulo}>Bidly</Text>

        {/* Logo */}
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Barra de carga */}
        <View style={styles.barraContainer}>
          <Animated.View style={[styles.barra, { width: barraAncho }]} />
        </View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contenido: {
    alignItems: 'center',
  },
  titulo: {
    fontSize: 65,
    fontFamily: 'Unbounded_700Bold',
    color: '#1A2E4A',
    marginBottom: 30,
  },
  logo: {
    width: 350,
    height: 350,
    marginBottom: 60,
  },
  barraContainer: {
    width: width * 0.4,
    height: 4,
    backgroundColor: '#ccc',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barra: {
    height: 4,
    backgroundColor: '#C9973A',
    borderRadius: 2,
  },
});