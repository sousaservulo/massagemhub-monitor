function formatDuration(ms) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

export function buildReport(report) {
  const critical = report.issues.filter(i => i.level === 'critical');
  const warnings = report.issues.filter(i => i.level === 'warning');
  const avgMs = report.pageResults.length
    ? Math.round(report.pageResults.reduce((sum, p) => sum + p.durationMs, 0) / report.pageResults.length)
    : 0;

  const header = critical.length > 0
    ? 'MASSAGEMHUB MONITOR — ALERTA CRÍTICO'
    : warnings.length > 0
      ? 'MASSAGEMHUB MONITOR — ATENÇÃO'
      : 'MASSAGEMHUB MONITOR — TUDO OK';

  const lines = [
    header,
    '',
    `Páginas verificadas: ${report.pageResults.length}`,
    `Sitemap: ${report.sitemapOk ? 'OK' : 'FALHA'} (${report.sitemapUrls} URLs)` ,
    `Robots: ${report.robotsOk ? 'OK' : 'FALHA'}`,
    `Resposta média: ${formatDuration(avgMs)}`,
    `Críticos: ${critical.length} | Avisos: ${warnings.length}`
  ];

  if (report.issues.length > 0) {
    lines.push('', 'Problemas encontrados:');
    for (const issue of report.issues.slice(0, 20)) {
      lines.push(`${issue.level === 'critical' ? '[CRÍTICO]' : '[AVISO]'} ${issue.message}`);
      lines.push(issue.url);
    }
    if (report.issues.length > 20) lines.push(`... e mais ${report.issues.length - 20} problema(s).`);
  } else {
    lines.push('', 'Nenhuma anomalia detectada nas páginas monitoradas.');
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
  lines.push('', `Execução: ${formatter.format(new Date(report.checkedAt))}`);

  return lines.join('\n');
}
