const router = require('express').Router();
const { getPool, sql } = require('../database');
const { evaluarCategoria, usuarioEsValido  } = require('../categorias');
const authMiddleware = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const { crearNotificacion } = require('../notificaciones');
const CATEGORIAS = ['comun', 'especial', 'plata', 'oro', 'platino'];

// ─── GET /subastas ──────────────────────────────────────
router.get('/', async (req, res) => {
  const { fecha } = req.query;
  try {
    const pool = await getPool();

    let nivelUser = 0;
    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'bidly_secret');
        const userRes = await pool.request()
          .input('id', sql.Int, decoded.id)
          .query('SELECT categoria FROM clientes WHERE identificador = @id');
        const userCategoria = userRes.recordset[0]?.categoria || 'comun';
        nivelUser = CATEGORIAS.indexOf(userCategoria);
      } catch {}
    }

    const request = pool.request();
    let whereClause = '';

    if (fecha) {
      request.input('fecha', sql.Date, fecha);
      whereClause = 'WHERE CAST(s.fecha AS DATE) = @fecha';
    }

    const result = await request.query(`
      SELECT s.identificador, s.fecha, s.hora, s.estado,
             s.ubicacion, s.categoria, s.moneda,
             p.nombre as martillero,
             (
               SELECT COUNT(*) 
               FROM itemsCatalogo ic
               INNER JOIN catalogos c ON c.identificador = ic.catalogo
               WHERE c.subasta = s.identificador 
               AND ic.subastado = 'no'
             ) as itemsRestantes
      FROM subastas s
      LEFT JOIN subastadores sub ON sub.identificador = s.subastador
      LEFT JOIN personas p ON p.identificador = sub.identificador
      ${whereClause}
      ORDER BY 
        CASE s.estado 
          WHEN 'abierta' THEN 0 
          ELSE 1 
        END,
        CASE 
          WHEN CAST(s.fecha AS DATE) = CAST(GETDATE() AS DATE) THEN 0
          WHEN s.fecha > GETDATE() THEN 1
          ELSE 2
        END,
        s.fecha ASC, s.hora ASC
    `);

    const subastas = result.recordset.map(s => {
      const nivelSubasta = CATEGORIAS.indexOf(s.categoria);
      const puedePujar = nivelUser >= nivelSubasta;

      return {
        id: s.identificador,
        nombre: `Subasta #${s.identificador}`,
        martillero: s.martillero,
        ubicacion: s.ubicacion,
        fecha: s.fecha ? new Date(s.fecha).toISOString().split('T')[0] : null,
        hora: s.hora,
        categoriaRequerida: s.categoria,
        moneda: s.moneda || 'ARS',
        estado: (() => {
          if (s.estado === 'cerrada') return 'finalizado';
          
          const ahora = new Date();
          const hoy = `${ahora.getFullYear()}-${String(ahora.getMonth()+1).padStart(2,'0')}-${String(ahora.getDate()).padStart(2,'0')}`;
          
          const d = new Date(s.fecha);
          const fechaSubasta = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;

          if (fechaSubasta !== hoy) {
            return fechaSubasta > hoy ? 'proximo' : 'finalizado';
          }

          // Es hoy — verificar la hora
          // Extraer hora correctamente del objeto Date
          const horaDate = new Date(s.hora);
          const horaSubasta = `${String(horaDate.getUTCHours()).padStart(2,'0')}:${String(horaDate.getUTCMinutes()).padStart(2,'0')}:00`;
          const horaActual = `${String(ahora.getUTCHours()).padStart(2,'0')}:${String(ahora.getUTCMinutes()).padStart(2,'0')}:00`;
          console.log(`Subasta ${s.identificador} — horaSubasta: ${horaSubasta}, horaActual: ${horaActual}`);

          return horaActual >= horaSubasta ? 'en_vivo' : 'proximo';
        })(),
        itemsRestantes: s.itemsRestantes,
        accesoUsuario: {
          puedePujar,
          razonBloqueo: puedePujar ? null : 'Categoría insuficiente'
        }
      };
    });

    res.json(subastas);

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /subastas/:id/catalogo ─────────────────────────
router.get('/:id/catalogo', async (req, res) => {
  try {
    const pool = await getPool();

    // Obtener el ítem con la puja más reciente
    const itemActualRes = await pool.request()
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT TOP 1 p.item as itemId
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        WHERE a.subasta = @subId
        ORDER BY p.identificador DESC
      `);

    const itemActualId = itemActualRes.recordset.length
      ? itemActualRes.recordset[0].itemId
      : null;

    const result = await pool.request()
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT ic.identificador as itemId,
              pr.descripcionCatalogo as nombre,
              ic.precioBase,
              ic.comision,
              ic.subastado,
              ic.enSubasta,
              (SELECT TOP 1 f.foto FROM fotos f WHERE f.producto = ic.producto ORDER BY f.identificador ASC) as foto
        FROM itemsCatalogo ic
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE c.subasta = @subId
      `);

    if (!result.recordset.length) {
      return res.status(404).json({ codigo: 404, mensaje: 'Subasta no encontrada o sin ítems' });
    }

    res.json(result.recordset.map(i => ({
      id: String(i.itemId),
      nombre: i.nombre,
      precioBase: i.precioBase,
      fotoPrincipal: i.foto || null,
      comision: i.comision,
      estado: i.subastado === 'si' ? 'vendido'
            : (i.enSubasta || i.itemId === itemActualId) ? 'pujando'
            : 'disponible'
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /subastas/:id/catalogo/:itemId ─────────────────
router.get('/:id/catalogo/:itemId', async (req, res) => {
  try {
    const pool = await getPool();

    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT ic.identificador as itemId,
               ic.precioBase, ic.comision, ic.subastado, ic.enSubasta,
               pr.descripcionCatalogo as nombre,
               pr.descripcionCompleta,
               per.nombre as duenio,
               (SELECT COUNT(*) FROM pujos p 
                INNER JOIN asistentes a ON a.identificador = p.asistente
                WHERE p.item = ic.identificador AND a.subasta = @subId) as tienePujas
        FROM itemsCatalogo ic
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        INNER JOIN productos pr ON pr.identificador = ic.producto
        INNER JOIN duenios d ON d.identificador = pr.duenio
        INNER JOIN personas per ON per.identificador = d.identificador
        WHERE ic.identificador = @itemId AND c.subasta = @subId
      `);

    if (!itemRes.recordset.length) {
      return res.status(404).json({ codigo: 404, mensaje: 'Ítem no encontrado' });
    }

    const item = itemRes.recordset[0];

    const pujosRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .query(`
        SELECT p.importe as monto, p.ganador,
               a.cliente as postorId
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        WHERE p.item = @itemId
        ORDER BY p.identificador DESC
      `);

    const pujos = pujosRes.recordset;

    const fotosRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .query(`
        SELECT f.foto
        FROM fotos f
        INNER JOIN itemsCatalogo ic ON ic.producto = f.producto
        WHERE ic.identificador = @itemId
        ORDER BY f.identificador ASC
      `);

    const fotos = fotosRes.recordset.map(f => f.foto).filter(u => u);

    const mejorOferta = pujos.length ? pujos[0].monto : item.precioBase;
    const rangoMin = mejorOferta + item.precioBase * 0.01;
    const rangoMax = mejorOferta + item.precioBase * 0.20;

    const subCatRes = await pool.request()
      .input('subId', sql.Int, req.params.id)
      .query('SELECT categoria FROM subastas WHERE identificador = @subId');

    const categoriaSubasta = subCatRes.recordset[0]?.categoria;
    let sinLimite = ['oro', 'platino'].includes(categoriaSubasta);
    let esRegistrado = false;

    const authHeader = req.headers.authorization;
    if (authHeader) {
      try {
        jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'bidly_secret');
        esRegistrado = true;
      } catch {}
    }

    res.json({
      id: String(item.itemId),
      nombre: item.nombre,
      descripcion: item.descripcionCompleta,
      estado: item.subastado === 'si' ? 'vendido'
            : (item.enSubasta || item.tienePujas > 0) ? 'pujando'
            : 'disponible',
      precioBase: esRegistrado ? item.precioBase : null,
      imagenes: fotos,
      duenioActual: item.duenio,
      mejorOferta: esRegistrado ? mejorOferta : null,
      rangoMinimo: sinLimite ? null : (esRegistrado ? rangoMin : null),
      rangoMaximo: sinLimite ? null : (esRegistrado ? rangoMax : null),
      sinLimitesPuja: sinLimite,
      esRegistrado,
      historialPujas: pujos.map(p => ({
        postorId: p.postorId,
        monto: p.monto,
        ganador: p.ganador === 'si'
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── POST /subastas/:id/catalogo/:itemId/pujas ──────────
router.post('/:id/catalogo/:itemId/pujas', authMiddleware, async (req, res) => {
  const { monto, medioId } = req.body;

  if (!monto || !medioId) {
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan monto o medio de pago' });
  }
  const validez = await usuarioEsValido(req.user.id);
  if (!validez.valido) {
    return res.status(403).json({ codigo: 403, mensaje: 'Usuario no habilitado para pujar', razones: validez.razones });
  }

  try {
    const pool = await getPool();
    const subastaId = parseInt(req.params.id);

    const subRes = await pool.request()
      .input('id', sql.Int, subastaId)
      .query('SELECT estado, categoria FROM subastas WHERE identificador = @id');

    if (!subRes.recordset.length || subRes.recordset[0].estado !== 'abierta') {
      return res.status(423).json({ codigo: 423, mensaje: 'Subasta no activa' });
    }

    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .input('subId', sql.Int, subastaId)
      .query(`
        SELECT ic.identificador, ic.precioBase, ic.subastado
        FROM itemsCatalogo ic
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        WHERE ic.identificador = @itemId AND c.subasta = @subId
      `);

    if (!itemRes.recordset.length) {
      return res.status(404).json({ codigo: 404, mensaje: 'Ítem no encontrado' });
    }

    const item = itemRes.recordset[0];

    if (item.subastado === 'si') {
      return res.status(423).json({ codigo: 423, mensaje: 'Ítem ya vendido' });
    }

    const ultimaRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .query(`
        SELECT TOP 1 p.importe 
        FROM pujos p
        WHERE p.item = @itemId
        ORDER BY p.identificador DESC
      `);

    const base = ultimaRes.recordset.length
      ? ultimaRes.recordset[0].importe
      : item.precioBase;

    const rangoMin = base + item.precioBase * 0.01;
    const rangoMax = base + item.precioBase * 0.20;

    const sinLimite = ['oro', 'platino'].includes(subRes.recordset[0].categoria);

    if (sinLimite) {
      if (monto <= base) {
        return res.status(400).json({
          codigo: 400,
          mensaje: 'La oferta debe superar la mejor oferta actual',
          mejorOfertaActual: base
        });
      }
    } else {
      if (monto < rangoMin || monto > rangoMax) {
        return res.status(400).json({
          codigo: 400,
          mensaje: 'Oferta fuera de rango',
          rangoMinimo: rangoMin,
          rangoMaximo: rangoMax
        });
      }
    }

    const asisCheck = await pool.request()
  .input('cli', sql.Int, req.user.id)
  .input('sub', sql.Int, subastaId)
  .query('SELECT * FROM asistentes WHERE cliente = @cli AND subasta = @sub');

if (!asisCheck.recordset.length || !asisCheck.recordset[0].limiteElegido)
  return res.status(403).json({ codigo: 403, mensaje: 'Primero tenés que elegir tu límite para esta subasta' });

const asistente = asisCheck.recordset[0];
const asisId = asistente.identificador;

const comprometidoRes = await pool.request()
  .input('asisId', sql.Int, asisId)
  .query(`
    SELECT ISNULL(SUM(ultima.importe), 0) as total
    FROM (
      SELECT p.importe,
             ROW_NUMBER() OVER (PARTITION BY p.item ORDER BY p.identificador DESC) as rn
      FROM pujos p
      WHERE p.asistente = @asisId
      AND p.item IN (SELECT ic.identificador FROM itemsCatalogo ic WHERE ic.subastado = 'no')
    ) ultima
    WHERE ultima.rn = 1
  `);

const comprometido = comprometidoRes.recordset[0].total;
const disponible = (asistente.limiteRestante || 0) - comprometido;

if (monto > disponible) {
  return res.status(402).json({
    codigo: 402,
    mensaje: `Fondos insuficientes. Disponible en esta subasta: $${disponible.toLocaleString('es-AR')}`
  });
}

if (!asisCheck.recordset.length || !asisCheck.recordset[0].limiteElegido)
  return res.status(403).json({ codigo: 403, mensaje: 'Primero tenés que elegir tu límite para esta subasta' });

const asistente = asisCheck.recordset[0];

const comprometidoRes = await pool.request()
  .input('asisId', sql.Int, asistente.identificador)
  .query(`
    SELECT ISNULL(SUM(ultima.importe), 0) as total
    FROM (
      SELECT p.importe,
             ROW_NUMBER() OVER (PARTITION BY p.item ORDER BY p.identificador DESC) as rn
      FROM pujos p
      WHERE p.asistente = @asisId
      AND p.item IN (SELECT ic.identificador FROM itemsCatalogo ic WHERE ic.subastado = 'no')
    ) ultima
    WHERE ultima.rn = 1
  `);

const comprometido = comprometidoRes.recordset[0].total;
const disponible = (asistente.limiteRestante || 0) - comprometido;

if (monto > disponible) {
  return res.status(402).json({
    codigo: 402,
    mensaje: `Fondos insuficientes. Disponible en esta subasta: $${disponible.toLocaleString('es-AR')}`
  });
}

    const pujaInsert = await pool.request()
      .input('asistente', sql.Int, asisId)
      .input('item', sql.Int, req.params.itemId)
      .input('importe', sql.Decimal(18, 2), monto)
      .input('medioId', sql.VarChar, medioId)
      .query(`
        INSERT INTO pujos (asistente, item, importe, ganador, medio_pago_id)
        OUTPUT INSERTED.identificador
        VALUES (@asistente, @item, @importe, 'no', @medioId)
      `);

    const pujaId = `PJ-${pujaInsert.recordset[0].identificador}`;
    const expira = new Date(Date.now() + 60000).toISOString();

    // Notificar al motor que hubo una puja
    const { reiniciarTimerItem } = require('../motorSubastas');
    reiniciarTimerItem(subastaId, parseInt(req.params.itemId), item.precioBase);

    await evaluarCategoria(req.user.id);

    res.json({
      pujaId,
      estado: 'esperando_confirmacion',
      expiraEn: expira
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /subastas/:id/historial ────────────────────────
router.get('/:id/historial', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const subRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT * FROM subastas WHERE identificador = @id');

    if (!subRes.recordset.length) {
      return res.status(404).json({ codigo: 404, mensaje: 'Subasta no encontrada' });
    }

    const result = await pool.request()
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT 
          ic.identificador as itemId,
          pr.descripcionCatalogo as nombreItem,
          ic.precioBase,
          p.importe as monto,
          p.ganador,
          p.identificador as pujaId,
          a.cliente as postorId
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        INNER JOIN itemsCatalogo ic ON ic.identificador = p.item
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE c.subasta = @subId
        ORDER BY ic.identificador, p.identificador ASC
      `);

    const itemsMap = {};
    result.recordset.forEach(row => {
      if (!itemsMap[row.itemId]) {
        itemsMap[row.itemId] = {
          itemId: row.itemId,
          nombreItem: row.nombreItem,
          precioBase: row.precioBase,
          pujas: []
        };
      }
      itemsMap[row.itemId].pujas.push({
        pujaId: row.pujaId,
        monto: row.monto,
        ganador: row.ganador === 'si',
        postorId: row.postorId
      });
    });

    res.json({
      subastaId: req.params.id,
      fecha: subRes.recordset[0].fecha,
      items: Object.values(itemsMap)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /subastas/:id/catalogo/:itemId/pujas/:pujaId/estado ─────
router.get('/:id/catalogo/:itemId/pujas/:pujaId/estado', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const pujaIdNum = parseInt(req.params.pujaId.replace('PJ-', ''));

    const pujaRes = await pool.request()
      .input('pujaId', sql.Int, pujaIdNum)
      .query(`
        SELECT p.*, a.cliente 
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        WHERE p.identificador = @pujaId
      `);

    if (!pujaRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Puja no encontrada' });

    const puja = pujaRes.recordset[0];

    const superadaRes = await pool.request()
      .input('item', sql.Int, req.params.itemId)
      .input('pujaId', sql.Int, pujaIdNum)
      .input('importe', sql.Decimal(18,2), puja.importe)
      .input('cliente', sql.Int, req.user.id)
      .query(`
        SELECT TOP 1 p.importe FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        WHERE p.item = @item 
        AND p.identificador > @pujaId
        AND p.importe > @importe
        AND a.cliente != @cliente
        ORDER BY p.identificador DESC
      `);

    const superada = superadaRes.recordset.length > 0;
    const ganadora = puja.ganador === 'si';

    res.json({
      estado: ganadora ? 'ganadora' : superada ? 'superada' : 'esperando_confirmacion',
      monto: puja.importe,
      superadaPor: superada ? superadaRes.recordset[0].importe : null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// ─── POST /subastas/:id/catalogo/:itemId/pujas/:pujaId/confirmar ──
router.post('/:id/catalogo/:itemId/pujas/:pujaId/confirmar', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const pujaIdNum = parseInt(req.params.pujaId.replace('PJ-', ''));
    const subastaId = parseInt(req.params.id);
    const itemId = parseInt(req.params.itemId);

    const pujaRes = await pool.request()
      .input('pujaId', sql.Int, pujaIdNum)
      .query('SELECT * FROM pujos WHERE identificador = @pujaId');

    if (!pujaRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Puja no encontrada' });

    const puja = pujaRes.recordset[0];

    const superadaRes = await pool.request()
      .input('item', sql.Int, itemId)
      .input('pujaId', sql.Int, pujaIdNum)
      .input('importe', sql.Decimal(18,2), puja.importe)
      .query(`
        SELECT TOP 1 identificador FROM pujos 
        WHERE item = @item 
        AND identificador > @pujaId
        AND importe > @importe
      `);

    if (superadaRes.recordset.length)
      return res.status(409).json({ codigo: 409, mensaje: 'La puja fue superada' });

    await pool.request()
      .input('pujaId', sql.Int, pujaIdNum)
      .query("UPDATE pujos SET ganador = 'si' WHERE identificador = @pujaId");

    await pool.request()
      .input('itemId', sql.Int, itemId)
      .query("UPDATE itemsCatalogo SET subastado = 'si', enSubasta = 0 WHERE identificador = @itemId");

    const itemRes = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ic.precioBase, ic.comision, pr.duenio, pr.identificador as productoId
        FROM itemsCatalogo ic
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE ic.identificador = @itemId
      `);

    const item = itemRes.recordset[0];

    // Total real a cobrar: oferta + comisión, como en la factura
    const totalFactura = puja.importe + item.comision;

    const medioRes = await pool.request()
      .input('medioId', sql.VarChar, puja.medio_pago_id)
      .query('SELECT * FROM mediosPago WHERE id = @medioId');

    const medio = medioRes.recordset[0];
    const fondosSuficientes = medio && medio.limiteDisponible >= totalFactura;

    const asisRes = await pool.request()
      .input('asisId', sql.Int, puja.asistente)
      .query('SELECT cliente FROM asistentes WHERE identificador = @asisId');

    const clienteId = asisRes.recordset[0].cliente;

    await pool.request()
      .input('subasta', sql.Int, subastaId)
      .input('duenio', sql.Int, item.duenio)
      .input('producto', sql.Int, item.productoId)
      .input('cliente', sql.Int, clienteId)
      .input('importe', sql.Decimal(18,2), puja.importe)
      .input('comision', sql.Decimal(18,2), item.comision)
      .input('medioPago', sql.VarChar, puja.medio_pago_id)
      .query(`
        INSERT INTO registroDeSubasta (subasta, duenio, producto, cliente, importe, comision, medioPagoId)
        VALUES (@subasta, @duenio, @producto, @cliente, @importe, @comision, @medioPago)
      `);

    crearNotificacion(item.duenio, 'venta',
      '¡Vendiste un producto!',
      `Tu producto se vendió por $${puja.importe.toLocaleString('es-AR')}.`,
      { subastaId, itemId });

    if (fondosSuficientes) {
      await pool.request()
        .input('medioId', sql.VarChar, puja.medio_pago_id)
        .input('total', sql.Decimal(18,2), totalFactura)
        .query('UPDATE mediosPago SET limiteDisponible = limiteDisponible - @total WHERE id = @medioId');
    } else {
      const multa = totalFactura * 0.10;
      await pool.request()
        .input('cliente', sql.Int, clienteId)
        .input('subasta', sql.Int, subastaId)
        .input('itemId', sql.Int, itemId)
        .input('montoOriginal', sql.Decimal(18,2), totalFactura)
        .input('multa', sql.Decimal(18,2), multa)
        .input('total', sql.Decimal(18,2), totalFactura + multa)
        .input('fechaLimite', sql.DateTime, new Date(Date.now() + 72 * 60 * 60 * 1000))
        .query(`
          INSERT INTO deudas (cliente, subasta, itemId, montoOriginal, multa, total, estado, fechaLimite)
          VALUES (@cliente, @subasta, @itemId, @montoOriginal, @multa, @total, 'pendiente', @fechaLimite)
        `);
        crearNotificacion(clienteId, 'usuario_invalido',
          'Te volviste usuario inválido',
          'Tenés una deuda pendiente por fondos insuficientes. Saldala para volver a operar con normalidad.',
          { pantalla: 'Deudas' });
    }

    const duenioExisteRes = await pool.request()
      .input('clienteId', sql.Int, clienteId)
      .query('SELECT identificador FROM duenios WHERE identificador = @clienteId');

    if (!duenioExisteRes.recordset.length) {
      await pool.request()
        .input('clienteId', sql.Int, clienteId)
        .query(`
          INSERT INTO duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
          SELECT @clienteId, numeroPais, 'si', 'si', 5, 2
          FROM clientes WHERE identificador = @clienteId
        `);
    }

    await pool.request()
      .input('clienteId', sql.Int, clienteId)
      .input('productoId', sql.Int, item.productoId)
      .query('UPDATE productos SET duenio = @clienteId WHERE identificador = @productoId');

    res.json({
      mensaje: fondosSuficientes ? 'Puja confirmada' : 'Puja confirmada, pero se generó una deuda por fondos insuficientes',
      deudaGenerada: !fondosSuficientes,
      factura: {
        pujaId: pujaIdNum,
        subastaId,
        itemId,
        clienteId,
        importe: puja.importe,
        comision: item.comision,
        total: totalFactura,
      }
    });

  } catch (err) {
    console.error('ERROR EN CONFIRMAR:', err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

// GET /subastas/:id/catalogo/:itemId/factura
router.get('/:id/catalogo/:itemId/factura', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .query('SELECT producto FROM itemsCatalogo WHERE identificador = @itemId');

    if (!itemRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Ítem no encontrado' });

    const productoId = itemRes.recordset[0].producto;

    const result = await pool.request()
      .input('subasta', sql.Int, req.params.id)
      .input('producto', sql.Int, productoId)
      .input('cliente', sql.Int, req.user.id)
      .query(`
        SELECT rds.importe, rds.comision, rds.envioMetodo, rds.envioCosto,
               pr.descripcionCatalogo as nombreItem, pr.descripcionCompleta,
               s.identificador as subastaId, s.moneda,
               per.nombre as martillero
        FROM registroDeSubasta rds
        INNER JOIN productos pr ON pr.identificador = rds.producto
        INNER JOIN subastas s ON s.identificador = rds.subasta
        LEFT JOIN subastadores sub ON sub.identificador = s.subastador
        LEFT JOIN personas per ON per.identificador = sub.identificador
        WHERE rds.subasta = @subasta AND rds.producto = @producto AND rds.cliente = @cliente
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'No se encontró una compra tuya para este ítem' });

    const r = result.recordset[0];
    res.json({
      itemId: parseInt(req.params.itemId),
      nombreItem: r.nombreItem,
      descripcion: r.descripcionCompleta,
      subastaId: r.subastaId,
      martillero: r.martillero,
      moneda: r.moneda,
      importe: r.importe,
      comision: r.comision,
      envioMetodo: r.envioMetodo,
      envioCosto: r.envioCosto,
      total: r.importe + r.comision + (r.envioCosto || 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /subastas/:id/catalogo/:itemId/envio
router.post('/:id/catalogo/:itemId/envio', authMiddleware, async (req, res) => {
  const { metodo } = req.body;
  if (!metodo)
    return res.status(400).json({ codigo: 400, mensaje: 'Falta el método de envío' });

  try {
    const pool = await getPool();

    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .query('SELECT producto FROM itemsCatalogo WHERE identificador = @itemId');

    if (!itemRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Ítem no encontrado' });

    const productoId = itemRes.recordset[0].producto;

    const rdsRes = await pool.request()
      .input('subasta', sql.Int, req.params.id)
      .input('producto', sql.Int, productoId)
      .input('cliente', sql.Int, req.user.id)
      .query(`
        SELECT identificador, importe, comision, envioMetodo, medioPagoId
        FROM registroDeSubasta
        WHERE subasta = @subasta AND producto = @producto AND cliente = @cliente
      `);

    if (!rdsRes.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'No se encontró una compra tuya para este ítem' });

    const rds = rdsRes.recordset[0];

    if (rds.envioMetodo)
      return res.status(409).json({ codigo: 409, mensaje: 'Ya elegiste cómo recibir este producto' });

    let costo = 0;

    if (metodo === 'envio') {
      const totalFactura = rds.importe + rds.comision;
      costo = Math.round(totalFactura * 0.05);

      const medioRes = await pool.request()
        .input('medioId', sql.VarChar, rds.medioPagoId)
        .query('SELECT * FROM mediosPago WHERE id = @medioId');

      const medio = medioRes.recordset[0];
      if (!medio || medio.limiteDisponible < costo)
        return res.status(402).json({ codigo: 402, mensaje: `Fondos insuficientes para el envío en tu medio de pago original. Disponible: $${(medio?.limiteDisponible || 0).toLocaleString('es-AR')}` });

      await pool.request()
        .input('medioId', sql.VarChar, rds.medioPagoId)
        .input('costo', sql.Decimal(18,2), costo)
        .query('UPDATE mediosPago SET limiteDisponible = limiteDisponible - @costo WHERE id = @medioId');
    }

    await pool.request()
      .input('id', sql.Int, rds.identificador)
      .input('metodo', sql.VarChar, metodo)
      .input('costo', sql.Decimal(18,2), costo)
      .query(`UPDATE registroDeSubasta SET envioMetodo = @metodo, envioCosto = @costo WHERE identificador = @id`);

    res.json({ mensaje: 'Decisión de envío guardada', envioMetodo: metodo, envioCosto: costo });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /subastas/:id/entrar
router.post('/:id/entrar', authMiddleware, async (req, res) => {
  const { medioPagoId, limiteElegido } = req.body;
  if (!medioPagoId || !limiteElegido)
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos' });

  try {
    const pool = await getPool();

    // Verificar que el medio existe y tiene fondos suficientes
    const medioRes = await pool.request()
      .input('medioId', sql.VarChar, medioPagoId)
      .input('uid', sql.Int, req.user.id)
      .query('SELECT * FROM mediosPago WHERE id = @medioId AND usuarioId = @uid');

    if (!medioRes.recordset.length)
      return res.status(403).json({ codigo: 403, mensaje: 'Medio de pago no válido' });

    const medio = medioRes.recordset[0];
    if (limiteElegido > medio.limiteDisponible)
      return res.status(402).json({ codigo: 402, mensaje: `No podés elegir un límite mayor a tu disponible ($${medio.limiteDisponible.toLocaleString('es-AR')})` });

    // Buscar o crear el asistente
    let asisRes = await pool.request()
      .input('cli', sql.Int, req.user.id)
      .input('sub', sql.Int, req.params.id)
      .query('SELECT identificador FROM asistentes WHERE cliente = @cli AND subasta = @sub');

    if (asisRes.recordset.length) {
      // Ya existe, actualizar
      await pool.request()
        .input('id', sql.Int, asisRes.recordset[0].identificador)
        .input('medioId', sql.VarChar, medioPagoId)
        .input('limite', sql.Decimal(18,2), limiteElegido)
        .query('UPDATE asistentes SET medioPagoId = @medioId, limiteElegido = @limite, limiteRestante = @limite WHERE identificador = @id');
    } else {
      const maxPostor = await pool.request()
        .input('sub', sql.Int, req.params.id)
        .query('SELECT ISNULL(MAX(numeroPostor), 0) + 1 as siguiente FROM asistentes WHERE subasta = @sub');

      await pool.request()
        .input('nPostor', sql.Int, maxPostor.recordset[0].siguiente)
        .input('cli', sql.Int, req.user.id)
        .input('sub', sql.Int, req.params.id)
        .input('medioId', sql.VarChar, medioPagoId)
        .input('limite', sql.Decimal(18,2), limiteElegido)
        .query(`
          INSERT INTO asistentes (numeroPostor, cliente, subasta, medioPagoId, limiteElegido, limiteRestante)
          VALUES (@nPostor, @cli, @sub, @medioId, @limite, @limite)
        `);
    }

    res.json({ mensaje: 'Límite registrado correctamente' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

router.get('/:id/entrada', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('cli', sql.Int, req.user.id)
      .input('sub', sql.Int, req.params.id)
      .query('SELECT medioPagoId, limiteElegido, limiteRestante FROM asistentes WHERE cliente = @cli AND subasta = @sub');

    if (!result.recordset.length)
      return res.json({ limiteElegido: null });

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ codigo: 500, mensaje: 'Error interno' });
  }
});

module.exports = router;