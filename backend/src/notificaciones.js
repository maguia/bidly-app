const { getPool, sql } = require('./database');

async function crearNotificacion(usuarioId, tipo, titulo, mensaje, datos = null) {
  try {
    const pool = await getPool();
    await pool.request()
      .input('usuarioId', sql.Int, usuarioId)
      .input('tipo', sql.VarChar, tipo)
      .input('titulo', sql.VarChar, titulo)
      .input('mensaje', sql.VarChar, mensaje)
      .input('datos', sql.VarChar, datos ? JSON.stringify(datos) : null)
      .query(`
        INSERT INTO notificaciones (usuarioId, tipo, titulo, mensaje, datos)
        VALUES (@usuarioId, @tipo, @titulo, @mensaje, @datos)
      `);
  } catch (err) {
    console.error('Error creando notificación:', err);
  }
}

module.exports = { crearNotificacion };