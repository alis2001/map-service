// utils/logger.js
// Location: /backend/utils/logger.js

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.logLevels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    // Create logs directory if it doesn't exist (only in production)
    this.logsDir = path.join(__dirname, '../logs');
    if (process.env.NODE_ENV === 'production') {
      try {
        if (!fs.existsSync(this.logsDir)) {
          fs.mkdirSync(this.logsDir, { recursive: true });
        }
      } catch (err) {
        console.warn('Failed to create logs directory:', err.message);
        console.warn('Continuing without file logging...');
      }
    }
  }

  shouldLog(level) {
    return this.logLevels[level] <= this.logLevels[this.logLevel];
  }

  formatMessage(level, message, meta = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      ...meta
    };

    return JSON.stringify(logEntry, null, 2);
  }

  writeToFile(level, formattedMessage) {
    if (process.env.NODE_ENV === 'production') {
      try {
        const fileName = `${level}.log`;
        const filePath = path.join(this.logsDir, fileName);
        
        fs.appendFile(filePath, formattedMessage + '\n', (err) => {
          if (err) {
            console.error('Failed to write to log file:', err);
          }
        });
      } catch (err) {
        // Fail silently if can't write to file
        console.warn('Log file write failed:', err.message);
      }
    }
  }

  log(level, message, meta = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[90m'  // Gray
    };
    
    const resetColor = '\x1b[0m';
    const colorCode = colors[level] || '';
    
    console.log(`${colorCode}${formattedMessage}${resetColor}`);
    
    // Write to file in production
    this.writeToFile(level, formattedMessage);
  }

  error(message, meta = {}) {
    // Handle Error objects
    if (message instanceof Error) {
      meta.stack = message.stack;
      meta.name = message.name;
      message = message.message;
    }
    this.log('error', message, meta);
  }

  warn(message, meta = {}) {
    this.log('warn', message, meta);
  }

  info(message, meta = {}) {
    this.log('info', message, meta);
  }

  debug(message, meta = {}) {
    this.log('debug', message, meta);
  }

  // Request logging middleware
  requestLogger() {
    return (req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = Date.now() - start;
        const logData = {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          userAgent: req.get('User-Agent'),
          ip: req.ip || req.connection.remoteAddress,
          timestamp: new Date().toISOString()
        };

        if (res.statusCode >= 400) {
          this.warn('HTTP Request', logData);
        } else {
          this.info('HTTP Request', logData);
        }
      });

      next();
    };
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;