import type { Location } from '../types/location.types';

/**
 * Indica se `location` está na hierarquia abaixo do nó país `countryLocationId`.
 * Usa `parentId` e o mapa completo de localizações para não depender do recorte de
 * `parent` aninhado na API (limitado a poucos níveis).
 */
export function isLocationDescendantOfCountry(
  location: Location,
  countryLocationId: number,
  locationsById: Map<number, Location>,
): boolean {
  if (location.id === countryLocationId) {
    return false;
  }

  const visited = new Set<number>();
  let currentId: number | null = location.parentId;

  while (currentId != null) {
    if (visited.has(currentId)) {
      return false;
    }
    visited.add(currentId);

    if (currentId === countryLocationId) {
      return true;
    }

    const current = locationsById.get(currentId);
    if (!current) {
      return false;
    }

    currentId = current.parentId;
  }

  return false;
}
