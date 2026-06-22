const router = require('express').Router();
const { getPool, sql } = require('../database');
const authMiddleware = require('../middleware/auth');
const { crearNotificacion } = require('../notificaciones');
const REVISOR_DEFAULT = 3;
const DIRECCION_DEPOSITO = 'Av. Libertador 4250, CABA';

// GET /consignaciones - lista de mis solicitudes
router.get('/', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT c.identificador, c.estadoGeneral, c.estadoProceso, c.fechaCreacion,
               p.descripcionCatalogo
        FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        WHERE p.duenio = @duenio
        ORDER BY c.fechaCreacion DESC
      `);

    res.json({
      consignaciones: result.recordset.map(c => ({
        id: c.identificador,
        numero: `#${String(c.identificador).padStart(4, '0')}`,
        titulo: c.descripcionCatalogo,
        estadoGeneral: c.estadoGeneral,
        estadoProceso: c.estadoProceso,
        fechaCreacion: c.fechaCreacion
      }))
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /consignaciones - nueva solicitud
router.post('/', authMiddleware, async (req, res) => {
  const { titulo, descripcion, categoria, artista, anio, fotos,
          devolucionMetodo, medioPagoCobroId,
          declaracionPertenece, declaracionDevolucion, declaracionOrigen } = req.body;

  if (!titulo || !descripcion || !categoria || !fotos || fotos.length < 6 ||
      !declaracionPertenece || !declaracionDevolucion || !declaracionOrigen ||
      !devolucionMetodo || (devolucionMetodo === 'envio' && !medioPagoCobroId)) {
    return res.status(400).json({ codigo: 400, mensaje: 'Faltan datos obligatorios' });
  }

  try {
    const pool = await getPool();
    const { subirFotoBase64 } = require('../blobStorage');

    const duenioExisteRes = await pool.request()
      .input('id', sql.Int, req.user.id)
      .query('SELECT identificador FROM duenios WHERE identificador = @id');

    if (!duenioExisteRes.recordset.length) {
      await pool.request()
        .input('id', sql.Int, req.user.id)
        .query(`
          INSERT INTO duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
          SELECT @id, numeroPais, 'si', 'si', 5, 2
          FROM clientes WHERE identificador = @id
        `);
    }

    const descripcionCompleta = `${descripcion} | Categoría: ${categoria}` +
      (artista ? ` | Artista/Diseñador: ${artista}` : '') +
      (anio ? ` | Año: ${anio}` : '');

    const productoInsert = await pool.request()
      .input('descCatalogo', sql.VarChar, titulo)
      .input('descCompleta', sql.VarChar, descripcionCompleta)
      .input('revisor', sql.Int, REVISOR_DEFAULT)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        INSERT INTO productos (fecha, disponible, descripcionCatalogo, descripcionCompleta, revisor, duenio)
        OUTPUT INSERTED.identificador
        VALUES (GETDATE(), 'no', @descCatalogo, @descCompleta, @revisor, @duenio)
      `);

    const productoId = productoInsert.recordset[0].identificador;

    for (let i = 0; i < fotos.length; i++) {
    const url = await subirFotoBase64(fotos[i], `producto-${productoId}-${i}`);
    await pool.request()
        .input('producto', sql.Int, productoId)
        .input('url', sql.VarChar, url)
        .query('INSERT INTO fotos (producto, foto) VALUES (@producto, @url)');
    }

    const consigInsert = await pool.request()
      .input('producto', sql.Int, productoId)
      .input('devMetodo', sql.VarChar, devolucionMetodo)
      .input('medioId', sql.VarChar, devolucionMetodo === 'envio' ? medioPagoCobroId : null)
      .query(`
        INSERT INTO consignaciones (producto, estadoGeneral, estadoProceso, devolucionMetodo, devolucionCostoACargo, medioPagoCobroId)
        OUTPUT INSERTED.identificador
        VALUES (@producto, 'en_curso', 'enviada', @devMetodo, 'remitente', @medioId)
      `);

    const idConsignacion = consigInsert.recordset[0].identificador;

    const TIEMPO_EVALUACION = 10 * 1000;
    const tituloProducto = titulo;
    setTimeout(async () => {
    try {
        const pool2 = await getPool();
        const interesada = Math.random() < 0.95;

        if (!interesada) {
        await pool2.request()
            .input('id', sql.Int, idConsignacion)
            .query(`
            UPDATE consignaciones 
            SET estadoGeneral = 'rechazada', estadoProceso = 'rechazada_empresa',
                motivoRechazo = 'La empresa no consideró el bien apto para subasta en este momento'
            WHERE identificador = @id
            `);

        crearNotificacion(req.user.id, 'consignacion',
            'Solicitud rechazada',
            `Tu solicitud para "${tituloProducto}" no fue aceptada por la empresa.`,
            { consignacionId: idConsignacion });
        return;
        }

        const valorBase = Math.floor((Math.random() * 130000 + 20000) / 1000) * 1000;
        const comisiones = [10, 12, 15, 18, 20];
        const comision = comisiones[Math.floor(Math.random() * comisiones.length)];

        await pool2.request()
        .input('id', sql.Int, idConsignacion)
        .input('valor', sql.Decimal(18,2), valorBase)
        .input('comision', sql.Decimal(5,2), comision)
        .input('dir', sql.VarChar, DIRECCION_DEPOSITO)
        .query(`
            UPDATE consignaciones 
            SET estadoProceso = 'interesada', valorBaseOfrecido = @valor, comisionOfrecida = @comision,
                direccionDestino = @dir
            WHERE identificador = @id
        `);

       crearNotificacion(req.user.id, 'consignacion',
        '¡Empresa interesada!',
        `Hay interés en "${tituloProducto}". Enviá el bien para que lo inspeccionen y conocer la oferta final.`,
        { consignacionId: idConsignacion });

    } catch (err) {
        console.error('Error evaluando consignación:', err);
    }
    }, TIEMPO_EVALUACION);

    res.status(201).json({ mensaje: 'Solicitud enviada correctamente', consignacionId: idConsignacion });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// GET /consignaciones/:id - detalle
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT c.*, p.descripcionCatalogo
        FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        WHERE c.identificador = @id AND p.duenio = @duenio
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Solicitud no encontrada' });

    const c = result.recordset[0];
    res.json({
      id: c.identificador,
      numero: `#${String(c.identificador).padStart(4, '0')}`,
      titulo: c.descripcionCatalogo,
      estadoGeneral: c.estadoGeneral,
      estadoProceso: c.estadoProceso,
      direccionDestino: c.direccionDestino
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /consignaciones/:id/confirmar-entrega
router.post('/:id/confirmar-entrega', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();

    const verif = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT c.identificador FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        WHERE c.identificador = @id AND p.duenio = @duenio AND c.estadoProceso = 'interesada'
      `);

    if (!verif.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Solicitud no encontrada o estado inválido' });

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .query(`UPDATE consignaciones SET estadoProceso = 'inspeccion' WHERE identificador = @id`);

    const TIEMPO_INSPECCION = 10 * 1000;
    const usuarioId = req.user.id;
    setTimeout(async () => {
    try {
        const pool2 = await getPool();
        const aprobado = Math.random() < 0.95;

        const datosRes = await pool2.request()
        .input('id', sql.Int, req.params.id)
        .query(`
            SELECT pr.descripcionCatalogo, c.valorBaseOfrecido, c.devolucionMetodo
            FROM consignaciones c INNER JOIN productos pr ON pr.identificador = c.producto
            WHERE c.identificador = @id
        `);
        const tituloProducto = datosRes.recordset[0]?.descripcionCatalogo || 'tu bien';
        const valorBaseOfrecido = datosRes.recordset[0]?.valorBaseOfrecido;
        const devolucionMetodo = datosRes.recordset[0]?.devolucionMetodo;

        if (aprobado) {
        const subastaRes = await pool2.request()
        .query(`
            SELECT TOP 1 identificador FROM subastas 
            WHERE estado = 'abierta' AND CAST(fecha AS DATE) > CAST(GETDATE() AS DATE)
            ORDER BY fecha ASC, hora ASC
        `);
        const subastaId = subastaRes.recordset.length ? subastaRes.recordset[0].identificador : null;

        await pool2.request()
            .input('id', sql.Int, req.params.id)
            .input('subasta', sql.Int, subastaId)
            .query(`UPDATE consignaciones SET estadoProceso = 'aceptada_cliente', subastaAsignada = @subasta WHERE identificador = @id`);

        crearNotificacion(usuarioId, 'consignacion',
            '¡Bien aceptado!',
            `"${tituloProducto}" pasó la inspección. Ofrecen $${valorBaseOfrecido?.toLocaleString('es-AR')}. Revisá las condiciones finales.`,
            { consignacionId: parseInt(req.params.id) });
        } else {
        const COSTO_ENVIO_FLAT = 8000;
        const costoEnvio = devolucionMetodo === 'envio' ? COSTO_ENVIO_FLAT : 0;

        await pool2.request()
            .input('id', sql.Int, req.params.id)
            .input('costo', sql.Decimal(18,2), costoEnvio)
            .query(`
            UPDATE consignaciones 
            SET estadoGeneral = 'rechazada', estadoProceso = 'rechazada_inspeccion',
                motivoRechazo = 'El bien no superó la inspección de condiciones', costoEnvio = @costo
            WHERE identificador = @id
            `);

        crearNotificacion(usuarioId, 'consignacion',
            'Bien rechazado',
            `"${tituloProducto}" no superó la inspección de condiciones.`,
            { consignacionId: parseInt(req.params.id) });
        }
    } catch (err) {
        console.error('Error en inspección:', err);
    }
    }, TIEMPO_INSPECCION);

    res.json({ mensaje: 'Entrega confirmada, comienza la inspección' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// GET /consignaciones/:id/inspeccion
router.get('/:id/inspeccion', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT c.estadoProceso, c.valorBaseOfrecido, c.comisionOfrecida, c.motivoRechazo,
               c.direccionDestino, c.devolucionMetodo, c.costoEnvio,
               s.identificador as subastaId, s.fecha, s.hora, s.categoria, s.moneda
        FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        LEFT JOIN subastas s ON s.identificador = c.subastaAsignada
        WHERE c.identificador = @id AND p.duenio = @duenio
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Solicitud no encontrada' });

    const r = result.recordset[0];

    if (!['aceptada_cliente', 'finalizada', 'rechazada_final', 'rechazada_inspeccion', 'inspeccion'].includes(r.estadoProceso))
      return res.status(404).json({ codigo: 404, mensaje: 'Todavía no hay inspección para esta solicitud' });

    res.json({
      estadoProceso: r.estadoProceso,
      subastaAsignada: r.subastaId ? {
        id: r.subastaId, numero: `#${r.subastaId}`, categoria: r.categoria,
        fecha: r.fecha, hora: r.hora, moneda: r.moneda
      } : null,
      valorBaseOfrecido: r.valorBaseOfrecido,
      comisionOfrecida: r.comisionOfrecida,
      motivoRechazo: r.motivoRechazo,
      direccionDestino: r.direccionDestino,
      devolucionMetodo: r.devolucionMetodo,
      costoEnvio: r.costoEnvio
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// POST /consignaciones/:id/decision-final
router.post('/:id/decision-final', authMiddleware, async (req, res) => {
  const { aceptar, cvuCobroVenta } = req.body;
  if (typeof aceptar !== 'boolean')
    return res.status(400).json({ codigo: 400, mensaje: 'Falta indicar si aceptás o no' });

  try {
    const pool = await getPool();

    const verif = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT c.*, p.identificador as productoId
        FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        WHERE c.identificador = @id AND p.duenio = @duenio AND c.estadoProceso = 'aceptada_cliente'
      `);

    if (!verif.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Solicitud no encontrada o estado inválido' });

    const consig = verif.recordset[0];

    if (!aceptar) {
        const costoEnvio = consig.devolucionMetodo === 'envio' ? consig.valorBaseOfrecido * 0.05 : 0;
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('costo', sql.Decimal(18,2), costoEnvio)
            .query(`
            UPDATE consignaciones 
            SET estadoGeneral = 'rechazada', estadoProceso = 'rechazada_final', costoEnvio = @costo,
                motivoRechazo = 'No aceptaste las condiciones ofrecidas por la empresa'
            WHERE identificador = @id
            `);
        return res.json({ mensaje: 'Solicitaste la devolución del bien' });
        }

    if (!cvuCobroVenta || cvuCobroVenta.replace(/\D/g, '').length !== 22)
      return res.status(400).json({ codigo: 400, mensaje: 'Ingresá un CVU válido de 22 dígitos' });

    let subastaId = consig.subastaAsignada;
    if (!subastaId) {
      const subastaRes = await pool.request()
        .query(`
            SELECT TOP 1 identificador FROM subastas 
            WHERE estado = 'abierta' AND CAST(fecha AS DATE) > CAST(GETDATE() AS DATE)
            ORDER BY fecha ASC, hora ASC
        `);
      if (!subastaRes.recordset.length)
        return res.status(409).json({ codigo: 409, mensaje: 'No hay ninguna subasta abierta para asignar este bien todavía' });
      subastaId = subastaRes.recordset[0].identificador;
    }

    let catalogoRes = await pool.request()
      .input('sub', sql.Int, subastaId)
      .query('SELECT TOP 1 identificador FROM catalogos WHERE subasta = @sub');

    let catalogoId;
    if (catalogoRes.recordset.length) {
      catalogoId = catalogoRes.recordset[0].identificador;
    } else {
      const nuevoCatalogo = await pool.request()
        .input('sub', sql.Int, subastaId)
        .query(`
          INSERT INTO catalogos (descripcion, subasta, responsable)
          OUTPUT INSERTED.identificador
          VALUES ('Catálogo general', @sub, 1)
        `);
      catalogoId = nuevoCatalogo.recordset[0].identificador;
    }

    const comisionMonto = consig.valorBaseOfrecido * (consig.comisionOfrecida / 100);

    await pool.request()
      .input('catalogo', sql.Int, catalogoId)
      .input('producto', sql.Int, consig.productoId)
      .input('precioBase', sql.Decimal(18,2), consig.valorBaseOfrecido)
      .input('comision', sql.Decimal(18,2), comisionMonto)
      .query(`
        INSERT INTO itemsCatalogo (catalogo, producto, precioBase, comision, subastado, enSubasta)
        VALUES (@catalogo, @producto, @precioBase, @comision, 'no', 0)
      `);

    const COMPANIAS_SEGURO = ['La Caja Seguros', 'Sancor Seguros', 'Allianz Argentina', 'Zurich Seguros', 'Mapfre Argentina'];
    const compania = COMPANIAS_SEGURO[Math.floor(Math.random() * COMPANIAS_SEGURO.length)];
    const nroPoliza = `POL-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const importeSeguro = Math.round(consig.valorBaseOfrecido * 0.08);

    await pool.request()
    .input('nro', sql.VarChar, nroPoliza)
    .input('compania', sql.VarChar, compania)
    .input('importe', sql.Decimal(18,2), importeSeguro)
    .query(`
        INSERT INTO seguros (nroPoliza, compania, polizaCombinada, importe)
        VALUES (@nro, @compania, 'no', @importe)
    `);

    await pool.request()
    .input('id', sql.Int, consig.productoId)
    .input('nro', sql.VarChar, nroPoliza)
    .query(`UPDATE productos SET seguro = @nro WHERE identificador = @id`);

    await pool.request()
      .input('id', sql.Int, consig.productoId)
      .query(`UPDATE productos SET disponible = 'si' WHERE identificador = @id`);

    await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('cvu', sql.VarChar, cvuCobroVenta)
      .input('subastaIdParam', sql.Int, subastaId)
      .query(`
        UPDATE consignaciones 
        SET estadoGeneral = 'aceptada', estadoProceso = 'finalizada', cvuCobroVenta = @cvu, subastaAsignada = @subastaIdParam
        WHERE identificador = @id
      `);

    res.json({ mensaje: 'Bien asignado a subasta correctamente' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

// GET /consignaciones/:id/seguro
router.get('/:id/seguro', authMiddleware, async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, req.params.id)
      .input('duenio', sql.Int, req.user.id)
      .query(`
        SELECT s.nroPoliza, s.compania, s.polizaCombinada, s.importe
        FROM consignaciones c
        INNER JOIN productos p ON p.identificador = c.producto
        INNER JOIN seguros s ON s.nroPoliza = p.seguro
        WHERE c.identificador = @id AND p.duenio = @duenio
      `);

    if (!result.recordset.length)
      return res.status(404).json({ codigo: 404, mensaje: 'Este bien todavía no tiene póliza asignada' });

    res.json(result.recordset[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ codigo: 500, mensaje: 'Error interno del servidor' });
  }
});

module.exports = router;