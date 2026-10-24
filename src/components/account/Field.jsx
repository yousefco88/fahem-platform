import React, { useState } from 'react';

/**
 * حقل موحد بعنوان ظاهر دائماً + دعم إظهار/إخفاء كلمة المرور.
 * type="password" يضيف زر 👁 تلقائياً.
 */
export default function Field({ label, type = 'text', hint, ltr, children, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div className="acct-field">
      <label>
        {label}
        <div className={`control${isPassword ? ' has-eye' : ''}`}>
          {children || (
            <input
              type={isPassword && show ? 'text' : type}
              className={ltr || isPassword || type === 'email' ? 'ltr' : ''}
              {...props}
            />
          )}
          {isPassword && (
            <button
              type="button"
              className="acct-eye"
              aria-label={show ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              onClick={() => setShow(s => !s)}
            >
              {show ? '🙈' : '👁'}
            </button>
          )}
        </div>
      </label>
      {hint && <div className="acct-hint">{hint}</div>}
    </div>
  );
}

/** مؤشر قوة كلمة المرور (4 درجات بسيطة) */
export function PasswordStrength({ value }) {
  if (!value) return null;
  let score = 0;
  if (value.length >= 12) score++;
  if (value.length >= 16) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  const labels = ['ضعيفة', 'مقبولة', 'جيدة', 'قوية', 'ممتازة'];
  return (
    <>
      <div className={`acct-strength s${score}`} aria-hidden="true">
        <span /><span /><span /><span />
      </div>
      <div className="acct-hint">قوة كلمة المرور: {labels[score]}</div>
    </>
  );
}
