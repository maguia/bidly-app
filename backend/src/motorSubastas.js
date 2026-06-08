const { getPool, sql } = require('./database');

// Tiempo en ms
const TIEMPO_PUJA = 30 * 1000;        // 30 segundos para que alguien puje
const TIEMPO_ENTRE_ITEMS = 5 * 1000; // 5 segundos entre items

// Guardamos los timers activos por subasta
const timersActivos = {};

async function iniciarMotor() {
  console.log('🔧 Motor de subastas iniciado');
  
  // Verificar cada 10 segundos si hay subastas que deben activarse
  setInterval(verificarSubastasAAbrir, 10 * 1000);
  verificarSubastasAAbrir(); // ejecutar inmediatamente
}

async function verificarSubastasAAbrir() {
  try {
    const pool = await getPool();
    
    // Buscar subastas abiertas con fecha y hora de hoy que deberían estar en vivo
    const result = await pool.request().query(`
      SELECT s.identificador, s.fecha, s.hora
      FROM subastas s
      WHERE s.estado = 'abierta'
      AND CAST(s.fecha AS DATE) = CAST(GETDATE() AS DATE)
      AND CAST(s.hora AS TIME) <= CAST(GETDATE() AS TIME)
    `);

    for (const subasta of result.recordset) {
      if (!timersActivos[subasta.identificador]) {
        console.log(`🎯 Activando subasta #${subasta.identificador}`);
        activarSubasta(subasta.identificador);
      }
    }
  } catch (err) {
    console.error('Error verificando subastas:', err);
  }
}

async function activarSubasta(subastaId) {
  try {
    const pool = await getPool();

    // Marcar subasta como activa en memoria
    timersActivos[subastaId] = true;

    // Obtener primer ítem disponible
    await activarSiguienteItem(subastaId);
  } catch (err) {
    console.error(`Error activando subasta ${subastaId}:`, err);
  }
}

async function activarSiguienteItem(subastaId) {
  try {
    const pool = await getPool();

    // Fix 6 — Verificar que no haya ya un ítem activo en esta subasta
    const yaActivo = await pool.request()
      .input('subId', sql.Int, subastaId)
      .query(`
        SELECT COUNT(*) as total FROM itemsCatalogo ic
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        WHERE c.subasta = @subId AND ic.enSubasta = 1
      `);

    if (yaActivo.recordset[0].total > 0) {
      console.log(`⚠️ Ya hay un ítem activo en subasta #${subastaId}, saltando...`);
      return;
    }

    // Buscar el siguiente ítem disponible (sin pujas y no vendido)
    const itemRes = await pool.request()
      .input('subId', sql.Int, subastaId)
      .query(`
        SELECT TOP 1 ic.identificador as itemId, ic.precioBase
        FROM itemsCatalogo ic
        INNER JOIN catalogos c ON c.identificador = ic.catalogo
        WHERE c.subasta = @subId
        AND ic.subastado = 'no'
        AND ic.enSubasta = 0
        AND ic.identificador NOT IN (
          SELECT DISTINCT p.item FROM pujos p
          INNER JOIN asistentes a ON a.identificador = p.asistente
          WHERE a.subasta = @subId
        )
        ORDER BY ic.identificador ASC
      `);

    if (!itemRes.recordset.length) {
      console.log(`✅ Subasta #${subastaId} finalizada — todos los ítems vendidos`);
      await finalizarSubasta(subastaId);
      return;
    }

    const item = itemRes.recordset[0];
    console.log(`⏱️ Subasta #${subastaId} — Ítem #${item.itemId} activado, esperando pujas...`);

    // Marcar ítem como en subasta actualmente
    await pool.request()
      .input('itemId', sql.Int, item.itemId)
      .query("UPDATE itemsCatalogo SET enSubasta = 1 WHERE identificador = @itemId");

    // Esperar 30 segundos para ver si alguien puja
    const timer = setTimeout(async () => {
      await verificarItemDespuesDeMinuto(subastaId, item.itemId, item.precioBase);
    }, TIEMPO_PUJA);

    // Guardar referencia al timer
    timersActivos[subastaId] = { timer, itemActual: item.itemId };

  } catch (err) {
    console.error(`Error activando ítem en subasta ${subastaId}:`, err);
  }
}

