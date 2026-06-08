const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// Rutas
app.use('/auth', require('./src/routes/auth'));
app.use('/subastas', require('./src/routes/subastas'));
app.use('/usuarios', require('./src/routes/usuarios'));

// Ruta de prueba para verificar que el servidor funciona
app.get('/', (req, res) => {
  res.json({ mensaje: 'Bidly API funcionando' });
});

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ codigo: 404, mensaje: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

const { iniciarMotor } = require('./src/motorSubastas');

// Iniciar motor de subastas
iniciarMotor();