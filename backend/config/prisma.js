// config/prisma.js
// Location: /backend/config/prisma.js

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Create Prisma client with logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
  errorFormat: 'pretty',
});

// Event listeners for logging
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Prisma Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
      timestamp: e.timestamp
    });
  }
});

prisma.$on('error', (e) => {
  logger.error('Prisma Error', {
    target: e.target,
    timestamp: e.timestamp
  });
});

prisma.$on('info', (e) => {
  logger.info('Prisma Info', {
    message: e.message,
    timestamp: e.timestamp
  });
});

prisma.$on('warn', (e) => {
  logger.warn('Prisma Warning', {
    message: e.message,
    timestamp: e.timestamp
  });
});

// Test database connection
const testConnection = async () => {
  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as version`;
    
    logger.info('Database connection successful (Prisma)', {
      timestamp: result[0].current_time,
      version: result[0].version.split(' ').slice(0, 2).join(' ')
    });
    
    return true;
  } catch (err) {
    logger.error('Database connection failed (Prisma)', {
      error: err.message,
      code: err.code
    });
    
    return false;
  }
};

// Get database statistics
const getStats = async () => {
  try {
    const result = await prisma.$queryRaw`
      SELECT 
        numbackends as active_connections,
        xact_commit as transactions_committed,
        xact_rollback as transactions_rolled_back,
        blks_read as blocks_read,
        blks_hit as blocks_hit,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database 
      WHERE datname = ${process.env.DB_NAME}
    `;
    
    return result[0] || {};
  } catch (err) {
    logger.error('Failed to get database statistics', { error: err.message });
    return {};
  }
};

// Graceful shutdown
const disconnect = async () => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected successfully');
  } catch (err) {
    logger.error('Error disconnecting Prisma client', { error: err.message });
  }
};

// Health check
const healthCheck = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (err) {
    logger.error('Database health check failed', { error: err.message });
    return { status: 'unhealthy', error: err.message, timestamp: new Date().toISOString() };
  }
};

module.exports = {
  prisma,
  testConnection,
  getStats,
  disconnect,
  healthCheck
};