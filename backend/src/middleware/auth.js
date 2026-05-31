const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const header = req.headers.authorization;
  
  if (!header) {
    return res.status(401).json({ codigo: 401, mensaje: 'No autenticado' });
  }

  const token = header.split(' ')[1];
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'bidly_secret');
    next();
  } catch {
    res.status(401).json({ codigo: 401, mensaje: 'Token inválido o expirado' });
  }
};