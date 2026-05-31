const router = require('express').Router();
const { getPool, sql } = require('../database');
const authMiddleware = require('../middleware/auth');

// ─── GET /usuarios/me ───────────────────────────────────
// Devuelve el perfil del usuario logueado
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query(`
        SELECT p.identificador, p.nombre, p.direccion, p.estado,
               c.categoria, c.admitido,
               a.email
        FROM personas p
        INNER JOIN clientes c ON c.identificador = p.identificador
        LEFT JOIN authUsuarios a ON a.personaId = p.identificador
        WHERE p.identificador = @id
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ codigo: 404, mensaje: 'Usuario no encontrado' });
    }

    const u = result.recordset[0];

    res.json({
      id: u.identificador,
      nombre: u.nombre,
      email: u.email,
      categoria: u.categoria,
      verificado: u.admitido === 'si',
      domicilio: u.direccion
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
        SELECT rds.subasta, rds.importe, rds.comision,
               pr.descripcionCatalogo as nombreItem,
               sub.fecha
        FROM registroDeSubasta rds
        INNER JOIN productos pr ON pr.identificador = rds.producto
        INNER JOIN subastas sub ON sub.identificador = rds.subasta
        WHERE rds.cliente = @cli
        ORDER BY sub.fecha DESC
      `);

    res.json({
      totalSubastas: result.recordset.length,
      ganadas: result.recordset.length,
      totalOfertado: result.recordset.reduce((acc, r) => acc + r.importe, 0),
      participaciones: result.recordset.map(r => ({
        subastaId: r.subasta,
        itemNombre: r.nombreItem,
        ultimaPuja: r.importe,
        resultado: 'ganada',
        fecha: r.fecha
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;