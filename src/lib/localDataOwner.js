// من يملك بيانات الأطفال والتقدم المحفوظة في هذا المتصفح؟
// adopt: بيانات زائر بلا مالك تُضم لأول حساب يدخل
// keep:  نفس الحساب
// reset: حساب مختلف — لا يرث أطفال الحساب السابق ولا يرفعهم لحسابه
export const LOCAL_OWNER_KEY = 'fahem_data_owner';

export function resolveLocalOwner(storedOwner, userId) {
  if (!storedOwner) return 'adopt';
  return storedOwner === userId ? 'keep' : 'reset';
}
