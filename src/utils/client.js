import axios from 'axios';
import { API_URL } from '../config/environment.js';

export function createClient(apiKey) {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });
}

