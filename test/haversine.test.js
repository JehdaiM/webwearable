import { haversineDistance } from '../utils/haversine';

describe('Pruebas de la función Haversine', () => {
  test('Debe retornar 0 si las coordenadas son iguales', () => {
    const distancia = haversineDistance(19.3676, -99.6073, 19.3676, -99.6073);
    expect(distancia).toBe(0);
  });

  test('Debe calcular una distancia mayor a 0 para coordenadas distintas', () => {
    const distancia = haversineDistance(19.3676594, -99.6073421, 19.3677000, -99.6073000);
    expect(distancia).toBeGreaterThan(0);
    expect(distancia).toBeLessThan(100); // Debería ser una distancia muy corta
  });
});