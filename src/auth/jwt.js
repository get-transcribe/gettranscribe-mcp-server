import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { JWT_SECRET } from '../config/environment.js';

export function generateAuthCode() {
  return randomUUID();
}

export function generateAccessToken(userApiKey) {
  return jwt.sign(
    { 
      api_key: userApiKey,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24)
    },
    JWT_SECRET
  );
}

export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

export const authCodes = new Map();
export const accessTokens = new Map();
export const registeredClients = new Map();

