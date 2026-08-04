import Constants from 'expo-constants';

const DEFAULT_PORT = 3000;

/**
 * Adresse du backend.
 *
 * `localhost` ne marche que depuis un simulateur iOS : sur un appareil
 * physique ou un émulateur Android il désigne l'appareil lui-même. Faute de
 * variable explicite, on récupère donc l'IP de la machine qui sert Metro —
 * c'est forcément celle qui fait tourner l'API en développement.
 */
function resolveBaseUrl(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit) return explicit.replace(/\/$/, '');

  // hostUri ressemble à « 192.168.1.20:8081 ».
  const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];
  if (metroHost) return `http://${metroHost}:${DEFAULT_PORT}`;

  return `http://localhost:${DEFAULT_PORT}`;
}

export const API_BASE_URL = resolveBaseUrl();
