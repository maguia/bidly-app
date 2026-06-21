const { BlobServiceClient } = require('@azure/storage-blob');

const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
const containerName = 'fotos-bidly';

let containerClient = null;

function getContainerClient() {
  if (!containerClient) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    containerClient = blobServiceClient.getContainerClient(containerName);
  }
  return containerClient;
}

async function subirFotoBase64(dataUriOBase64, prefijo = 'foto') {
  const base64Limpio = dataUriOBase64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Limpio, 'base64');

  const nombreBlob = `${prefijo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const client = getContainerClient();
  const blockBlobClient = client.getBlockBlobClient(nombreBlob);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: 'image/jpeg' }
  });

  return blockBlobClient.url;
}

module.exports = { subirFotoBase64 };