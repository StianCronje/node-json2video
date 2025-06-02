import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  port: number;
  nodeEnv: string;
  cacheDir: string;
  moviesDir: string;
  defaultZoom: number;
  scheme: string;
  publicPort: string;
  redis: {
    url: string;
    host: string;
    port: number;
    db: number;
  };
  allowedDomains: string[];
  allowedIPs: {
    LOCAL: string[];
    MAKE_US1: string[];
    MAKE_EU2: string[];
    MAKE_EU1: string[];
  };
  logLevel: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  cacheDir: process.env.CACHE_DIR || 'cache',
  moviesDir: process.env.MOVIES_DIR || 'movies',
  defaultZoom: parseFloat(process.env.DEFAULT_ZOOM || '0.002'),
  scheme: process.env.SCHEME || 'https',
  publicPort: process.env.PUBLIC_PORT || '80',
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
  allowedDomains: (process.env.ALLOWED_DOMAINS || 'example.com,trusted.com').split(','),
  allowedIPs: {
    LOCAL: (process.env.ALLOWED_IPS_LOCAL || 'localhost').split(','),
    MAKE_US1: (process.env.ALLOWED_IPS_MAKE_US1 || '54.209.79.175,54.80.47.193,54.161.178.114').split(','),
    MAKE_EU2: (process.env.ALLOWED_IPS_MAKE_EU2 || '34.254.1.9,52.31.156.93,52.50.32.186').split(','),
    MAKE_EU1: (process.env.ALLOWED_IPS_MAKE_EU1 || '54.75.157.176,54.78.149.203,52.18.144.195').split(','),
  },
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default config;
