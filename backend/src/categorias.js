const { getPool, sql } = require('./database');

const ORDEN = ['comun', 'especial', 'plata', 'oro', 'platino'];

async function evaluarCategoria(usuarioId) {
  try {
    const pool = await getPool();

    // Obtener categoría actual
    const catRes = await pool.request()
      .input('id', sql.Int, usuarioId)
      .query('SELECT categoria FROM clientes WHERE identificador = @id');

    if (!catRes.recordset.length) return;
    const categoriaActual = catRes.recordset[0].categoria;
    const nivelActual = ORDEN.indexOf(categoriaActual);

    // Si ya es platino no hay más que subir
    if (nivelActual === ORDEN.length - 1) return;

    // Contar medios de pago verificados
    const mediosRes = await pool.request()
      .input('id', sql.Int, usuarioId)
      .query(`
        SELECT COUNT(*) as total 
        FROM mediosPago 
        WHERE usuarioId = @id AND verificado = 1
      `);
    const medios = mediosRes.recordset[0].total;

    // Contar pujas realizadas
    const pujasRes = await pool.request()
      .input('id', sql.Int, usuarioId)
      .query(`
        SELECT COUNT(*) as total
        FROM pujos p
        INNER JOIN asistentes a ON a.identificador = p.asistente
        WHERE a.cliente = @id
      `);
    const pujas = pujasRes.recordset[0].total;

    // Contar subastas ganadas
    const ganadasRes = await pool.request()
      .input('id', sql.Int, usuarioId)
      .query(`
        SELECT COUNT(*) as total
        FROM registroDeSubasta
        WHERE cliente = @id
      `);
    const ganadas = ganadasRes.recordset[0].total;

    console.log(`📊 Usuario ${usuarioId} — medios: ${medios}, pujas: ${pujas}, ganadas: ${ganadas}, categoría: ${categoriaActual}`);

    // Evaluar si corresponde subir de categoría
    let nuevaCategoria = categoriaActual;

    if (categoriaActual === 'comun' && medios >= 2 && pujas >= 1) {
      nuevaCategoria = 'especial';
    } else if (categoriaActual === 'especial' && medios >= 3 && pujas >= 5 && ganadas >= 1) {
      nuevaCategoria = 'plata';
    } else if (categoriaActual === 'plata' && medios >= 4 && pujas >= 15 && ganadas >= 3) {
      nuevaCategoria = 'oro';
    } else if (categoriaActual === 'oro' && medios >= 5 && pujas >= 30 && ganadas >= 8) {
      nuevaCategoria = 'platino';
    }

    // Si cambió la categoría, actualizarla
    if (nuevaCategoria !== categoriaActual) {
      await pool.request()
        .input('id', sql.Int, usuarioId)
        .input('cat', sql.VarChar, nuevaCategoria)
        .query('UPDATE clientes SET categoria = @cat WHERE identificador = @id');

      console.log(`⬆️ Usuario ${usuarioId} subió de categoría: ${categoriaActual} → ${nuevaCategoria}`);
    }

    return nuevaCategoria;
  } catch (err) {
    console.error('Error evaluando categoría:', err);
  }
}

async function usuarioEsValido(usuarioId) {
  const pool = await getPool();
  const razones = [];

  const medioValidoRes = await pool.request()
    .input('id', sql.Int, usuarioId)
    .query(`SELECT COUNT(*) as total FROM mediosPago WHERE usuarioId = @id AND verificado = 1`);
  if (medioValidoRes.recordset[0].total === 0) razones.push('No posee medios de pago válidos');

  const deudaRes = await pool.request()
    .input('id', sql.Int, usuarioId)
    .query(`SELECT COUNT(*) as total FROM deudas WHERE cliente = @id AND estado = 'pendiente'`);
  if (deudaRes.recordset[0].total > 0) razones.push('Posee deudas pendientes de pago');

  return { valido: razones.length === 0, razones };
}

module.exports = { evaluarCategoria, usuarioEsValido };