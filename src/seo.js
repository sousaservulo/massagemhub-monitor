function decode(s='') { return s.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,'<').replace(/&gt;/g,'>'); }
function attr(tag, name) {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return m ? decode(m[1].trim()) : '';
}
export function analyzeHtml(html, pageUrl) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/<[^>]+>/g,'').trim());
  const metas = html.match(/<meta\b[^>]*>/gi) || [];
  let description='', robots='';
  for (const tag of metas) {
    const name = attr(tag,'name').toLowerCase();
    if (name === 'description') description = attr(tag,'content');
    if (name === 'robots') robots = attr(tag,'content').toLowerCase();
  }
  const links = html.match(/<link\b[^>]*>/gi) || [];
  let canonical='';
  for (const tag of links) {
    if (attr(tag,'rel').toLowerCase().split(/\s+/).includes('canonical')) { canonical = attr(tag,'href'); break; }
  }
  if (canonical) { try { canonical = new URL(canonical, pageUrl).href; } catch {} }
  const images=[];
  for (const tag of html.match(/<img\b[^>]*>/gi) || []) {
    const src=attr(tag,'src'); if (!src || src.startsWith('data:')) continue;
    try { images.push(new URL(src,pageUrl).href); } catch {}
  }
  return { title, description, robots, canonical, images:[...new Set(images)] };
}
export function isNoindex(robots='') { return robots.split(',').map(v=>v.trim()).includes('noindex'); }
export function normalizeUrl(url) { const u=new URL(url); u.hash=''; if (u.pathname!=='/') u.pathname=u.pathname.replace(/\/$/,''); return u.href; }
