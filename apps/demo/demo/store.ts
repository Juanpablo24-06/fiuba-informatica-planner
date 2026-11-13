import catalog from '../data/subjects.json';
import type { Subject, Term, Enrollment, Event, EnrollmentScheduleDay } from '../modules/academic/domain/types';
import type { PlannerScenario, PlannerSelection } from '../modules/planning/domain/types';

export type DemoState = { version: 1; subjects: Subject[]; terms: Term[]; enrollments: Enrollment[]; events: Event[]; prerequisites: {subject_id:string;prerequisite_id:string}[]; scenarios: PlannerScenario[] };
const KEY = 'fiuba-public-demo-v1';
export const DEMO_CHANGE = 'fiuba:demo-change';
const uuid = (n:number) => `00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
export function createSeed(): DemoState {
  const now = new Date();
  const year = now.getFullYear();
  const half = now.getMonth() < 6 ? 1 : 2;
  const subjects: Subject[] = catalog.map((s,i) => ({...s,id:uuid(i+1),description:`Materia del recorrido de Ingeniería en Informática. Contenido de demostración.`,notes:null,useful_links:[],custom_fields:[],deleted_at:null,term_order:i+1}));
  const terms: Term[] = [
    {id:uuid(101),label:`${year}-${half}`,start_date:`${year}-${half===1?'03':'08'}-01`,end_date:`${year}-${half===1?'07':'12'}-20`,is_current:true},
    {id:uuid(102),label:`${year}-${half===1?'0':'1'}`,start_date:`${year}-03-01`,end_date:`${year}-07-20`,is_current:false},
    {id:uuid(103),label:`${year-1}-2`,start_date:`${year-1}-08-01`,end_date:`${year-1}-12-20`,is_current:false}
  ];
  const colors = ['#dc775d','#6b92b8','#7caa90','#a18ac1'];
  const days: EnrollmentScheduleDay[][] = [['lun','jue'],['mar','vie'],['mie'],['sab']];
  const activeIndices = [11,10,9,12];
  const enrollments: Enrollment[] = subjects.slice(0,9).map((subject,i)=>({id:uuid(201+i),subject_id:subject.id,term_id:terms[i<6?2:1].id,status:'aprobado',color:colors[i%4],notes:'Trayectoria ficticia de ejemplo.',schedule:[],subject,term:terms[i<6?2:1]}));
  activeIndices.forEach((index,i)=>{
    const subject = subjects[index];
    enrollments.push({id:uuid(220+i),subject_id:subject.id,term_id:terms[0].id,status:i===3?'final_pendiente':'cursando',color:colors[i],notes:'Comisión de ejemplo · Datos ficticios.',schedule:days[i].map(day=>({day,start_time:i===2?'14:00':'18:00',end_time:i===2?'17:00':'21:00',location:`Aula ${301+i} · Sede de ejemplo`,class_type:'theory'})),subject,term:terms[0]});
  });
  const events: Event[] = [];
  activeIndices.forEach((_,i)=>{
    const enrollment = enrollments[9+i];
    for(let j=0;j<3;j++) {
      const date = new Date(now); date.setDate(now.getDate()+2+i*2+j*7); date.setHours(18,0,0,0);
      events.push({id:uuid(300+i*3+j),enrollment_id:enrollment.id,type:j===0?'parcial':j===1?'tp':'final',title:j===0?`Segundo parcial · ${enrollment.subject.name}`:j===1?'Entrega del trabajo práctico':'Mesa de final',description:'Actividad ficticia para explorar la agenda.',starts_at:date.toISOString(),ends_at:new Date(date.getTime()+7200000).toISOString(),status:'pendiente',grade:null,attempt:1,links:[],enrollment});
    }
  });
  const prerequisites = catalog.flatMap((s,i)=>(s.prerequisites??[]).flatMap(name=>{const p=subjects.find(x=>x.name===name);return p?[{subject_id:subjects[i].id,prerequisite_id:p.id}]:[];}));
  return {version:1,subjects,terms,enrollments,events,prerequisites,scenarios:[]};
}
let memory: DemoState | undefined;
export function getState():DemoState {
  if(memory) return memory;
  try { const saved=JSON.parse(localStorage.getItem(KEY)??'null'); if(saved?.version===1&&Array.isArray(saved.subjects)&&Array.isArray(saved.terms)&&Array.isArray(saved.enrollments)&&Array.isArray(saved.events)) memory=saved; } catch { /* Use seed if storage is unavailable or invalid. */ }
  if (!memory) { memory = createSeed(); try { localStorage.setItem(KEY, JSON.stringify(memory)); } catch { /* Session-only fallback. */ } }
  return memory;
}
export function saveState(){try{localStorage.setItem(KEY,JSON.stringify(getState()));}catch{/* The session remains usable without durable storage. */}}
export function resetState(){memory=createSeed();saveState();for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&(key.startsWith('planner:')||key==='academic:selected-term'))localStorage.removeItem(key);}window.dispatchEvent(new Event(DEMO_CHANGE));}
export function getRole():'admin'|'viewer'|null {try{const role=sessionStorage.getItem('fiuba-demo-role');return role==='admin'||role==='viewer'?role:null;}catch{return null;}}
export function setRole(role:'admin'|'viewer'|null){if(role)sessionStorage.setItem('fiuba-demo-role',role);else sessionStorage.removeItem('fiuba-demo-role');window.dispatchEvent(new Event(DEMO_CHANGE));}
export function enrollmentsFor(termId:string){const s=getState();return s.enrollments.filter(e=>e.term_id===termId&&s.subjects.some(x=>x.id===e.subject_id&&!x.deleted_at)).map(e=>({...e,subject:s.subjects.find(x=>x.id===e.subject_id)!,term:s.terms.find(t=>t.id===e.term_id)??null}));}
export function eventsFor(termId?:string){const s=getState();return s.events.flatMap(e=>{const raw=s.enrollments.find(x=>x.id===e.enrollment_id);if(!raw||termId&&raw.term_id!==termId)return [];const enrollment=enrollmentsFor(raw.term_id).find(x=>x.id===raw.id);return enrollment?[{...e,enrollment}]:[];}).sort((a,b)=>a.starts_at.localeCompare(b.starts_at));}
export function statusMap(){const s=getState();const map=new Map<string,{status:string;color:string|null;termLabel?:string|null}>();for(const term of [...s.terms].reverse()){for(const e of enrollmentsFor(term.id))map.set(e.subject_id,{status:e.status,color:e.color,termLabel:term.label});}return map;}
export function scenarioFor(termId:string){const s=getState();let scenario=s.scenarios.find(x=>x.termId===termId);if(!scenario){scenario={id:crypto.randomUUID(),termId,profileKey:'default',name:'Mi plan de ejemplo',position:0,lifecycle:'draft',confirmedAt:null,selections:enrollmentsFor(termId).map((e,i):PlannerSelection=>({id:uuid(600+i),scenarioId:'',kind:'course',subjectId:e.subject_id,enrollmentId:e.id,title:e.subject.name,code:e.subject.code,statusSnapshot:e.status,alignment:'linked',color:e.color,notes:null,slots:e.schedule,source:'enrollment',confirmedEnrollmentId:null,offerIds:[]}))};scenario.selections.forEach(x=>x.scenarioId=scenario!.id);s.scenarios.push(scenario);saveState();}return scenario;}
