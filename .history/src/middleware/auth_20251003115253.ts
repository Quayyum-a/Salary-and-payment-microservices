
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Role-based auth middleware factory.
 * Usage: app.get('/secret', authMiddleware(['Admin','HR']), handler)
 */
export default function authMiddleware(requiredRoles: string[]) {
