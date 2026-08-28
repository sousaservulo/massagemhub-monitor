function dateOnly(date) {
  return date.toISOString().slice(0, 10);
}

export function buildPeriods(now = new Date()) {
  // Search Console costuma consolidar dados com atraso. Terminamos em D-2.
  const recentEnd = new Date(now);
  recentEnd.setUTCDate(recentEnd.getUTCDate() - 2);
  const recentStart = new Date(recentEnd);
  recentStart.setUTCDate(recentStart.getUTCDate() - 6);
  const previousEnd = new Date(recentStart);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - 6);

  return {
    recent: { startDate: dateOnly(recentStart), endDate: dateOnly(recentEnd) },
    previous: { startDate: dateOnly(previousStart), endDate: dateOnly(previousEnd) }
  };
}

export function totalsFromRows(rows = []) {
  return rows.reduce((acc, row) => {
    acc.clicks += Number(row.clicks || 0);
    acc.impressions += Number(row.impressions || 0);
    acc.positionWeighted += Number(row.position || 0) * Number(row.impressions || 0);
    return acc;
  }, { clicks: 0, impressions: 0, positionWeighted: 0 });
}

export function normalizeTotals(raw) {
  return {
    clicks: raw.clicks,
    impressions: raw.impressions,
    ctr: raw.impressions ? raw.clicks / raw.impressions : 0,
    position: raw.impressions ? raw.positionWeighted / raw.impressions : 0
  };
}

export function percentChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

export function detectAlerts(recent, previous, options = {}) {
  const minImpressions = Number(options.minImpressions ?? 50);
  const minClicks = Number(options.minClicks ?? 10);
  const impressionsDrop = Number(options.impressionsDrop ?? 40);
  const clicksDrop = Number(options.clicksDrop ?? 50);
  const positionWorseBy = Number(options.positionWorseBy ?? 5);
  const alerts = [];

  const impChange = percentChange(recent.impressions, previous.impressions);
  if (previous.impressions >= minImpressions && impChange <= -impressionsDrop) {
    alerts.push(`Impressões caíram ${Math.abs(impChange).toFixed(1)}% em relação aos 7 dias anteriores`);
  }

  const clickChange = percentChange(recent.clicks, previous.clicks);
  if (previous.clicks >= minClicks && clickChange <= -clicksDrop) {
    alerts.push(`Cliques caíram ${Math.abs(clickChange).toFixed(1)}% em relação aos 7 dias anteriores`);
  }

  const positionDelta = recent.position - previous.position;
  if (previous.impressions >= minImpressions && recent.position > 0 && previous.position > 0 && positionDelta >= positionWorseBy) {
    alerts.push(`Posição média piorou ${positionDelta.toFixed(1)} posições`);
  }

  return alerts;
}
