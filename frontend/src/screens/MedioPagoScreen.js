import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator
} from 'react-native';
import { usuarioService } from '../services/api';

const TIPOS = ['Tarjeta de crédito', 'Tarjeta de débito', 'Cuenta bancaria', 'Cheque certificado'];
const PAISES = [
  'Argentina', 'Brasil', 'Chile', 'Uruguay', 'Paraguay',
  'Bolivia', 'Perú', 'Colombia', 'Venezuela', 'México',
  'España', 'Estados Unidos', 
];

export default function MedioPagoScreen({ navigation }) {
  const [tipo, setTipo] = useState('Tarjeta de crédito');
  const [mostrarTipos, setMostrarTipos] = useState(false);
  const [cargando, setCargando] = useState(false);

  // Campos tarjeta
  const [titular, setTitular] = useState('');
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [cvv, setCvv] = useState('');
  const [moneda, setMoneda] = useState('ARS');

  const [mostrarMoneda, setMostrarMoneda] = useState(false);

  // Campos cuenta bancaria
  const [nombreBanco, setNombreBanco] = useState('');
  const [paisBanco, setPaisBanco] = useState('');

  const [mostrarPaises, setMostrarPaises] = useState(false);

  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [montoReservado, setMontoReservado] = useState('');

  // Campos cheque
  const [numeroCheque, setNumeroCheque] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [montoCheque, setMontoCheque] = useState('');
  const [bancoEmisor, setBancoEmisor] = useState('');

  const resetCampos = () => {
    setTitular(''); setNumeroTarjeta(''); setVencimiento(''); setCvv('');
    setNombreBanco(''); setPaisBanco(''); setNumeroCuenta(''); setMontoReservado('');
    setNumeroCheque(''); setFechaEmision(''); setMontoCheque(''); setBancoEmisor('');
  };

  const handleGuardar = async (navegar = true) => {
    console.log('handleGuardar llamado, navegar:', navegar);
    // Validar campos según tipo
    let camposValidos = true;

    if (tipo === 'Tarjeta de crédito' || tipo === 'Tarjeta de débito') {
      if (!titular || !numeroTarjeta || numeroTarjeta.length < 16 || !vencimiento || !cvv || cvv.length < 3) {
        camposValidos = false;
      }
    }
    if (tipo === 'Cuenta bancaria') {
      if (!titular || !nombreBanco || !numeroCuenta || !montoReservado) {
        camposValidos = false;
      }
    }
    if (tipo === 'Cheque certificado') {
      if (!titular || !bancoEmisor || !numeroCheque || !fechaEmision || !montoCheque) {
        camposValidos = false;
      }
    }

    if (!camposValidos) {
        
        console.log('Campos inválidos - tipo:', tipo, 'titular:', titular, 'numeroTarjeta:', numeroTarjeta);
      Alert.alert('Campos incompletos', 'Por favor completá todos los campos requeridos');
      return;
    }
    console.log('Campos válidos, enviando...');
    setCargando(true);
        
    console.log('Enviando medio de pago...');

    try {
      const tipoApi = tipo === 'Tarjeta de crédito' ? 'tarjeta_credito'
                    : tipo === 'Tarjeta de débito' ? 'tarjeta_debito'
                    : tipo === 'Cuenta bancaria' ? 'cuenta_bancaria'
                    : 'cheque_certificado';

      const resultado = await usuarioService.agregarMedioPago({
        tipo: tipoApi,
        titular,
        moneda,
        numeroTarjeta,
        vencimiento,
        cvv,
        nombreBanco,
        paisBanco,
        numeroCuenta,
        montoReservado: montoReservado ? parseFloat(montoReservado) : undefined,
        numeroCheque,
        fechaEmision,
        montoCheque: montoCheque ? parseFloat(montoCheque) : undefined,
        bancoEmisor,
      });
      console.log('Medio de pago guardado:', resultado.data);

             

      if (navegar) {
        navigation.replace('Home');
      } else {
        resetCampos();
        setTipo('Tarjeta de crédito');
      }
      
    } catch (error) {
      console.log('Error medio de pago:', error.message, error.response?.status, error.response?.data);
      const codigo = error.response?.status;
      if (codigo === 400) {
        Alert.alert('Error', 'Datos inválidos o incompletos');
      } else if (codigo === 401) {
        Alert.alert('Sesión expirada', 'Por favor volvé a iniciar sesión');
        navigation.replace('Login');
      } else {
        Alert.alert('Error', 'No se pudo agregar el medio de pago');
      }
    } finally {
      setCargando(false);
    }
  };

   

  const renderSelectorMoneda = () => (
    <>
      <Text style={styles.label}>Moneda Legal</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setMostrarMoneda(!mostrarMoneda)}
      >
        <Text style={styles.selectorTexto}>
          {moneda === 'ARS' ? 'ARS - Pesos' : 'USD - Dólares'}
        </Text>
        <Text style={styles.selectorFlecha}>▼</Text>
      </TouchableOpacity>
      {mostrarMoneda && (
        <View style={styles.dropdown}>
          {['ARS - Pesos', 'USD - Dólares'].map((m) => (
            <TouchableOpacity
              key={m}
              style={styles.dropdownItem}
              onPress={() => {
                setMoneda(m.startsWith('ARS') ? 'ARS' : 'USD');
                setMostrarMoneda(false);
              }}
            >
              <Text style={styles.dropdownTexto}>{m}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  const renderSelectorPais = () => (
    <>
      <Text style={styles.label}>País del Banco</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setMostrarPaises(!mostrarPaises)}
      >
        <Text style={paisBanco ? styles.selectorTexto : styles.selectorPlaceholder}>
          {paisBanco || 'Seleccionar país'}
        </Text>
        <Text style={styles.selectorFlecha}>▼</Text>
      </TouchableOpacity>
      {mostrarPaises && (
        <View style={styles.dropdown}>
          {PAISES.map((p) => (
            <TouchableOpacity
              key={p}
              style={styles.dropdownItem}
              onPress={() => { setPaisBanco(p); setMostrarPaises(false); }}
            >
              <Text style={styles.dropdownTexto}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </>
  );

  const renderCamposTarjeta = () => (
    <>
      <Text style={styles.label}>Número de Tarjeta</Text>
      <TextInput style={styles.input} placeholder="**** **** **** 1234"
        placeholderTextColor="#aaa" value={numeroTarjeta} onChangeText={setNumeroTarjeta}
        keyboardType="numeric" maxLength={16} />

      <Text style={styles.label}>Nombre del Titular</Text>
      <TextInput style={styles.input} placeholder="J MARTINEZ"
        placeholderTextColor="#aaa" value={titular} onChangeText={setTitular}
        autoCapitalize="characters" />

      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.label}>Vencimiento</Text>
          <TextInput style={styles.input} placeholder="08/30"
            placeholderTextColor="#aaa" value={vencimiento} onChangeText={setVencimiento}
            maxLength={5} />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.label}>CVV</Text>
          <TextInput style={styles.input} placeholder="***"
            placeholderTextColor="#aaa" value={cvv} onChangeText={setCvv}
            keyboardType="numeric" maxLength={4} secureTextEntry />
        </View>
      </View>

      {renderSelectorMoneda()}

      <View style={styles.notaBox}>
        <Text style={styles.notaTexto}>✓ La verificación se realiza antes del inicio de la subasta</Text>
      </View>
    </>
  );

  const renderCamposCuenta = () => (
    <>
      {renderSelectorPais()}

      <Text style={styles.label}>Nombre del Banco</Text>
      <TextInput style={styles.input} placeholder="Banco Galicia"
        placeholderTextColor="#aaa" value={nombreBanco} onChangeText={setNombreBanco} />

      <Text style={styles.label}>Número de Cuenta</Text>
      <TextInput style={styles.input} placeholder="**************** 123"
        placeholderTextColor="#aaa" value={numeroCuenta} onChangeText={setNumeroCuenta}
        keyboardType="numeric" />

      <Text style={styles.label}>Nombre del Titular</Text>
      <TextInput style={styles.input} placeholder="J MARTINEZ"
        placeholderTextColor="#aaa" value={titular} onChangeText={setTitular}
        autoCapitalize="characters" />

      {renderSelectorMoneda()}

      <Text style={styles.label}>Monto reservado para la subasta</Text>
      <TextInput style={styles.input} placeholder="4.500.000"
        placeholderTextColor="#aaa" value={montoReservado} onChangeText={setMontoReservado}
        keyboardType="numeric" />

      <View style={styles.notaBox}>
        <Text style={styles.notaTexto}>✓ La verificación se realiza antes del inicio de la subasta</Text>
      </View>
    </>
  );

  const renderCamposCheque = () => (
    <>
      {renderSelectorPais()}

      <Text style={styles.label}>Banco Emisor</Text>
      <TextInput style={styles.input} placeholder="Banco Galicia"
        placeholderTextColor="#aaa" value={bancoEmisor} onChangeText={setBancoEmisor} />

      <Text style={styles.label}>Número de Cheque</Text>
      <TextInput style={styles.input} placeholder="********"
        placeholderTextColor="#aaa" value={numeroCheque} onChangeText={setNumeroCheque}
        keyboardType="numeric" secureTextEntry />

      <Text style={styles.label}>Fecha de Emisión</Text>
      <TextInput style={styles.input} placeholder="DD/MM/AAAA"
        placeholderTextColor="#aaa" value={fechaEmision} onChangeText={setFechaEmision} />

      <Text style={styles.label}>Nombre del Titular</Text>
      <TextInput style={styles.input} placeholder="J MARTINEZ"
        placeholderTextColor="#aaa" value={titular} onChangeText={setTitular}
        autoCapitalize="characters" />

      {renderSelectorMoneda()}

      <Text style={styles.label}>Monto del Cheque</Text>
      <TextInput style={styles.input} placeholder="1.000.000"
        placeholderTextColor="#aaa" value={montoCheque} onChangeText={setMontoCheque}
        keyboardType="numeric" />

      <View style={styles.notaBox}>
        <Text style={styles.notaTexto}>✓ La verificación se realiza antes del inicio de la subasta</Text>
      </View>
    </>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>

      {/* Selector de tipo */}
      <Text style={styles.label}>Tipo de medio de pago</Text>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setMostrarTipos(!mostrarTipos)}
      >
        <Text style={styles.selectorTexto}>{tipo}</Text>
        <Text style={styles.selectorFlecha}>▼</Text>
      </TouchableOpacity>

      {mostrarTipos && (
        <View style={styles.dropdown}>
          {TIPOS.map((t) => (
            <TouchableOpacity
              key={t}
              style={styles.dropdownItem}
              onPress={() => {
                setTipo(t);
                setMostrarTipos(false);
                resetCampos();
              }}
            >
              <Text style={styles.dropdownTexto}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Separador */}
      <View style={styles.separador} />

      {/* Campos según tipo */}
      {(tipo === 'Tarjeta de crédito' || tipo === 'Tarjeta de débito') && renderCamposTarjeta()}
      {tipo === 'Cuenta bancaria' && renderCamposCuenta()}
      {tipo === 'Cheque certificado' && renderCamposCheque()}

      {/* Botón guardar */}
      <TouchableOpacity
        style={[styles.boton, cargando && styles.botonDeshabilitado]}
        onPress={() => handleGuardar(true)}
        disabled={cargando}
      >
        {cargando
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.botonTexto}>FINALIZAR</Text>
        }
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botonAgregar}
        onPress={() => handleGuardar(false)}
        disabled={cargando}
      >
        <Text style={styles.botonAgregarTexto}>+ AGREGAR OTRO</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E0E0E0' },
  inner: { padding: 24, paddingBottom: 40 },
  label: { fontSize: 13, color: '#1A2E4A', fontWeight: '600', marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, fontSize: 15, color: '#fff', marginBottom: 14 },
  selector: { backgroundColor: '#1A2E4A', borderRadius: 8, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  selectorTexto: { color: '#fff', fontSize: 15 },
  selectorFlecha: { color: '#C9973A', fontSize: 14 },
  dropdown: { backgroundColor: '#1A2E4A', borderRadius: 8, marginBottom: 14, overflow: 'hidden' },
  dropdownItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#2a3e5a' },
  dropdownTexto: { color: '#fff', fontSize: 15 },
  separador: { height: 1, backgroundColor: '#aaa', marginVertical: 16 },
  row: { flexDirection: 'row', gap: 12 },
  rowItem: { flex: 1 },
  monedaRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  monedaChip: { borderRadius: 8, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#1A2E4A' },
  monedaChipActivo: { backgroundColor: '#C9973A' },
  monedaTexto: { color: '#aaa', fontWeight: 'bold' },
  monedaTextoActivo: { color: '#fff' },
  notaBox: { backgroundColor: '#b8e2c2', borderRadius: 8, padding: 12, marginBottom: 14 },
  notaTexto: { color: '#2e7d32', fontSize: 12 },
  boton: { backgroundColor: '#E8593C', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 8 },
  botonDeshabilitado: { opacity: 0.6 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  botonAgregar: {
    backgroundColor: '#E8593C',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    opacity: 0.6,
  },
  botonAgregarTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectorPlaceholder: {
    color: '#fff',
    fontSize: 15,
  },
});