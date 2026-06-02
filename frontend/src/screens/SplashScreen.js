import React, { useEffect, useRef } from 'react';
import {
  View, Text, Image, StyleSheet, Animated, Dimensions
} from 'react-native';

const { width } = Dimensions.get('window');

export default function SplashScreen({ navigation }) {
  const barraAncho = useRef(new Animated.Value(0)).current;
  const opacidad = useRef(new Animated.Value(0)).current;

  useEffect(() => {
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
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.contenido, { opacity: opacidad }]}>

        {/* Título */}
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
    fontSize: 48,
    fontWeight: 'bold',
    color: '#1A2E4A',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  logo: {
    width: 220,
    height: 220,
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