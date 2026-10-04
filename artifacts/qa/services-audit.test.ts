import { newFamily, newMember } from '@/domain/family';
const N = require('expo-notifications');
import { scheduleFamilyReminders, scheduleCookReminder } from '@/services/notify';
import { fetchWeather } from '@/services/weather';

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
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
  const original=global.fetch;global.fetch=jest.fn(async()=>{throw new Error('offline');}) as any;
  try{expect(await fetchWeather('Bengaluru')).toBeNull();}finally{global.fetch=original;}
});
test('Control rain and cold set weather context', async () => {
  const original=global.fetch;global.fetch=jest.fn(async()=>({ok:true,json:async()=>({current:{temperature_2m:12,weather_code:61,precipitation:1}})})) as any;
  try{expect(await fetchWeather('Bengaluru')).toEqual({rainy:true,cold:true,tempC:12});}finally{global.fetch=original;}
});
