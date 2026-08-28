function splitMessage(text, maxLength = 3900) {
  if (text.length <= maxLength) return [text];
  const chunks = [];
  let remaining = text;
  while (remaining.length > maxLength) {
    let cut = remaining.lastIndexOf('\n', maxLength);
    if (cut < maxLength * 0.5) cut = maxLength;
    chunks.push(remaining.slice(0, cut));
    remaining = remaining.slice(cut).replace(/^\n/, '');
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_MONITOR_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  const threadId = process.env.TELEGRAM_MONITOR_TOPIC_ID;

  if (!token || !chatId) {
    console.warn('Telegram não configurado: defina TELEGRAM_BOT_TOKEN e TELEGRAM_MONITOR_CHAT_ID.');
    return false;
  }

  for (const chunk of splitMessage(text)) {
    const payload = {
      chat_id: chatId,
      text: chunk,
      disable_web_page_preview: true
    };
    if (threadId) payload.message_thread_id = Number(threadId);

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram respondeu ${response.status}: ${body}`);
    }
  }

  return true;
}
