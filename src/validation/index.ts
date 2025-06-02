import Joi from 'joi';
import { URL } from 'url';
import { Request, Response, NextFunction } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { ValidationResult } from '../types';

// Joi schema for video request validation
export const videoRequestSchema = Joi.object({
  record_id: Joi.string().alphanum().required(),
  input_url: Joi.string().uri().required(),
  webhook_url: Joi.string().uri().optional(),
  framerate: Joi.number().positive().required(),
  duration: Joi.number().positive().max(60).required(),
  cache: Joi.boolean().required(),
  zoom: Joi.number().min(-100).max(100).required(),
  crop: Joi.boolean().required(),
  output_width: Joi.number().positive().integer().required(),
  output_height: Joi.number().positive().integer().required(),
});

export function validateJson(data: any): ValidationResult {
  const { error } = videoRequestSchema.validate(data);
  if (error) {
    return { isValid: false, error: error.details[0].message };
  }
  return { isValid: true };
}

export function isValidRecordId(recordId: string): boolean {
  return /^[0-9a-zA-Z]+$/.test(recordId);
}

export function isValidApiKey(apiKey: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(apiKey);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Ensure the URL uses http or https
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return false;
    }
    
    // Get all allowed IPs from config
    const allowedIPs = Object.values(config.allowedIPs).flat();
    
    // Check if hostname is in allowed IPs or domains
    const hostname = parsedUrl.hostname;
    if (!allowedIPs.includes(hostname) && !config.allowedDomains.includes(hostname)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function isValidZoomLevel(zoom: number): boolean {
  return zoom >= -100 && zoom <= 100;
}

export function isValidCrop(crop: boolean): boolean {
  return typeof crop === 'boolean';
}

export function isValidDimension(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isValidFramerate(value: number): boolean {
  return Number.isInteger(value) && value > 0;
}

export function isValidDuration(value: number): boolean {
  return Number.isInteger(value) && value <= 60 && value > 0;
}

export function isValidCache(cache: boolean): boolean {
  return typeof cache === 'boolean';
}

export function directoryExists(apiKey: string): boolean {
  const fullPath = path.normalize(path.join(config.moviesDir, apiKey));
  
  // Security check: ensure the path doesn't escape the movies directory
  if (!fullPath.startsWith(config.moviesDir)) {
    throw new Error('Directory traversal not allowed');
  }
  
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
}

export function validateApiKey(passApiKey: boolean = false) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(400).json({ error: 'Missing x-api-key header' });
      return;
    }

    if (!isValidApiKey(apiKey)) {
      res.status(400).json({ error: 'Invalid API key' });
      return;
    }

    if (!directoryExists(apiKey)) {
      res.status(400).json({ error: 'Directory does not exist' });
      return;
    }

    if (passApiKey) {
      (req as any).apiKey = apiKey;
    }

    next();
  };
}
