// utils/generateTrackingNumber.js
import { v4 as uuidv4 } from 'uuid';

export const generateTrackingNumber = () => {
  // Example format: TRK-20250903-ABC123
  const unique = uuidv4().split('-')[0].toUpperCase(); // short unique code
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  return `TRK-${date}-${unique}`;
};
