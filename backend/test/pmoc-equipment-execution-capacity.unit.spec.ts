import 'reflect-metadata';

import { RecurrenceFrequency } from '../src/modules/maintenance-planning/dto/maintenance-planning.dto';
import { RecurringEngine } from '../src/modules/maintenance-planning/recurring-engine.service';

describe('PMOC execution capacity per equipment', () => {
  const recurrence = new RecurringEngine();
  const monthly = { frequency: RecurrenceFrequency.MONTHLY, interval: 1 };

  it('projects twelve independent monthly slots for a one-year coverage', () => {
    const start = new Date('2026-08-01T00:00:00.000Z');
    const end = new Date('2027-08-01T00:00:00.000Z');

    expect(recurrence.countBefore(monthly, start, end)).toBe(12);
    expect(recurrence.occurrenceAt(monthly, start, 1)).toEqual(start);
    expect(recurrence.occurrenceAt(monthly, start, 12)).toEqual(
      new Date('2027-07-01T00:00:00.000Z'),
    );
  });

  it('does not include an occurrence scheduled exactly at the coverage end', () => {
    const start = new Date('2026-08-01T00:00:00.000Z');
    const end = new Date('2027-02-01T00:00:00.000Z');

    expect(recurrence.countBefore(monthly, start, end)).toBe(6);
  });
});
