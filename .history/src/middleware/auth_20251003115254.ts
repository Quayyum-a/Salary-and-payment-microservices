import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Role-based auth middleware factory.
 * Usage: app.get('/secret', authMiddleware(['Admin','HR']), handler)
 */
export default function authMiddleware(requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = req.headers.authorization;
      if (!auth || !auth.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Missing or invalid Authorization header' });
      }

      const token = auth.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'change_this_to_a_strong_secret';

      let payload: any;
      try {
        payload = jwt.verify(token, secret);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
      }

      // Attach minimal user info to request
      (req as any).user = {
        id: (payload as any).sub || (payload as any).id || null,
        role: (payload as any).role || 'User',
        raw: payload,
      };

      // Role check
      if (requiredRoles && requiredRoles.length > 0) {
        const userRole = (req as any).user.role;
        if (!requiredRoles.includes(userRole)) {
          return res.status(403).json({ message: 'Forbidden - insufficient role' });
        }
      }

      return next();
    } catch (err) {
      return res.status(500).json({ message: 'Authentication error' });
    }
  };
}
