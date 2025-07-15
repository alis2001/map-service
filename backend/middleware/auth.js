const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Middleware per autenticazione JWT con database Caffis
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ 
        error: 'Token di accesso richiesto',
        message: 'Devi effettuare il login per utilizzare questa funzione'
      });
    }

    // Verifica il token JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'caffis_jwt_secret_2024_super_secure_key_xY9mN3pQ7rT2wK5vL8bC');
    
    // Ottieni i dettagli dell'utente dal database Caffis
    const user = await prisma.$queryRaw`
      SELECT 
        cu.id,
        cu.firstName,
        cu.lastName,
        cu.username,
        cu.email,
        cu.profilePic,
        cu.isEmailVerified,
        cu.isPhoneVerified,
        cu.createdAt
      FROM caffis_users cu
      WHERE cu.id = ${decoded.userId || decoded.id}
        AND cu.isEmailVerified = true
    `;

    if (!user.length) {
      return res.status(403).json({ 
        error: 'Utente non trovato o non verificato',
        message: 'Il tuo account non è più valido o non è verificato'
      });
    }

    // Aggiungi l'utente alla richiesta
    req.user = user[0];
    next();

  } catch (error) {
    console.error('Errore autenticazione:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Token non valido',
        message: 'Devi effettuare nuovamente il login'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(403).json({ 
        error: 'Token scaduto',
        message: 'La tua sessione è scaduta, effettua nuovamente il login'
      });
    }

    return res.status(500).json({ 
      error: 'Errore del server',
      message: 'Problema di autenticazione, riprova più tardi'
    });
  }
};

module.exports = { authenticateToken };