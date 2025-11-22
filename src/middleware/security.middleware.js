import aj from '#config/arcjet.js';
import logger from '#config/logger.js';
import { slidingWindow } from '@arcjet/node';

const securityMiddleware = async (req, res, next) => {
  try {
    const role = req.user?.role || 'guest';

    let limit, message;

    switch (role) {
      case 'admin':
        limit = 20; // High limit for admin
        message = 'Admin request limit exceeded (20 per minute). Slow down.';
        break;
      case 'user':
        limit = 10; // Medium limit for regular users
        message = 'User request limit exceeded (10 per minute). Slow down.';
        break;
      case 'guest':
      default:
        limit = 5; // Low limit for guests
        message = 'Guest request limit exceeded (5 per minute). Slow down.';
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
        name: `${role}-rate-limit`,
      })
    );

    const decision = await client.protect(req);
    if (decision.isDenied() && decision.reason.isBot()) {
      logger.warn(`Bot detected`, {
        ip: req.ip,
        role,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Automated requests are not allowed.',
      });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      logger.warn(`Shield blocked request`, {
        ip: req.ip,
        role,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request blocked by security policy.',
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      logger.warn(`Rate limit exceeded`, {
        ip: req.ip,
        role,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({
        error: 'Forbidden',
        message: 'Rate limit exceeded. Slow down.',
      });
    }

    next();
  } catch (e) {
    logger.error('Security middleware error: ', e);
    res
      .status(500)
      .json({ error: 'Internal server error', message: e.message });
  }
};

export default securityMiddleware;
