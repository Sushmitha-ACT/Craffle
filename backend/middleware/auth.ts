import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'craffle_ultra_secure_jwt_token_secret_12345';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Authorization header format must be Bearer <token>' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required' });
  }
  next();
}

export async function requireApprovedSeller(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admins have override privileges
  if (req.user.role === 'ADMIN') {
    return next();
  }

  if (req.user.role !== 'SELLER') {
    return res.status(403).json({ error: 'Seller account required' });
  }

  try {
    const { Seller } = await import('../models/Seller.js');
    const seller = await Seller.findOne({ userId: req.user.id });
    if (!seller) {
      return res.status(404).json({ error: 'Seller profile not found' });
    }

    const isApproved = (seller as any).isApproved === true || 
      (seller as any).adminApprovalStatus === 'APPROVED' || 
      (seller as any).verificationStatus === 'Approved';

    if (!isApproved) {
      return res.status(403).json({ 
        error: 'Seller account is pending admin approval or has been rejected',
        approvalStatus: (seller as any).adminApprovalStatus || (seller as any).verificationStatus || 'PENDING',
        rejectionReason: (seller as any).rejectionReason || undefined
      });
    }

    // Auto-heal if approved flag was missing
    if (!(seller as any).isApproved) {
      Seller.updateOne({ _id: (seller as any)._id }, { isApproved: true, adminApprovalStatus: 'APPROVED' }).catch(() => {});
    }

    // Attach seller to request for downstream handlers
    (req as any).seller = seller;
    next();
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify seller approval status' });
  }
}