async function verificarItemDespuesDeMinuto(subastaId, itemId, precioBase) {
  try {
    const pool = await getPool();

    const itemActivo = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query('SELECT enSubasta, subastado FROM itemsCatalogo WHERE identificador = @itemId');

    if (!itemActivo.recordset.length) return;

    const { enSubasta, subastado } = itemActivo.recordset[0];

    // Si ya fue vendido (por usuario o por bidly), solo activar siguiente
    if (subastado === 'si') {
      console.log(`✅ Ítem #${itemId} ya vendido — activando siguiente en ${TIEMPO_ENTRE_ITEMS/1000}s...`);
      setTimeout(async () => {
        await activarSiguienteItem(subastaId);
      }, TIEMPO_ENTRE_ITEMS);
      return;
    }

    // Desmarcar ítem como en subasta
    await pool.request()
      .input('itemId', sql.Int, itemId)
      .query("UPDATE itemsCatalogo SET enSubasta = 0 WHERE identificador = @itemId");

    // Ver si alguien pujó
    const pujasRes = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT TOP 1 identificador, importe, asistente
        FROM pujos 
        WHERE item = @itemId
        ORDER BY identificador DESC
      `);

    if (!pujasRes.recordset.length) {
      console.log(`🏢 Nadie pujó por ítem #${itemId} — Bidly lo compra al precio base $${precioBase}`);
      await comprarBidly(subastaId, itemId, precioBase);
    } else {
      const ultimaPuja = pujasRes.recordset[0];
      console.log(`🏆 Ítem #${itemId} vendido a asistente ${ultimaPuja.asistente} por $${ultimaPuja.importe}`);
      await confirmarGanadorAutomatico(subastaId, itemId, ultimaPuja);
    }

    setTimeout(async () => {
      await activarSiguienteItem(subastaId);
    }, TIEMPO_ENTRE_ITEMS);

  } catch (err) {
    console.error(`Error verificando ítem ${itemId}:`, err);
  }
}

async function comprarBidly(subastaId, itemId, precioBase) {
  try {
    const pool = await getPool();

    // Marcar ítem como vendido
    await pool.request()
      .input('itemId', sql.Int, itemId)
      .query("UPDATE itemsCatalogo SET subastado = 'si', enSubasta = 0 WHERE identificador = @itemId");

    // Obtener datos del ítem
    const itemRes = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ic.comision, pr.duenio, pr.identificador as productoId
        FROM itemsCatalogo ic
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE ic.identificador = @itemId
      `);

    const item = itemRes.recordset[0];

    // Registrar venta a Bidly (cliente 1 = empresa)
    await pool.request()
      .input('subasta', sql.Int, subastaId)
      .input('duenio', sql.Int, item.duenio)
      .input('producto', sql.Int, item.productoId)
      .input('importe', sql.Decimal(18,2), precioBase)
      .input('comision', sql.Decimal(18,2), item.comision)
      .query(`
        INSERT INTO registroDeSubasta (subasta, duenio, producto, cliente, importe, comision)
        VALUES (@subasta, @duenio, @producto, 1, @importe, @comision)
      `);

    // Verificar si Bidly existe como dueño
    const duenioExiste = await pool.request()
      .input('bidlyId', sql.Int, 1)
      .query('SELECT identificador FROM duenios WHERE identificador = @bidlyId');

    if (!duenioExiste.recordset.length) {
      await pool.request()
        .input('bidlyId', sql.Int, 1)
        .query(`
          INSERT INTO duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
          VALUES (1, 1, 'si', 'si', 5, 2)
        `);
    }

    // Actualizar dueño del producto
    await pool.request()
      .input('productoId', sql.Int, item.productoId)
      .query("UPDATE productos SET duenio = 1 WHERE identificador = @productoId");

    console.log(`✅ Ítem #${itemId} comprado por Bidly al precio base $${precioBase}`);
  } catch (err) {
    console.error(`Error comprando ítem ${itemId} para Bidly:`, err);
  }
}

