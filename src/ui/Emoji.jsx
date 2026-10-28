import React from 'react';
import { FLUENT_BASE, FLUENT_EMOJI } from './fluentEmoji';

const RE = /([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?(?:\u{200D}[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?)*)/u;

/**
 * يعرض إيموجي بصورة Fluent Emoji 3D موحّدة على كل الأجهزة.
 * - <Emoji>🏠</Emoji>            → صورة واحدة
 * - <Emoji>🏠 الرئيسية</Emoji>   → يستبدل الإيموجي داخل النص ويترك الباقي كما هو
 * - الإيموجي غير المعروف يُعرض كنص عادي (لا يُكسر شيء)
 */
export default function Emoji({ children, size, className = '', style }) {
  if (children == null) return null;
  const text = Array.isArray(children) ? children.join('') : String(children);
  const parts = text.split(RE);
  if (parts.length === 1) return text;
  const cls = `fe${className ? ` ${className}` : ''}`;
  const st = size ? { width: size, height: size, ...style } : style;
  return parts.map((p, i) => {
    if (!p) return null;
    const file = FLUENT_EMOJI[p] || FLUENT_EMOJI[p.replace(/\uFE0F/g, '')];
    if (!file) return <React.Fragment key={i}>{p}</React.Fragment>;
    return (
      <img key={i} className={cls} style={st} src={FLUENT_BASE + 'assets/' + encodeURI(file)} alt={p} loading="lazy" decoding="async" draggable="false"
        onError={(e) => { e.currentTarget.replaceWith(document.createTextNode(p)); }} />
    );
  });
}
