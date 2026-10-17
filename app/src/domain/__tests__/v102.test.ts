// 1.0.2: the feedback rule's validators, flexible times, and no phone numbers.
import { buildPayload } from '@/domain/cookcard';
import { normalizeTime, validHHMM } from '@/domain/dates';
import { memberProblem, newFamily, newMember } from '@/domain/family';
import { whatsappLink } from '@/domain/links';
import type { Family } from '@/domain/types';
import { migrateFamilyV3 } from '@/state/migrate';

describe('normalizeTime reads times the way people type them', () => {
  test.each([
    ['15:30', '15:30'],
    ['3:30 pm', '15:30'],
    ['3.30pm', '15:30'],
    ['3:30PM', '15:30'],
    ['1530', '15:30'],
    ['930', '09:30'],
    ['3pm', '15:00'],
    ['12 am', '00:00'],
    ['12:15 pm', '12:15'],
    ['9', '09:00'],
    [' 21:00 ', '21:00'],
    ['7:05 a.m.', '07:05'],
  ])('%s -> %s', (input, out) => {
    expect(normalizeTime(input)).toBe(out);
    expect(validHHMM(out)).toBe(true);
  });
  test.each(['', 'soon', '25:00', '13 pm', '0 am', '15:75', '3:3'])('rejects %p', (input) => {
    expect(normalizeTime(input)).toBeNull();
  });
});

describe('memberProblem names the one thing blocking Save', () => {
  test('a name is the only required field', () => {
    expect(memberProblem(newMember(''))).toMatch(/name/i);
    expect(memberProblem(newMember('  '))).toMatch(/name/i);
    expect(memberProblem(newMember('Aarav'))).toBeNull();
  });
  test('a school-goer needs a real pick-up time, and says so', () => {
    const kid = newMember('Aarav', { ageBand: 'child', school: { shortBreak: true, lunchBox: true, schoolDays: [1, 2, 3, 4, 5], pickup: '3:30 pm', holidays: [] } });
    expect(memberProblem(kid)).toMatch(/pick-up time/i);
    kid.school!.pickup = normalizeTime('3:30 pm')!;
    expect(memberProblem(kid)).toBeNull();
  });
});

describe('no phone numbers (1.0.2)', () => {
  test('WhatsApp links never carry a number, so the user picks the chat', () => {
    expect(whatsappLink('hi there')).toBe('https://wa.me/?text=hi%20there');
  });

  test('migration deletes saved numbers and consent flags', () => {
    const f = newFamily('Test', 'south');
    const cook = newMember('Lakshmi', { roles: ['cook'] });
    Object.assign(cook, { whatsapp: '9876543210', whatsappConsent: true });
    f.members = [newMember('Priya'), cook];
    Object.assign(f.settings, { plannerPhone: '9999999999' });
    migrateFamilyV3(f);
    const raw = JSON.stringify(f);
    expect(raw).not.toMatch(/whatsapp|plannerPhone|9876543210|9999999999/);
    // safe to run twice
    expect(() => migrateFamilyV3(f)).not.toThrow();
  });

  test('a Cook Card payload has no phone field', () => {
    const f: Family = newFamily('Test', 'south');
    const cook = newMember('Lakshmi', { roles: ['cook'] });
    f.members = [newMember('Priya'), cook];
    const p = { id: 'p1', date: '2026-10-21', slot: 'lunch' as const, options: ['dal_chawal'], pinned: false, status: 'planned' as const, source: 'tomorrow' as const };
    const payload = buildPayload(f, cook, '2026-10-21', [p]);
    expect('ph' in payload).toBe(false);
  });
});
