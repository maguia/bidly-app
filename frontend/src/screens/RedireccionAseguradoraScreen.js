import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function RedireccionAseguradoraScreen({ route, navigation }) {
  const { compania } = route.params;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.volver}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Saliendo de Bidly</Text>
      </View>

      <View style={styles.videoBox}>
        <View style={styles.videoSimulado}>
          <Text style={styles.videoIcono}>🔒</Text>
          <Text style={styles.videoCargando}>Redirigiendo a {compania}...</Text>
          <View style={styles.videoLoader}>
            <View style={styles.videoLoaderBarra} />
          </View>
          <Text style={styles.videoNota}>Conexión segura</Text>
        </View>
      </View>

      

      <View style={styles.bottomBox}>
        <TouchableOpacity style={styles.boton} onPress={() => navigation.goBack()}>
          <Text style={styles.botonTexto}>VOLVER A BIDLY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A2E4A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 16, gap: 10 },
  volver: { color: '#C9973A', fontSize: 25, fontWeight: 'bold' },
  headerTitulo: { color: '#fff', fontSize: 18, fontWeight: 'bold', flex: 1 },
  videoBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  videoSimulado: { backgroundColor: '#000', width: '100%', aspectRatio: 16/9, borderRadius: 10, justifyContent: 'center', alignItems: 'center', gap: 12 },
  videoIcono: { fontSize: 48 },
  videoCargando: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },
  videoLoader: { width: 200, height: 3, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
  videoLoaderBarra: { width: '60%', height: 3, backgroundColor: '#C9973A', borderRadius: 2 },
  videoNota: { color: '#aaa', fontSize: 12 },
  infoBox: { backgroundColor: '#2a3e5a', padding: 16, marginHorizontal: 20, borderRadius: 10, marginBottom: 16, gap: 6 },
  infoTitulo: { color: '#C9973A', fontSize: 14, fontWeight: 'bold' },
  infoTexto: { color: '#fff', fontSize: 13, lineHeight: 18 },
  bottomBox: { padding: 20, paddingBottom: 40 },
  boton: { backgroundColor: '#E8593C', borderRadius: 8, padding: 16, alignItems: 'center' },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});