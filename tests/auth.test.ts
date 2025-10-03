import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import authMiddleware from '../src/middleware/auth';

describe('Auth middleware', () => {
  const JWT_SECRET = 'test-secret';
  beforeAll(() => {
    process.env.JWT_SECRET = JWT_SECRET;
  });

  const makeToken = (payload: object) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  };

  const makeApp = (requiredRoles: string[]) => {
    const app = express();
    // protected route
    app.get(
      '/protected',
      authMiddleware(requiredRoles),
      (_req, res) => res.json({ ok: true })
    );
    return app;
  };

  it('returns 401 when no token provided', async () => {
    const app = makeApp(['Admin', 'HR']);
    const res = await request(app).get('/protected');
    expect(res.status).toBe(401);
  });

  it('allows Admin role', async () => {
    const app = makeApp(['Admin', 'HR']);
    const token = makeToken({ sub: 'u1', role: 'Admin' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('allows HR role', async () => {
    const app = makeApp(['Admin', 'HR']);
    const token = makeToken({ sub: 'u2', role: 'HR' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('forbids other roles', async () => {
    const app = makeApp(['Admin', 'HR']);
    const token = makeToken({ sub: 'u3', role: 'User' });
    const res = await request(app).get('/protected').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('returns 401 for invalid token', async () => {
    const app = makeApp(['Admin', 'HR']);
    const res = await request(app).get('/protected').set('Authorization', `Bearer invalid.token.here`);
    expect(res.status).toBe(401);
  });
});