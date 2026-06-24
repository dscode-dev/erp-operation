import { buildDemoSnapshots } from '../src/seeds/demo/demo-data.factory';

describe('buildDemoSnapshots', () => {
  const now = new Date('2026-06-24T12:00:00.000Z');

  it('builds all reserved integration datasets with realistic names', () => {
    const snapshots = buildDemoSnapshots(now);
    expect(Object.keys(snapshots).sort()).toEqual(
      ['demo.dashboard.v1', 'demo.equipment.v1', 'demo.finance.v1', 'demo.schedule.v1'].sort(),
    );
    expect(JSON.stringify(snapshots)).toContain('Hospital Santa Clara');
    expect(JSON.stringify(snapshots)).toContain('Chiller');
    expect(JSON.stringify(snapshots)).not.toContain('Cliente Teste');
  });

  it('is deterministic for a fixed reference date', () => {
    expect(buildDemoSnapshots(now)).toEqual(buildDemoSnapshots(now));
  });
});
