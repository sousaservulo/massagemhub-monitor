function statusLabel(status) {
  if (status === 'ok') return '[OK]';
  if (status === 'skipped') return '[PULADO]';
  return '[FALHA]';
}

export function buildE2EReport(report) {
  const failures = report.results.filter(item => item.status === 'failed');
  const skipped = report.results.filter(item => item.status === 'skipped');
  const ok = report.results.filter(item => item.status === 'ok');

  const lines = [
    failures.length ? 'MASSAGEMHUB E2E — ALERTA' : 'MASSAGEMHUB E2E — TUDO OK',
    '',
    `Testes OK: ${ok.length}`,
    `Falhas: ${failures.length}`,
    `Pulados: ${skipped.length}`,
    ''
  ];

  for (const item of report.results) {
    lines.push(`${statusLabel(item.status)} ${item.name}`);
    if (item.message) lines.push(`  ${item.message}`);
  }

  if (skipped.length) {
    lines.push('', 'Testes autenticados são pulados quando os Secrets das contas de monitoramento não estão configurados.');
  }

  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    dateStyle: 'short',
    timeStyle: 'medium'
  });
  lines.push('', `Execução: ${formatter.format(new Date(report.checkedAt))}`);

  return lines.join('\n');
}
