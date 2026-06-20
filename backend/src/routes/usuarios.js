const router = require('express').Router();
const { getPool, sql } = require('../database');
const { evaluarCategoria } = require('../categorias');
const authMiddleware = require('../middleware/auth');

// ─── GET /usuarios/me ───────────────────────────────────
// Devuelve el perfil del usuario logueado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT p.identificador, p.nombre, p.direccion, p.estado, p.foto,
               c.categoria, c.admitido,
               a.email
        FROM personas p
        INNER JOIN clientes c ON c.identificador = p.identificador
        LEFT JOIN authUsuarios a ON a.personaId = p.identificador
        WHERE p.identificador = @id
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Usuario no encontrado' });

    const u = result.recordset[0];
    const fotoBase64 = u.foto ? `data:image/jpeg;base64,${u.foto.toString('base64')}` : null;

    const mediosRes = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT * FROM mediosPago WHERE usuarioId = @id');

    res.json({
      id: u.identificador,
      nombre: u.nombre,
      email: u.email,
      categoria: u.categoria,
      verificado: u.admitido === 'si',
      domicilio: u.direccion,
      foto: fotoBase64,
      mediosPago: mediosRes.recordset
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /usuarios/me/verificacion ─────────────────────
// Verifica si el usuario puede pujar
router.get('/me/verificacion', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT c.admitido
        FROM clientes c
        WHERE c.identificador = @id
      `);

    const razones = [];

    if (!result.recordset.length || result.recordset[0].admitido !== 'si') {
      razones.push('Usuario no verificado por la empresa');
    }

    res.json({
      valido: razones.length === 0,
      razones
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /usuarios/me/historial ────────────────────────
// Devuelve el historial de participaciones del usuario
router.get('/me/historial', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('cli', sql.Int, req.user.id)
      .query(`
        SELECT DISTINCT
          c.subasta as subastaId,
          ic.identificador as itemId,
          pr.descripcionCatalogo as nombreItem,
          ic.precioBase,
          (SELECT TOP 1 p2.importe FROM pujos p2 
           WHERE p2.item = ic.identificador AND p2.asistente = a.identificador 
           ORDER BY p2.identificador DESC) as miUltimaPuja,
          CASE WHEN EXISTS (
            SELECT 1 FROM pujos p3 
            WHERE p3.item = ic.identificador AND p3.asistente = a.identificador AND p3.ganador = 'si'
          ) THEN 'ganada' ELSE 'perdida' END as resultado
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        INNER JOIN itemsCatalogo ic ON ic.identificador = p.item
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE a.cliente = @cli AND ic.subastado = 'si'
        ORDER BY c.subasta DESC, ic.identificador DESC
      `);

    res.json({
      totalSubastas: new Set(result.recordset.map(r => r.subastaId)).size,
      ganadas: result.recordset.filter(r => r.resultado === 'ganada').length,
      totalOfertado: result.recordset.reduce((acc, r) => acc + (r.miUltimaPuja || 0), 0),
      participaciones: result.recordset.map(r => ({
        subastaId: r.subastaId,
        itemId: r.itemId,
        itemNombre: r.nombreItem,
        ultimaPuja: r.miUltimaPuja,
        resultado: r.resultado,
        precioBase: r.precioBase
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /usuarios/me/medios-pago
router.post('/me/medios-pago', authMiddleware, async (req, res) => {
  const { tipo, titular, moneda, numeroTarjeta, vencimiento, cvv,
          nombreBanco, paisBanco, numeroCuenta, montoReservado,
          numeroCheque, fechaEmision, montoCheque, bancoEmisor } = req.body;

  if (!tipo || !titular || !moneda)
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos obligatorios' });

  try {
    const pool = await getPool();
    const { v4: uuidv4 } = require('uuid');
    const medioId = `mp_${uuidv4().slice(0, 8)}`;

    // Descripción según tipo
    let descripcion = '';
    if (tipo === 'tarjeta_credito' || tipo === 'tarjeta_debito') {
      descripcion = `${tipo === 'tarjeta_credito' ? 'Crédito' : 'Débito'} terminada en ${numeroTarjeta?.slice(-4)}`;
    } else if (tipo === 'cuenta_bancaria') {
      descripcion = `Cta. Bancaria — ${nombreBanco}`;
    } else {
      descripcion = `Cheque certificado — $${montoCheque}`;
    }

    // Guardar en tabla mediospago (la creamos ahora)
    await pool.request()
      .input('id', sql.VarChar, medioId)
      .input('usuarioId', sql.Int, req.user.id)
      .input('tipo', sql.VarChar, tipo)
      .input('descripcion', sql.VarChar, descripcion)
      .input('moneda', sql.VarChar, moneda)
      .input('limite', sql.Decimal(18,2), montoReservado || montoCheque || 0)
      .query(`
        INSERT INTO mediosPago (id, usuarioId, tipo, descripcion, verificado, moneda, limiteDisponible)
        VALUES (@id, @usuarioId, @tipo, @descripcion, 0, @moneda, @limite)
      `);

    // Evaluar si corresponde subir de categoría
    await evaluarCategoria(req.user.id);
    res.status(201).json({
      id: medioId,
      tipo,
      descripcion,
      verificado: false,
      moneda,
      limiteDisponible: montoReservado || montoCheque || 0
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// GET /usuarios/me/medios-pago
router.get('/me/medios-pago', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT * FROM mediosPago WHERE usuarioId = @id');

    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// DELETE /usuarios/me/medios-pago/:id
router.delete('/me/medios-pago/:id', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.VarChar, req.params.id)
      .input('usuarioId', sql.Int, req.user.id)
      .query('DELETE FROM mediosPago WHERE id = @id AND usuarioId = @usuarioId');

    if (result.rowsAffected[0] === 0)
      return res.status(404).json({ codigo: 404, mensaje: 'Medio de pago no encontrado' });

    res.json({ mensaje: 'Medio de pago eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// PUT /usuarios/me/direccion
router.put('/me/direccion', authMiddleware, async (req, res) => {
  const { direccion } = req.body;
  if (!direccion)
    return res.status(400).json({ codigo: 400, mensaje: 'Falta la dirección' });

  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('direccion', sql.VarChar, direccion)
      .query('UPDATE personas SET direccion = @direccion WHERE identificador = @id');

    res.json({ mensaje: 'Dirección actualizada', direccion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// PUT /usuarios/me/foto
router.put('/me/foto', authMiddleware, async (req, res) => {
  const { foto } = req.body;
  if (!foto)
    return res.status(400).json({ codigo: 400, mensaje: 'Falta la foto' });

  try {
    const pool = await getPool();
    const base64Limpio = foto.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Limpio, 'base64');

    await pool.request()
      .input('id', sql.Int, req.user.id)
      .input('foto', sql.VarBinary(sql.MAX), buffer)
      .query('UPDATE personas SET foto = @foto WHERE identificador = @id');

    res.json({ mensaje: 'Foto de perfil actualizada', foto });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;