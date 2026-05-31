const router = require('express').Router();
const { getPool, sql } = require('../database');
const authMiddleware = require('../middleware/auth');

const CATEGORIAS = ['comun', 'especial', 'plata', 'oro', 'platino'];

// ─── GET /subastas ──────────────────────────────────────
// Devuelve la lista de subastas con info de acceso del usuario
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    // Obtener categoría del usuario logueado
    const userRes = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT categoria FROM clientes WHERE identificador = @id');

    const userCategoria = userRes.recordset[0]?.categoria || 'comun';
    const nivelUser = CATEGORIAS.indexOf(userCategoria);

    // Traer todas las subastas con su subastador
    const result = await pool.request().query(`
      SELECT s.identificador, s.fecha, s.hora, s.estado,
             s.ubicacion, s.categoria,
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
      ORDER BY s.fecha, s.hora
    `);

    const subastas = result.recordset.map(s => {
      const nivelSubasta = CATEGORIAS.indexOf(s.categoria);
      const puedePujar = nivelUser >= nivelSubasta;

      return {
        id: s.identificador,
        nombre: `Subasta #${s.identificador}`,
        martillero: s.martillero,
        ubicacion: s.ubicacion,
        fecha: s.fecha,
        hora: s.hora,
        categoriaRequerida: s.categoria,
        estado: s.estado === 'abierta' ? 'en_vivo' : 'finalizado',
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
// Devuelve los ítems del catálogo de una subasta
router.get('/:id/catalogo', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request()
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT ic.identificador as itemId,
               pr.descripcionCatalogo as nombre,
               ic.precioBase,
               ic.comision,
               ic.subastado
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
      comision: i.comision,
      estado: i.subastado === 'si' ? 'vendido' : 'disponible'
    })));

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// ─── GET /subastas/:id/catalogo/:itemId ─────────────────
// Devuelve el detalle de un ítem con historial de pujas y rango válido
router.get('/:id/catalogo/:itemId', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    // Detalle del ítem
    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .input('subId', sql.Int, req.params.id)
      .query(`
        SELECT ic.identificador as itemId,
               ic.precioBase, ic.comision, ic.subastado,
               pr.descripcionCatalogo as nombre,
               pr.descripcionCompleta,
               per.nombre as duenio
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

    // Historial de pujas del ítem
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

    // Calcular mejor oferta y rango válido
    const mejorOferta = pujos.length ? pujos[0].monto : item.precioBase;
    const rangoMin = mejorOferta + item.precioBase * 0.01;
    const rangoMax = mejorOferta + item.precioBase * 0.20;

    // Ver si el usuario tiene límites o no
    const catRes = await pool.request()
      .input('uid', sql.Int, req.user.id)
      .query('SELECT categoria FROM clientes WHERE identificador = @uid');

    const categoriaUser = catRes.recordset[0]?.categoria;
    const sinLimite = ['oro', 'platino'].includes(categoriaUser);

    res.json({
      id: String(item.itemId),
      nombre: item.nombre,
      descripcion: item.descripcionCompleta,
      estado: item.subastado === 'si' ? 'vendido' : 'disponible',
      precioBase: item.precioBase,
      duenioActual: item.duenio,
      mejorOferta,
      // Si es oro o platino no tiene límites
      rangoMinimo: sinLimite ? null : rangoMin,
      rangoMaximo: sinLimite ? null : rangoMax,
      sinLimitesPuja: sinLimite,
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
// El usuario hace una puja en un ítem
router.post('/:id/catalogo/:itemId/pujas', authMiddleware, async (req, res) => {
  const { monto, medioId } = req.body;

  if (!monto || !medioId) {
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan monto o medio de pago' });
  }

  try {
    const pool = await getPool();

    // 1. Verificar que la subasta esté abierta
    const subRes = await pool.request()
      .input('id', sql.Int, req.params.id)
      .query('SELECT estado, categoria FROM subastas WHERE identificador = @id');

    if (!subRes.recordset.length || subRes.recordset[0].estado !== 'abierta') {
      return res.status(423).json({ codigo: 423, mensaje: 'Subasta no activa' });
    }

    // 2. Verificar que el ítem exista y no esté vendido
    const itemRes = await pool.request()
      .input('itemId', sql.Int, req.params.itemId)
      .input('subId', sql.Int, req.params.id)
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

    // 3. Obtener la última puja para calcular el rango
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

    // 4. Verificar categoría del usuario (oro y platino no tienen límites)
    const catRes = await pool.request()
      .input('uid', sql.Int, req.user.id)
      .query('SELECT categoria FROM clientes WHERE identificador = @uid');

    const categoria = catRes.recordset[0]?.categoria;
    const sinLimite = ['oro', 'platino'].includes(categoria);

    if (sinLimite) {
      // Oro y platino: solo tiene que superar la mejor oferta actual
      if (monto <= base) {
        return res.status(400).json({
          codigo: 400,
          mensaje: 'La oferta debe superar la mejor oferta actual',
          mejorOfertaActual: base
        });
      }
    } else {
      // Resto de categorías: tiene que estar dentro del rango
      if (monto < rangoMin || monto > rangoMax) {
        return res.status(400).json({
          codigo: 400,
          mensaje: 'Oferta fuera de rango',
          rangoMinimo: rangoMin,
          rangoMaximo: rangoMax
        });
      }
    }

    // 5. Verificar o crear asistente (el usuario en esa subasta)
    let asisRes = await pool.request()
      .input('cli', sql.Int, req.user.id)
      .input('sub', sql.Int, req.params.id)
      .query('SELECT identificador FROM asistentes WHERE cliente = @cli AND subasta = @sub');

    let asisId;
    if (asisRes.recordset.length) {
      asisId = asisRes.recordset[0].identificador;
    } else {
      const maxPostor = await pool.request()
        .input('sub', sql.Int, req.params.id)
        .query(`
          SELECT ISNULL(MAX(numeroPostor), 0) + 1 as siguiente 
          FROM asistentes 
          WHERE subasta = @sub
        `);

      const insertAsis = await pool.request()
        .input('nPostor', sql.Int, maxPostor.recordset[0].siguiente)
        .input('cli', sql.Int, req.user.id)
        .input('sub', sql.Int, req.params.id)
        .query(`
          INSERT INTO asistentes (numeroPostor, cliente, subasta)
          OUTPUT INSERTED.identificador
          VALUES (@nPostor, @cli, @sub)
        `);

      asisId = insertAsis.recordset[0].identificador;
    }

    // 6. Insertar la puja
    const pujaInsert = await pool.request()
      .input('asistente', sql.Int, asisId)
      .input('item', sql.Int, req.params.itemId)
      .input('importe', sql.Decimal(18, 2), monto)
      .query(`
        INSERT INTO pujos (asistente, item, importe, ganador)
        OUTPUT INSERTED.identificador
        VALUES (@asistente, @item, @importe, 'no')
      `);

    const pujaId = `PJ-${pujaInsert.recordset[0].identificador}`;
    const expira = new Date(Date.now() + 60000).toISOString();

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

module.exports = router;