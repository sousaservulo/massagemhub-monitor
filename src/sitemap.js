import { request } from './http.js';
function extractLocs(xml) { return [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map(m => m[1].replace(/&amp;/g,'&').trim()); }
export async function inspectSitemap(baseUrl, timeoutMs) {
  const rootUrl=`${baseUrl}/sitemap.xml`; const root=await request(rootUrl,{timeoutMs});
  if(!root.ok) return {ok:false,rootUrl,status:root.status,error:root.error,sitemapFiles:[],urls:[],childErrors:[]};
  const locs=extractLocs(root.body); const isIndex=/<sitemapindex\b/i.test(root.body);
  if(!isIndex) return {ok:locs.length>0,rootUrl,status:root.status,sitemapFiles:[],urls:locs,childErrors:[]};
  const urls=[]; const childErrors=[];
  for(const sitemapUrl of locs){ const child=await request(sitemapUrl,{timeoutMs}); if(!child.ok){childErrors.push({url:sitemapUrl,status:child.status,error:child.error});continue;} urls.push(...extractLocs(child.body)); }
  return {ok:childErrors.length===0 && locs.length>0,rootUrl,status:root.status,sitemapFiles:locs,urls:[...new Set(urls)],childErrors};
}
export function pickSampleUrls(urls,limits={}){ return [...new Set([
  ...urls.filter(u=>/\/terapeuta\/[a-z]{2}\//i.test(u)).slice(0,limits.therapists||0),
  ...urls.filter(u=>/\/clinica\/[a-z]{2}\//i.test(u)).slice(0,limits.clinics||0),
  ...urls.filter(u=>/\/guia-de-massagens\/.+/i.test(u)).slice(0,limits.guidePages||0)
])]; }
