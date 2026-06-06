const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, sql } = require('../database');
const { enviarEmailSolicitudRecibida, enviarEmailAprobacion, enviarEmailRecuperacion } = require('../email');

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

    if (existe.recordset.length)
      return res.status(409).json({ codigo: 409, mensaje: 'Ya existe una cuenta con ese email. Por favor iniciá sesión.' });

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

    // Enviar email de confirmación de recepción
    await enviarEmailSolicitudRecibida(email, `${nombre} ${apellido}`);

    // Simular aprobación automática (15 segundos para pruebas)
    const TIEMPO_APROBACION = 15 * 1000; // cambiar a 60 * 1000 para 1 minuto

    setTimeout(async () => {
      try {
        const pool = await getPool();
        
        // Generar token de activación de 6 dígitos
        const tokenActivacion = Math.floor(100000 + Math.random() * 900000).toString();
        const expiracion = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

        // Activar persona y asignar categoría
        await pool.request()
          .input('id', sql.Int, personaId)
          .query(`UPDATE personas SET estado = 'activo' WHERE identificador = @id`);

        // Simular verificación externa — asigna categoría según criterio aleatorio
        const categorias = ['comun', 'comun', 'comun', 'especial', 'especial', 'plata', 'oro', 'platino']; // comun tiene más probabilidad para simular realismo];
        // comun tiene más probabilidad para simular realismo
        const categoriaAsignada = categorias[Math.floor(Math.random() * categorias.length)];

        await pool.request()
          .input('id', sql.Int, personaId)
          .input('cat', sql.VarChar, categoriaAsignada)
          .query(`
            INSERT INTO clientes (identificador, admitido, categoria, verificador)
            VALUES (@id, 'si', @cat, 1)
          `);

        console.log(`📋 Categoría asignada a ${email}: ${categoriaAsignada}`);

        // Insertar en authUsuarios con el token
        await pool.request()
          .input('id', sql.Int, personaId)
          .input('email', sql.VarChar, email)
          .input('token', sql.VarChar, tokenActivacion)
          .input('exp', sql.DateTime, expiracion)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM authUsuarios WHERE personaId = @id)
              INSERT INTO authUsuarios (personaId, email, passwordHash, tokenReg, tokenExp)
              VALUES (@id, @email, '', @token, @exp)
            ELSE
              UPDATE authUsuarios 
              SET tokenReg = @token, tokenExp = @exp
              WHERE personaId = @id
          `);

        console.log(`✅ Token guardado para ${email}: ${tokenActivacion}`);

        // Enviar email de aprobación con el token
        await enviarEmailAprobacion(email, `${nombre} ${apellido}`, categoriaAsignada, tokenActivacion);

        console.log(`✅ Usuario ${email} aprobado automáticamente`);
      } catch (err) {
        console.error('Error en aprobación automática:', err);
      }
    }, TIEMPO_APROBACION);

    res.status(201).json({
      mensaje: 'Solicitud enviada. Recibirás un email cuando sea aprobada.',
      solicitudId: `SOL-${personaId}`
    });

  

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /auth/registro/verificar-codigo
router.post('/registro/verificar-codigo', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ codigo: 400, mensaje: 'Token requerido' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('token', sql.VarChar, token)
      .query(`
        SELECT a.personaId, a.tokenExp, c.categoria
        FROM authUsuarios a
        INNER JOIN clientes c ON c.identificador = a.personaId
        WHERE a.tokenReg = @token
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Código incorrecto' });

    const reg = result.recordset[0];
    if (new Date() > new Date(reg.tokenExp))
      return res.status(410).json({ codigo: 410, mensaje: 'Código expirado' });

    res.json({ categoria: reg.categoria });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// POST /auth/registro/completar
router.post('/registro/completar', async (req, res) => {
  const { token, password, passwordConfirm } = req.body;

  console.log('Completar registro - token recibido:', token);

  if (!token || !password || !passwordConfirm)
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos' });

  if (password !== passwordConfirm)
    return res.status(400).json({ codigo: 400, mensaje: 'Las contraseñas no coinciden' });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('token', sql.VarChar, token)
      .query(`
        SELECT personaId, tokenExp 
        FROM authUsuarios 
        WHERE tokenReg = @token
      `);

    console.log('Resultado búsqueda:', result.recordset);

    if (!result.recordset.length) {
      console.log('No encontró el token - devolviendo 404');
      return res.status(404).json({ codigo: 404, mensaje: 'Código incorrecto' });
    }

    const reg = result.recordset[0];
    console.log('tokenExp:', reg.tokenExp, 'Ahora:', new Date());
    
    if (new Date() > new Date(reg.tokenExp)) {
      console.log('Token expirado');
      return res.status(410).json({ codigo: 410, mensaje: 'Código expirado' });
    }
    const hash = bcrypt.hashSync(password, 10);

    await pool.request()
      .input('hash', sql.VarChar, hash)
      .input('id', sql.Int, reg.personaId)
      .query(`
        UPDATE authUsuarios 
        SET passwordHash = @hash, tokenReg = NULL, tokenExp = NULL
        WHERE personaId = @id
      `);

    // Obtener email para devolver al frontend
    const emailRes = await pool.request()
      .input('id', sql.Int, reg.personaId)
      .query('SELECT email FROM authUsuarios WHERE personaId = @id');

    res.json({ 
      mensaje: 'Registro completado exitosamente',
      email: emailRes.recordset[0].email
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// POST /auth/password/recuperar
router.post('/password/recuperar', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ codigo: 400, mensaje: 'Email requerido' });

  try {
    const pool = await getPool();

    // Verificar que el email existe
    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .query('SELECT personaId FROM authUsuarios WHERE email = @email');

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'No existe una cuenta con ese email' });

    // Generar código de 6 dígitos
    const codigo = Math.floor(100000 + Math.random() * 900000).toString();
    const expiracion = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

    // Guardar código en la base
    await pool.request()
      .input('email', sql.VarChar, email)
      .input('codigo', sql.VarChar, codigo)
      .input('exp', sql.DateTime, expiracion)
      .query(`
        UPDATE authUsuarios 
        SET tokenReg = @codigo, tokenExp = @exp
        WHERE email = @email
      `);

    // Enviar email con el código
    await enviarEmailRecuperacion(email, codigo);

    res.json({ mensaje: 'Código enviado por email' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// POST /auth/password/verificar
router.post('/password/verificar', async (req, res) => {
  const { email, codigo, nuevaPassword, confirmarPassword } = req.body;

  if (!email || !codigo || !nuevaPassword || !confirmarPassword)
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos' });

  if (nuevaPassword !== confirmarPassword)
    return res.status(400).json({ codigo: 400, mensaje: 'Las contraseñas no coinciden' });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('codigo', sql.VarChar, codigo)
      .query(`
        SELECT personaId, tokenExp 
        FROM authUsuarios 
        WHERE email = @email AND tokenReg = @codigo
      `);

    if (!result.recordset.length)
      return res.status(400).json({ codigo: 400, mensaje: 'Código incorrecto' });

    if (new Date() > new Date(result.recordset[0].tokenExp))
      return res.status(410).json({ codigo: 410, mensaje: 'Código expirado' });

    const hash = bcrypt.hashSync(nuevaPassword, 10);

    await pool.request()
      .input('email', sql.VarChar, email)
      .input('hash', sql.VarChar, hash)
      .query(`
        UPDATE authUsuarios 
        SET passwordHash = @hash, tokenReg = NULL, tokenExp = NULL
        WHERE email = @email
      `);

    res.json({ mensaje: 'Contraseña actualizada con éxito' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// POST /auth/password/verificar-codigo
// Solo verifica si el código es válido sin cambiar la contraseña
router.post('/password/verificar-codigo', async (req, res) => {
  const { email, codigo } = req.body;

  if (!email || !codigo)
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos' });

  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('email', sql.VarChar, email)
      .input('codigo', sql.VarChar, codigo)
      .query(`
        SELECT personaId, tokenExp 
        FROM authUsuarios 
        WHERE email = @email AND tokenReg = @codigo
      `);

    if (!result.recordset.length)
      return res.status(400).json({ codigo: 400, mensaje: 'Código incorrecto' });

    if (new Date() > new Date(result.recordset[0].tokenExp))
      return res.status(410).json({ codigo: 410, mensaje: 'Código expirado' });

    res.json({ mensaje: 'Código válido' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

module.exports = router;