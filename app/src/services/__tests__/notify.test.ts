/// <reference types="jest" />
// Notification regression tests from the QA audit of 3 Oct 2026 (D28–D33), unchanged
// except for the extra cases at the end.
import { newFamily, newMember } from '@/domain/family';
import * as N from 'expo-notifications';
import { scheduleFamilyReminders, scheduleCookReminder } from '@/services/notify';
import { fetchWeather } from '@/services/weather';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  SchedulableTriggerInputTypes: { DAILY: 'daily', WEEKLY: 'weekly', DATE: 'date' },
}));

beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.useRealTimers());
function family() {
  const f = newFamily('QA', 'general');
  f.members=[newMember('Child',{ageBand:'child',school:{shortBreak:true,lunchBox:true,schoolDays:[3],pickup:'15:50',holidays:[]}})];
  return f;
}
const scheduled=()=> (N.scheduleNotificationAsync as jest.Mock).mock.calls.map(c=>c[0]);

test('D28 pickup +15 minutes carries to the next hour', async () => {
  await scheduleFamilyReminders(family());
  expect(scheduled().find(n=>n.trigger.type==='weekly').trigger).toMatchObject({hour:16,minute:5});
});
test('D29 rescheduling one family does not cancel every family/cook reminder', async () => {
  await scheduleFamilyReminders(family());
  expect(N.cancelAllScheduledNotificationsAsync).not.toHaveBeenCalled();
});
test('D30 school holiday does not receive a tiffin reminder', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026,9,7,9));
  const f=family();f.members[0].school!.holidays=['2026-10-07'];
  await scheduleFamilyReminders(f);
  // Weekly repeating trigger will fire on this holiday regardless of school calendar.
  expect(scheduled().some(n=>n.trigger.type==='weekly'&&n.trigger.weekday===4)).toBe(false);
});
test('D31 no-box child does not receive a tiffin reminder', async () => {
  const f=family();f.members[0].school!.shortBreak=false;f.members[0].school!.lunchBox=false;
  await scheduleFamilyReminders(f);
  expect(scheduled().filter(n=>n.trigger.type==='weekly')).toHaveLength(0);
});
test('D32 cook reminder is not scheduled after all cards are sent', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026,9,7,20));
  const f=family();f.members.push(newMember('Cook',{roles:['cook'],eatsAtHome:false}));
  f.planned.push({id:'p',date:'2026-10-08',slot:'lunch',options:['rajma_chawal'],status:'sent',pinned:false,source:'tomorrow',cookSentAt:'2026-10-07T14:00:00Z'});
  expect(await scheduleCookReminder(f)).toBeNull();
});
test('D33 9pm unconfirmed-meal digest is scheduled', async () => {
  const f=family();
  f.entries.push({id:'e',date:'2026-10-07',slot:'lunch',dishIds:['rajma_chawal'],via:'auto',reactions:[],confirmed:false,createdAt:'2026-10-07T10:00:00Z'});
  await scheduleFamilyReminders(f);
  expect(scheduled().some(n=>/unconfirmed|digest|quick check/i.test(n.content.title+' '+n.content.body))).toBe(true);
});
test('Control native tomorrow reminder uses configured time and route', async () => {
  const f=family();f.settings.tomorrowTime='20:45';await scheduleFamilyReminders(f);
  expect(scheduled()[0]).toMatchObject({content:{data:{url:'/tomorrow'}},trigger:{type:'daily',hour:20,minute:45}});
});
test('Control denied notification permission exits without scheduling', async () => {
  (N.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({granted:false});
  (N.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({granted:false});
  await scheduleFamilyReminders(family());expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('Control weather network failure has an offline fallback', async () => {
  const original=globalThis.fetch;globalThis.fetch=jest.fn(async()=>{throw new Error('offline');}) as any;
  try{expect(await fetchWeather('Bengaluru')).toBeNull();}finally{globalThis.fetch=original;}
});
test('Control rain and cold set weather context', async () => {
  const original=globalThis.fetch;globalThis.fetch=jest.fn(async()=>({ok:true,json:async()=>({current:{temperature_2m:12,weather_code:61,precipitation:1}})})) as any;
  try{expect(await fetchWeather('Bengaluru')).toEqual({rainy:true,cold:true,tempC:12});}finally{globalThis.fetch=original;}
});

test('D29 only this family\'s reminders are cancelled before rescheduling', async () => {
  const a=family(); const b=family();
  (N.getAllScheduledNotificationsAsync as jest.Mock).mockResolvedValueOnce([
    {identifier:'a1',content:{data:{familyId:a.id,kind:'tomorrow'}}},
    {identifier:'b1',content:{data:{familyId:b.id,kind:'tomorrow'}}},
    {identifier:'a-cook',content:{data:{familyId:a.id,kind:'cook'}}},
  ]);
  await scheduleFamilyReminders(a);
  expect((N.cancelScheduledNotificationAsync as jest.Mock).mock.calls.map(c=>c[0])).toEqual(['a1']);
});
test('D26 an invalid time is reported and nothing is scheduled for it', async () => {
  const f=family();f.settings.tomorrowTime='25:90';f.members[0].school!.pickup='abc';
  const problems=await scheduleFamilyReminders(f);
  expect(problems).toHaveLength(2);
  expect(N.scheduleNotificationAsync).not.toHaveBeenCalled();
});
test('D30 the school days around a holiday are still reminded, one by one', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026,9,7,9));
  const f=family();f.members[0].school!.holidays=['2026-10-14'];
  await scheduleFamilyReminders(f);
  const dates=scheduled().filter(n=>n.trigger.type==='date').map(n=>n.trigger.date.getDate());
  expect(dates).toEqual([7,21,28]);
});
test('D32 an unsent card for tomorrow does get a reminder', async () => {
  jest.useFakeTimers().setSystemTime(new Date(2026,9,7,20));
  const f=family();f.members.push(newMember('Cook',{roles:['cook'],eatsAtHome:false}));
  f.planned.push({id:'p',date:'2026-10-08',slot:'lunch',options:['rajma_chawal'],status:'planned',pinned:false,source:'tomorrow'});
  expect(await scheduleCookReminder(f)).toBe('notification-id');
});
