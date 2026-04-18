import { Doctor, Tour } from './types';

// The START_DATE is set to midnight in the user's local timezone.
// This is crucial to ensure it aligns with the calendar dates, which are also created in local time.
// Using new Date(year, month, day) avoids timezone ambiguity. Month is 0-indexed, so 10 is November.
export const START_DATE = new Date(2025, 10, 1);

export const INITIAL_DOCTORS: Doctor[] = [
  { id: 'doc-a', name: 'Dr. A', isCtch: false },
  { id: 'doc-b', name: 'Dr. B', isCtch: false },
  { id: 'doc-c', name: 'Dr. C', isCtch: false },
  { id: 'doc-d', name: 'Dr. D', isCtch: false },
  { id: 'doc-e', name: 'Dr. E', isCtch: false },
  { id: 'doc-f', name: 'Dr. F', isCtch: false },
  { id: 'doc-g', name: 'Dr. G', isCtch: false },
  { id: 'doc-h', name: 'Dr. H', isCtch: false },
  { id: 'doc-i', name: 'Dr. I', isCtch: true },
  { id: 'doc-j', name: 'Dr. J', isCtch: true },
  { id: 'doc-k', name: 'Dr. K', isCtch: true },
  { id: 'doc-l', name: 'Dr. L', isCtch: true },
  { id: 'doc-m', name: 'Dr. M', isCtch: true },
  { id: 'doc-n', name: 'Dr. N', isCtch: true },
  { id: 'doc-o', name: 'Dr. O', isCtch: true },
  { id: 'doc-p', name: 'Dr. P', isCtch: true },
];

export const INITIAL_TOURS: Tour[] = [
  {
    id: 'tour-1',
    doctorIds: ['doc-a', 'doc-b', 'doc-c', 'doc-d'],
  },
  {
    id: 'tour-2',
    doctorIds: ['doc-e', 'doc-f', 'doc-g', 'doc-h'],
  },
  {
    id: 'tour-3',
    doctorIds: ['doc-i', 'doc-j', 'doc-k', 'doc-l'],
  },
  {
    id: 'tour-4',
    doctorIds: ['doc-m', 'doc-n', 'doc-o', 'doc-p'],
  },
];

export const INITIAL_TOUR_ORDER: string[] = ['tour-1', 'tour-2', 'tour-3', 'tour-4'];
