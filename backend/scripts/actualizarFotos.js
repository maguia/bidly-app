require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getPool, sql } = require('../src/database');
const { subirFotoBase64 } = require('../src/blobStorage');

// Completá acá: id de producto -> rutas locales de sus fotos en tu compu
const FOTOS_A_SUBIR = {
  1: [
    'C:/Users/Maguia/Desktop/fotos/producto1-a.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto1-b.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto1-c.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto1-d.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto1-e.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto1-f.PNG'
  ],
  2: [
    'C:/Users/Maguia/Desktop/fotos/producto2-a.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto2-b.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto2-c.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto2-d.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto2-e.PNG',
    'C:/Users/Maguia/Desktop/fotos/producto2-f.PNG'
  ],
  3: [
    'C:/Users/Maguia/Desktop/fotos/producto3-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto3-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto3-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto3-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto3-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto3-f.JPEG'
  ],
  4: [
    'C:/Users/Maguia/Desktop/fotos/producto4-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto4-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto4-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto4-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto4-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto4-f.JPEG'
  ],
  5: [
    'C:/Users/Maguia/Desktop/fotos/producto5-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto5-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto5-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto5-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto5-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto5-f.JPEG'
  ],
  6: [
    'C:/Users/Maguia/Desktop/fotos/producto6-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto6-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto6-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto6-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto6-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto6-f.JPEG'
  ],
  7: [
    'C:/Users/Maguia/Desktop/fotos/producto7-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto7-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto7-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto7-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto7-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto7-f.JPEG'
  ],
  8: [
    'C:/Users/Maguia/Desktop/fotos/producto8-a.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto8-b.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto8-c.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto8-d.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto8-e.JPEG',
    'C:/Users/Maguia/Desktop/fotos/producto8-f.JPEG'
  ]
};

async function main() {
  const pool = await getPool();

  for (const [productoId, rutas] of Object.entries(FOTOS_A_SUBIR)) {
    console.log(`Actualizando fotos del producto ${productoId}...`);

    // Borra las fotos viejas (las de Unsplash) de ese producto
    await pool.request()
      .input('id', sql.Int, productoId)
      .query('DELETE FROM fotos WHERE producto = @id');

    for (const ruta of rutas) {
      const buffer = fs.readFileSync(ruta);
      const base64 = buffer.toString('base64');
      const extension = path.extname(ruta).slice(1) || 'jpg';
      const dataUri = `data:image/${extension};base64,${base64}`;

      const url = await subirFotoBase64(dataUri, `producto-${productoId}`);

      await pool.request()
        .input('producto', sql.Int, productoId)
        .input('url', sql.VarChar, url)
        .query('INSERT INTO fotos (producto, foto) VALUES (@producto, @url)');

      console.log(`  -> ${ruta} subida: ${url}`);
    }
  }

  console.log('¡Listo!');
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});