async function confirmarGanadorAutomatico(subastaId, itemId, puja) {
  try {
    const pool = await getPool();

    // Marcar puja como ganadora
    await pool.request()
      .input('pujaId', sql.Int, puja.identificador)
      .query("UPDATE pujos SET ganador = 'si' WHERE identificador = @pujaId");

    // Marcar ítem como vendido
    await pool.request()
      .input('itemId', sql.Int, itemId)
      .query("UPDATE itemsCatalogo SET subastado = 'si' WHERE identificador = @itemId");

    // Obtener datos
    const itemRes = await pool.request()
      .input('itemId', sql.Int, itemId)
      .query(`
        SELECT ic.comision, pr.duenio, pr.identificador as productoId
        FROM itemsCatalogo ic
        INNER JOIN productos pr ON pr.identificador = ic.producto
        WHERE ic.identificador = @itemId
      `);

    const item = itemRes.recordset[0];

    const asisRes = await pool.request()
      .input('asisId', sql.Int, puja.asistente)
      .query('SELECT cliente FROM asistentes WHERE identificador = @asisId');

    const clienteId = asisRes.recordset[0].cliente;

    // Registrar venta
    await pool.request()
      .input('subasta', sql.Int, subastaId)
      .input('duenio', sql.Int, item.duenio)
      .input('producto', sql.Int, item.productoId)
      .input('cliente', sql.Int, clienteId)
      .input('importe', sql.Decimal(18,2), puja.importe)
      .input('comision', sql.Decimal(18,2), item.comision)
      .query(`
        INSERT INTO registroDeSubasta (subasta, duenio, producto, cliente, importe, comision)
        VALUES (@subasta, @duenio, @producto, @cliente, @importe, @comision)
      `);

    // Verificar y crear dueño si no existe
    const duenioExiste = await pool.request()
      .input('clienteId', sql.Int, clienteId)
      .query('SELECT identificador FROM duenios WHERE identificador = @clienteId');

    if (!duenioExiste.recordset.length) {
      await pool.request()
        .input('clienteId', sql.Int, clienteId)
        .query(`
          INSERT INTO duenios (identificador, numeroPais, verificacionFinanciera, verificacionJudicial, calificacionRiesgo, verificador)
          SELECT @clienteId, numeroPais, 'si', 'si', 5, 2
          FROM clientes WHERE identificador = @clienteId
        `);
    }

    // Actualizar dueño
    await pool.request()
      .input('clienteId', sql.Int, clienteId)
      .input('productoId', sql.Int, item.productoId)
      .query('UPDATE productos SET duenio = @clienteId WHERE identificador = @productoId');

  } catch (err) {
    console.error(`Error confirmando ganador ítem ${itemId}:`, err);
  }
}

async function finalizarSubasta(subastaId) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('id', sql.Int, subastaId)
      .query("UPDATE subastas SET estado = 'cerrada' WHERE identificador = @id");

    delete timersActivos[subastaId];
    console.log(`🏁 Subasta #${subastaId} cerrada`);
  } catch (err) {
    console.error(`Error finalizando subasta ${subastaId}:`, err);
  }
}

function reiniciarTimerItem(subastaId, itemId, precioBase) {
  if (!timersActivos[subastaId]) return;
  
  // Solo reiniciar si el ítem es el que está activo actualmente
  if (timersActivos[subastaId].itemActual !== itemId) {
    console.log(`⚠️ Puja en ítem #${itemId} pero el activo es #${timersActivos[subastaId].itemActual}`);
    return;
  }

  if (timersActivos[subastaId].timer) {
    clearTimeout(timersActivos[subastaId].timer);
    console.log(`🔄 Timer reiniciado para ítem #${itemId} en subasta #${subastaId}`);

    const timer = setTimeout(async () => {
      await verificarItemDespuesDeMinuto(subastaId, itemId, precioBase);
    }, TIEMPO_PUJA);

    timersActivos[subastaId].timer = timer;
  }
}

module.exports = { iniciarMotor, reiniciarTimerItem };