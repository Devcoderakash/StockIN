import { Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { AuthenticatedRequest } from '../types';
import { sendError } from '../utils/response';

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey);

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'Missing or invalid Authorization header', 401);
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      sendError(res, 'Unauthorized token', 401);
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    sendError(res, message, 401);
  }
}
