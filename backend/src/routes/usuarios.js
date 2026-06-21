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
    const { usuarioEsValido } = require('../categorias');

    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT c.admitido FROM clientes c WHERE c.identificador = @id`);

    const razones = [];
    if (!result.recordset.length || result.recordset[0].admitido !== 'si') {
      razones.push('Usuario no verificado por la empresa');
    }

    const validezFinanciera = await usuarioEsValido(req.user.id);
    razones.push(...validezFinanciera.razones);

    res.json({ valido: razones.length === 0, razones });

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

// GET /usuarios/me/deudas
router.get('/me/deudas', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT TOP 1 d.identificador, d.subasta, d.itemId, d.montoOriginal, d.multa, d.total, d.fechaLimite,
               pr.descripcionCatalogo as nombreItem,
               s.moneda
        FROM deudas d
        INNER JOIN itemsCatalogo ic ON ic.identificador = d.itemId
        INNER JOIN productos pr ON pr.identificador = ic.producto
        INNER JOIN subastas s ON s.identificador = d.subasta
        WHERE d.cliente = @id AND d.estado = 'pendiente'
        ORDER BY d.fechaCreacion DESC
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'No tenés deudas pendientes' });

    const d = result.recordset[0];
    res.json({
      deuda: {
        id: d.identificador,
        subastaId: d.subasta,
        itemId: d.itemId,
        nombreItem: d.nombreItem,
        ofertaOriginal: d.montoOriginal,
        multa: d.multa,
        total: d.total,
        fechaLimite: d.fechaLimite,
        moneda: d.moneda
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /usuarios/me/deudas/pagar
router.post('/me/deudas/pagar', authMiddleware, async (req, res) => {
  const { medioId } = req.body;
  if (!medioId)
    return res.status(400).json({ codigo: 400, mensaje: 'Falta el medio de pago' });

  try {
    const pool = await getPool();

    const deudaRes = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`SELECT TOP 1 * FROM deudas WHERE cliente = @id AND estado = 'pendiente' ORDER BY fechaCreacion DESC`);

    if (!deudaRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'No tenés deudas pendientes' });

    const deuda = deudaRes.recordset[0];

    const medioRes = await pool.request()
      .input('medioId', sql.VarChar, medioId)
      .input('uid', sql.Int, req.user.id)
      .query('SELECT * FROM mediosPago WHERE id = @medioId AND usuarioId = @uid');

    if (!medioRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Medio de pago no encontrado' });

    const medio = medioRes.recordset[0];

    if (medio.limiteDisponible < deuda.total) {
      return res.status(402).json({
        codigo: 402,
        mensaje: `Fondos insuficientes. Disponible: $${medio.limiteDisponible.toLocaleString('es-AR')}`
      });
    }

    await pool.request()
      .input('medioId', sql.VarChar, medioId)
      .input('total', sql.Decimal(18,2), deuda.total)
      .query('UPDATE mediosPago SET limiteDisponible = limiteDisponible - @total WHERE id = @medioId');

    await pool.request()
      .input('id', sql.Int, deuda.identificador)
      .query(`UPDATE deudas SET estado = 'pagada' WHERE identificador = @id`);

    res.json({ mensaje: 'Pago realizado' });

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

    const verificado = Math.random() < 0.85 ? 1 : 0;

    const LIMITE_TARJETA = {
      ARS: { comun: 150000, especial: 300000, plata: 500000, oro: 750000, platino: 1000000 },
      USD: { comun: 150,    especial: 300,    plata: 500,    oro: 750,    platino: 1000 }
    };

    let limite = montoReservado || montoCheque || 0;

    if (tipo === 'tarjeta_credito' || tipo === 'tarjeta_debito') {
      const catRes = await pool.request()
        .input('id', sql.Int, req.user.id)
        .query('SELECT categoria FROM clientes WHERE identificador = @id');
      const categoria = catRes.recordset[0]?.categoria || 'comun';
      limite = LIMITE_TARJETA[moneda]?.[categoria] ?? LIMITE_TARJETA.ARS[categoria];
    }

    await pool.request()
      .input('id', sql.VarChar, medioId)
      .input('usuarioId', sql.Int, req.user.id)
      .input('tipo', sql.VarChar, tipo)
      .input('descripcion', sql.VarChar, descripcion)
      .input('moneda', sql.VarChar, moneda)
      .input('limite', sql.Decimal(18,2), limite)
      .input('verificado', sql.Bit, verificado)
      .query(`
        INSERT INTO mediosPago (id, usuarioId, tipo, descripcion, verificado, moneda, limiteDisponible)
        VALUES (@id, @usuarioId, @tipo, @descripcion, @verificado, @moneda, @limite)
      `);

    if (verificado === 0) {
      crearNotificacion(req.user.id, 'medio_rechazado',
        'Medio de pago rechazado',
        `No pudimos verificar "${descripcion}". Probá agregando otro medio de pago.`,
        { pantalla: 'Perfil' });
    }
    
    await evaluarCategoria(req.user.id);
    res.status(201).json({
      id: medioId,
      tipo,
      descripcion,
      verificado: verificado === 1,
      moneda,
      limiteDisponible: limite
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

const { crearNotificacion } = require('../notificaciones');

// GET /usuarios/me/notificaciones
router.get('/me/notificaciones', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT identificador, tipo, titulo, mensaje, leida, fechaCreacion, datos
        FROM notificaciones
        WHERE usuarioId = @id
        ORDER BY fechaCreacion DESC
      `);

    res.json({
      notificaciones: result.recordset.map(n => ({
        id: n.identificador,
        tipo: n.tipo,
        titulo: n.titulo,
        mensaje: n.mensaje,
        leida: n.leida,
        fecha: n.fechaCreacion,
        datos: n.datos ? JSON.parse(n.datos) : null
      })),
      noLeidas: result.recordset.filter(n => !n.leida).length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// PUT /usuarios/me/notificaciones/:id/leida
router.put('/me/notificaciones/:id/leida', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('usuarioId', sql.Int, req.user.id)
      .query('UPDATE notificaciones SET leida = 1 WHERE identificador = @id AND usuarioId = @usuarioId');

    res.json({ mensaje: 'Marcada como leída' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;