import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodIssue } from 'zod';

export interface ValidationError {
  path: string[];
  message: string;
}

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body as any);
      next();
    } catch (error) {
      const err = error as any;
      const errors: ValidationError[] = (err?.issues || []).map((issue: any) => ({
        path: issue.path || [],
        message: issue.message || 'Validation error',
      }));
      res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query as any) as any;
      next();
    } catch (error) {
      const err = error as any;
      const errors: ValidationError[] = (err?.issues || []).map((issue: any) => ({
        path: issue.path || [],
        message: issue.message || 'Validation error',
      }));
      res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params as any) as any;
      next();
    } catch (error) {
      const err = error as any;
      const errors: ValidationError[] = (err?.issues || []).map((issue: any) => ({
        path: issue.path || [],
        message: issue.message || 'Validation error',
      }));
      res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
  };
}
