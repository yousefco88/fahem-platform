// يحوّل رابط فيديو الدرس إلى طريقة عرض آمنة: iframe لـ YouTube/Vimeo، أو <video> لملف مباشر.
// أي رابط غير https أو من مضيف غير معروف يُرفض (null) بدل عرضه.
export function resolveVideo(url) {
  if (typeof url !== 'string') return null;
  let u;
  try { u = new URL(url.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').replace(/^m\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else { const m = u.pathname.match(/^\/(embed|shorts|live)\/([\w-]{6,})/); if (m) id = m[2]; }
  }
  if (id && /^[\w-]{6,20}$/.test(id)) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${id}` };
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const m = u.pathname.match(/(\d{5,})/);
    if (m) return { kind: 'iframe', src: `https://player.vimeo.com/video/${m[1]}` };
    return null;
  }
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname) || host.endsWith('.supabase.co')) return { kind: 'video', src: u.href };
  return null;
}

// رابط PDF/ملف: https فقط
export function safeFileUrl(url) {
  try { const u = new URL(String(url).trim()); return u.protocol === 'https:' ? u.href : null; } catch { return null; }
}
