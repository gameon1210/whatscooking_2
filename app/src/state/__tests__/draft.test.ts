/// <reference types="jest" />
import { newFamily, newMember } from '@/domain/family';
import { draftDay } from '@/state/draft';

test('a day plan never repeats the top dish across slots, and includes both tiffins', () => {
  const f = newFamily('T', 'general');
  f.members = [
    newMember('Utkarsh', { roles: ['planner', 'eater'] }),
    newMember('Aarav', { ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '15:30', holidays: [] } }),
    newMember('Dadi', { ageBand: 'senior', jain: true, noOnionGarlic: true }),
  ];
  f.favourites = ['idli_sambar', 'poha', 'dal_chawal', 'rajma_chawal'];
  const rows = draftDay(f, '2026-10-07');
  const tops = rows.filter((r) => !r.memberId || r.slot.startsWith('tiffin')).map((r) => r.options[0]);
  expect(new Set(tops).size).toBe(tops.length);
  expect(rows.filter((r) => r.slot.startsWith('tiffin'))).toHaveLength(2);
  // favourites survive a Jain member via a separate plate
  expect(rows.some((r) => r.memberId === f.members[2].id)).toBe(true);
});
