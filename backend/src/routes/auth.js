const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../database');

const SECRET = process.env.JWT_SECRET || 'bidly_secret';

// ─── POST /auth/login ───────────────────────────────────
// La app manda email y password, el servidor verifica y devuelve un token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  // Validar que vengan los dos campos
  if (!email || !password) {
    return res.status(400).json({ codigo: 400, mensaje: 'Email y contraseña requeridos' });
  }

  try {
    const pool = await getPool();

    // Buscar el usuario por email en authUsuarios + datos de persona y cliente
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query(`
        SELECT p.identificador, p.nombre, p.estado,
               c.categoria, c.admitido,
               a.passwordHash
        FROM authUsuarios a
        INNER JOIN personas p ON p.identificador = a.personaId
        INNER JOIN clientes c ON c.identificador = p.identificador
        WHERE a.email = @email
      `);

    // Si no existe el usuario
    if (!result.recordset.length) {
      return res.status(401).json({ codigo: 401, mensaje: 'Email o contraseña incorrectos' });
    }

    const user = result.recordset[0];

    // Verificar la contraseña
    const passwordValida = bcrypt.compareSync(password, user.passwordHash);
    if (!passwordValida) {
      return res.status(401).json({ codigo: 401, mensaje: 'Email o contraseña incorrectos' });
    }

    // Verificar que la cuenta esté activa
    if (user.estado !== 'activo' || user.admitido !== 'si') {
      return res.status(403).json({ codigo: 403, mensaje: 'Cuenta no habilitada aún' });
    }

    // Generar token JWT (dura 7 días)
    const token = jwt.sign(
      { id: user.identificador, categoria: user.categoria },
      SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      usuario: {
        id: user.identificador,
        nombre: user.nombre,
        email: email,
        categoria: user.categoria,
        verificado: user.admitido === 'si'
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── POST /auth/registro/solicitud ─────────────────────
// Paso 1 del registro: el usuario manda sus datos personales
router.post('/registro/solicitud', async (req, res) => {
  const { nombre, apellido, email, paisOrigen, domicilio, declaracion } = req.body;

  // Validar campos obligatorios
  if (!nombre || !apellido || !email || !domicilio || !declaracion) {
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos obligatorios' });
  }

  try {
    const pool = await getPool();

    // Verificar si el email ya existe
    const existe = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT personaId FROM authUsuarios WHERE email = @email');

    if (existe.recordset.length) {
      return res.status(409).json({ codigo: 409, mensaje: 'Ya existe una cuenta con ese email' });
    }

    // Insertar la persona con estado inactivo (hasta que la empresa la verifique)
    const insert = await pool.request()
      .input('doc', sql.VarChar, email)
      .input('nombre', sql.VarChar, `${nombre} ${apellido}`)
      .input('dir', sql.VarChar, domicilio)
      .query(`
        INSERT INTO personas (documento, nombre, direccion, estado)
        OUTPUT INSERTED.identificador
        VALUES (@doc, @nombre, @dir, 'inactivo')
      `);

    const personaId = insert.recordset[0].identificador;

    res.status(201).json({
      mensaje: 'Solicitud enviada. Recibirás un email cuando sea aprobada.',
      solicitudId: `SOL-${personaId}`
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;