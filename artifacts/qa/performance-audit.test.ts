import { newFamily, newMember } from '@/domain/family';
import { recommendPlates } from '@/domain/recommender';
import { CATALOG } from '@/domain/catalog';
import { addDays } from '@/domain/dates';
import { performance } from 'perf_hooks';
import { writeFileSync } from 'fs';
import { join } from 'path';

test('Desktop ranking benchmark records evidence for a year of household history', () => {
  const f=newFamily('Synthetic performance fixture','general');
  f.members=[newMember('Adult'),newMember('Child',{ageBand:'child'}),newMember('Senior',{ageBand:'senior'})];
  const eligible=CATALOG.filter(d=>d.diet==='veg');
  for(let i=0;i<1095;i++)f.entries.push({id:'perf'+i,date:addDays('2026-10-03',-Math.floor(i/3)),slot:['breakfast','lunch','dinner'][i%3] as any,dishIds:[eligible[i%eligible.length].id],via:'manual',reactions:[],confirmed:true,createdAt:'2026-10-03T00:00:00Z'});
  const elapsed:number[]=[];
  for(let i=0;i<35;i++){
    const start=performance.now();
    const result=recommendPlates({family:f,date:'2026-10-04',slot:'dinner',chips:['quick'],available:['okra']});
    elapsed.push(performance.now()-start);
    expect(result.length).toBeGreaterThan(0);
  }
  const samples=elapsed.slice(5).sort((a,b)=>a-b);
  const r={environment:'Desktop Node, not a mobile-device NFR certification',entries:f.entries.length,samples:samples.length,medianMs:samples[Math.floor(samples.length/2)],p95Ms:samples[Math.floor(samples.length*0.95)],maxMs:Math.max(...samples)};
  writeFileSync(join(__dirname,'performance-results.json'),JSON.stringify(r,null,2));
});
