const jwt = require('jsonwebtoken');

// Middleware per autenticazione JWT - solo validazione token (microservice pattern)
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
    
    // Verifica il token JWT (senza database lookup per microservice)
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'caffis_jwt_secret_2024_super_secure_key_xY9mN3pQ7rT2wK5vL8bC');
    
    // Aggiungi l'utente decodificato alla richiesta
    req.user = {
      id: decoded.userId || decoded.id,
      iat: decoded.iat,
      exp: decoded.exp
    };
    
    console.log('✅ User authenticated:', req.user.id);
    next();
    
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    
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