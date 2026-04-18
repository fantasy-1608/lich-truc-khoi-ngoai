import db from './db.json';
import { Doctor, Tour } from '../../types';

// Type definitions for the optimized data structure
type OptimizedDoctor = [string, string, 0 | 1];
type OptimizedTour = [string, string[]];
type OptimizedData = {
  d: OptimizedDoctor[];
  t: OptimizedTour[];
  o: string[];
};

const data = db as OptimizedData;

export const INITIAL_DOCTORS: Doctor[] = data.d.map(([id, name, isCtch]) => ({
  id,
  name,
  isCtch: isCtch === 1,
}));

export const INITIAL_TOURS: Tour[] = data.t.map(([id, doctorIds]) => ({
  id,
  doctorIds,
}));

export const INITIAL_TOUR_ORDER: string[] = data.o;
