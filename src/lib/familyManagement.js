const slotChildId = slot => slot.childId ?? slot.child_id;

export function summarizeFamilyActivity({ children = [], slots = [], learningRecords = [] } = {}) {
  const childIds = new Set(children.map(child => child.id));
  const familySlots = slots.filter(slot => childIds.has(slotChildId(slot)));
  const familyRecords = learningRecords.filter(record => childIds.has(record.child_id));

  return {
    childCount: children.length,
    scheduledCount: familySlots.length,
    liveCount: familySlots.filter(slot => (slot.type ?? slot.slot_type) === 'live').length,
    completedLessons: familyRecords.filter(record => record.status === 'completed').length,
    startedLessons: familyRecords.filter(record => record.status === 'started').length,
  };
}

export function sortFamilySchedule(slots = []) {
  return [...slots].sort((left, right) =>
    Number(left.day) - Number(right.day)
    || String(left.time || '').localeCompare(String(right.time || ''))
    || String(left.id || '').localeCompare(String(right.id || ''))
  );
}
