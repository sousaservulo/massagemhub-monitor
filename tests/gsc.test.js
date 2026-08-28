import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPeriods, normalizeTotals, totalsFromRows, percentChange, detectAlerts } from '../src/gsc/metrics.js';

test('buildPeriods usa duas janelas consecutivas de 7 dias com D-2', () => {
  const p = buildPeriods(new Date('2026-08-28T12:00:00Z'));
  assert.deepEqual(p.recent, { startDate: '2026-08-20', endDate: '2026-08-26' });
  assert.deepEqual(p.previous, { startDate: '2026-08-13', endDate: '2026-08-19' });
});

test('totais calculam posição ponderada', () => {
  const total = normalizeTotals(totalsFromRows([
    { clicks: 10, impressions: 100, position: 10 },
    { clicks: 5, impressions: 50, position: 20 }
  ]));
  assert.equal(total.clicks, 15);
  assert.equal(total.impressions, 150);
  assert.equal(total.ctr, 0.1);
  assert.equal(total.position, 40 / 3);
});

test('percentChange lida com baseline zero', () => {
  assert.equal(percentChange(0, 0), 0);
  assert.equal(percentChange(10, 0), 100);
  assert.equal(percentChange(50, 100), -50);
});

test('detectAlerts acusa quedas relevantes e ignora volume baixo', () => {
  const alerts = detectAlerts(
    { impressions: 500, clicks: 20, position: 20 },
    { impressions: 1000, clicks: 50, position: 10 }
  );
  assert.equal(alerts.length, 3);

  const lowVolume = detectAlerts(
    { impressions: 2, clicks: 0, position: 50 },
    { impressions: 5, clicks: 1, position: 10 }
  );
  assert.equal(lowVolume.length, 0);
});
