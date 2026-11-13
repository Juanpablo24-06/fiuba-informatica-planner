import { getState, getRole, setRole, saveState, enrollmentsFor, eventsFor, scenarioFor, statusMap, DEMO_CHANGE } from './store';
import { plannerEntriesFromEnrollments } from '../modules/planning/domain/types';
import { buildPlannerSubjectOptions } from '../lib/planner/academic-status';
import type { Subject } from '../lib/types';
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
const error=(message:string,status=400)=>json({error:message},status);
// All original component requests are resolved locally. There is deliberately no native fetch fallback.
export async function demoFetch(input:RequestInfo|URL,options?:RequestInit):Promise<Response>{
  try{
    const request=input instanceof Request?input:null;
    const url=new URL(request?.url??String(input),location.origin);
    if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return error('Las conexiones externas están deshabilitadas en esta demo.',403);
    const method=(options?.method??request?.method??'GET').toUpperCase();
    const text=typeof options?.body==='string'?options.body:request?await request.text():'';
    const body=text?JSON.parse(text):{};
    const parts=url.pathname.split('/').filter(Boolean).slice(1);
    const [resource,id,action,childId,childAction]=parts;
    const s=getState();
    if(resource==='auth'&&id==='logout'){setRole(null);return json({ok:true});}
    if(!getRole())return error('Seleccioná un rol para continuar.',401);
    if(['ai','chat','calendar','mcp','gpt-actions','openapi','cron'].includes(resource))return error('Integración deshabilitada en la demo pública.',403);
    if(method!=='GET'&&getRole()!=='admin')return error('El visualizador tiene acceso de solo lectura.',403);
    const commit=(data:unknown)=>{saveState();if(resource!=="planner"||childId==="confirm")window.dispatchEvent(new Event(DEMO_CHANGE));return json(data);};
    if(resource==='subjects'){
      let subject=s.subjects.find(x=>x.id===id);
      if(action==='prerequisites'){
        if(!subject)return error('Materia inexistente.',404);
        if(method==='PUT'){
          const prerequisiteIds=Array.isArray(body.prerequisiteIds)?body.prerequisiteIds:[];
          const unlockIds=Array.isArray(body.unlockIds)?body.unlockIds:[];
          if([...prerequisiteIds,...unlockIds].some(x=>!s.subjects.some(y=>y.id===x)||x===id))return error('Relaciones inválidas.');
          s.prerequisites=s.prerequisites.filter(x=>x.subject_id!==id&&x.prerequisite_id!==id);
          s.prerequisites.push(...prerequisiteIds.map((p:string)=>({subject_id:id!,prerequisite_id:p})),...unlockIds.map((u:string)=>({subject_id:u,prerequisite_id:id!})));
        }
        return commit({prerequisiteIds:s.prerequisites.filter(x=>x.subject_id===id).map(x=>x.prerequisite_id),unlockIds:s.prerequisites.filter(x=>x.prerequisite_id===id).map(x=>x.subject_id)});
      }
      if(action==='restore'&&subject){subject.deleted_at=null;return commit({subject});}
      if(method==='GET')return json(id?{subject}:{subjects:s.subjects.filter(x=>!x.deleted_at)});
      if(method==='DELETE'&&subject){subject.deleted_at=new Date().toISOString();return commit({ok:true});}
      if(method==='POST'||method==='PATCH'){
        if(method==='PATCH'&&!subject)return error('Materia inexistente.',404);
        if((method==='POST'||body.name!==undefined)&&!String(body.name??'').trim())return error('El nombre es obligatorio.');
        if(method==='POST'){subject={id:crypto.randomUUID(),name:'',code:null,credits:null,weekly_hours:null,total_hours:null,term_suggested:null,cycle:'segundo',type:'obligatoria',requirements:null,template:null,deleted_at:null};s.subjects.push(subject);}
        Object.assign(subject!,body,{id:subject!.id});return commit({subject});
      }
    }
    if(resource==='terms'){
      let term=s.terms.find(x=>x.id===id);
      if(method==='GET')return json({terms:s.terms});
      if(method==='DELETE'&&term){s.terms=s.terms.filter(x=>x.id!==id);const removed=s.enrollments.filter(x=>x.term_id===id).map(x=>x.id);s.enrollments=s.enrollments.filter(x=>x.term_id!==id);s.events=s.events.filter(x=>!removed.includes(x.enrollment_id));s.scenarios=s.scenarios.filter(x=>x.termId!==id);if(term.is_current&&s.terms[0])s.terms[0].is_current=true;return commit({ok:true});}
      if(method==='PATCH'||method==='POST'){
        if(method==='PATCH'&&!term)return error('Cuatrimestre inexistente.',404);
        if(method==='POST'){if(!String(body.label??'').trim())return error('Ingresá el nombre del cuatrimestre.');term={id:crypto.randomUUID(),label:'',start_date:null,end_date:null,is_current:false};s.terms.unshift(term);}
        if(body.is_current)s.terms.forEach(t=>t.is_current=false);
        Object.assign(term!,body,{id:term!.id});return commit({term});
      }
    }
    if(resource==='enrollments'){
      const termId=url.searchParams.get('termId');
      if(method==='GET')return json({enrollments:termId?enrollmentsFor(termId):s.terms.flatMap(x=>enrollmentsFor(x.id))});
      let enrollment=s.enrollments.find(x=>x.id===id);
      if(method==='DELETE'&&enrollment){s.enrollments=s.enrollments.filter(x=>x.id!==id);s.events=s.events.filter(x=>x.enrollment_id!==id);return commit({ok:true});}
      if(method==='POST'){
        const subject=s.subjects.find(x=>x.id===body.subject_id);const term=s.terms.find(x=>x.id===body.term_id);
        if(!subject||!term)return error('Seleccioná una materia y un cuatrimestre válidos.');
        if(s.enrollments.some(x=>x.term_id===term.id&&x.subject_id===subject.id))return error('La materia ya está en ese cuatrimestre.');
        enrollment={id:crypto.randomUUID(),subject_id:subject.id,term_id:term.id,status:'cursando',schedule:[],color:'#dc775d',notes:null,subject,term,...body};s.enrollments.push(enrollment!);
      }else if(method==='PATCH'&&enrollment)Object.assign(enrollment,body,{id:enrollment.id});
      if(enrollment)return commit({enrollment:enrollmentsFor(enrollment.term_id).find(x=>x.id===enrollment!.id)});
    }
    if(resource==='events'){
      if(method==='GET')return json({events:eventsFor(url.searchParams.get('termId')??undefined)});
      let event=s.events.find(x=>x.id===id);
      if(method==='DELETE'&&event){s.events=s.events.filter(x=>x.id!==id);return commit({ok:true});}
      if(method==='POST'){
        if(!s.enrollments.some(x=>x.id===body.enrollment_id)||!Number.isFinite(Date.parse(body.starts_at)))return error('Cursada y fecha válidas obligatorias.');
        event={id:crypto.randomUUID(),type:'parcial',title:null,description:null,ends_at:null,status:'pendiente',grade:null,attempt:1,links:[],...body};s.events.push(event!);
      }else if(method==='PATCH'&&event)Object.assign(event,body,{id:event.id});
      if(event)return commit({event:eventsFor().find(x=>x.id===event!.id)});
    }
    if(resource==='admin'&&id==='bootstrap-cbc')return json({loaded:true,approved:6,total:6,term:s.terms.at(-1)?.label});
    if(resource==='planner'){
      const termId=url.searchParams.get('termId')??body.termId??s.terms.find(x=>x.is_current)?.id;
      if(!id&&method==='GET'){
        if(!termId)return json({entries:[],scenarios:[]});
        const active=scenarioFor(termId);
        return json({termId,entries:plannerEntriesFromEnrollments(enrollmentsFor(termId),s.terms.find(x=>x.id===termId)?.start_date??new Date().toISOString().slice(0,10)),scenarios:s.scenarios.filter(x=>x.termId===termId),activeScenarioId:(s.scenarios.find(x=>x.termId===termId&&x.lifecycle!=='archived')??active).id,subjectOptions:buildPlannerSubjectOptions({subjects:s.subjects.filter(x=>!x.deleted_at),prerequisites:s.prerequisites,latestStatuses:statusMap()})});
      }
      if(id==='offers'){
        const dayNames:Record<string,string>={lun:'Lunes',mar:'Martes',mie:'Miércoles',jue:'Jueves',vie:'Viernes',sab:'Sábado',dom:'Domingo'};
        const offers=termId?enrollmentsFor(termId).flatMap((enrollment,index)=>[0,1].map(alternative=>({
          raw:`demo-offer-${enrollment.id}-${alternative}`,name:`Comisión ${index+1}${alternative?'B':'A'} · Ejemplo`,commission:`Comisión ${index+1}${alternative?'B':'A'} · Ejemplo`,
          schedule:null,activity:enrollment.subject.name,code:enrollment.subject.code,shift:alternative?'Mañana':'Tarde',capacity:'30 lugares ficticios',instance:'Presencial',location:'Sede de ejemplo',teachers:['Equipo docente de ejemplo'],
          slots:enrollment.schedule.map(slot=>({classType:'Teórica',day:dayNames[slot.day],startTime:alternative?'09:00':slot.start_time,endTime:alternative?'12:00':slot.end_time,room:slot.location}))
        }))):[];
        return method==='GET'?json({offers}):error('La importación externa no está habilitada. Agregá las materias manualmente.');
      }
      if(id==='scenarios'){
        let scenario=s.scenarios.find(x=>x.id===action);
        if(method==='POST'&&!action){if(!s.terms.some(x=>x.id===body.termId))return error('Cuatrimestre inválido.');scenario={id:crypto.randomUUID(),termId:body.termId,profileKey:'default',name:body.name||'Nuevo plan',position:s.scenarios.length,lifecycle:'draft',confirmedAt:null,selections:[]};s.scenarios.push(scenario);return commit({scenario});}
        if(!scenario)return error('Plan inexistente.',404);
        if(!childId){if(method==='PATCH'){if(body.action==='empty'){scenario.selections=[];scenario.lifecycle='draft';scenario.confirmedAt=null;}else Object.assign(scenario,body,{id:scenario.id});}if(method==='DELETE')s.scenarios=s.scenarios.filter(x=>x.id!==scenario!.id);return commit({scenario});}
        if(childId==='duplicate'){const duplicate=structuredClone(scenario);duplicate.id=crypto.randomUUID();duplicate.name=body.name??`${scenario.name} (copia)`;duplicate.lifecycle='draft';duplicate.confirmedAt=null;duplicate.selections.forEach(x=>{x.id=crypto.randomUUID();x.scenarioId=duplicate.id;});s.scenarios.push(duplicate);return commit({scenario:duplicate});}
        if(childId==='confirm'){
          for(const selection of scenario.selections){if(selection.kind!=='course')continue;const alignment=body.alignments?.find((x:{selectionId:string})=>x.selectionId===selection.id);let subjectId=alignment?.subjectId??selection.subjectId;
            if(alignment?.mode==='external')continue;
            if(alignment?.mode==='created'){const subject:Subject={id:crypto.randomUUID(),name:alignment.name??selection.title,code:alignment.code??selection.code,credits:null,weekly_hours:null,total_hours:null,term_suggested:null,cycle:'segundo',type:'electiva',requirements:null,template:null};s.subjects.push(subject);subjectId=subject.id;}
            const subject=s.subjects.find(x=>x.id===subjectId);if(!subject)return error('Vinculá cada materia antes de confirmar.');
            let enrollment=s.enrollments.find(x=>x.term_id===scenario!.termId&&x.subject_id===subjectId);
            if(!enrollment){enrollment={id:crypto.randomUUID(),subject_id:subject.id,term_id:scenario.termId,status:'cursando',color:selection.color,notes:selection.notes,schedule:selection.slots,subject,term:s.terms.find(x=>x.id===scenario!.termId)??null};s.enrollments.push(enrollment);}else enrollment.schedule=selection.slots;
            selection.confirmedEnrollmentId=enrollment.id;
          }
          scenario.lifecycle='confirmed';scenario.confirmedAt=new Date().toISOString();return commit({scenario});
        }
        if(childId==='selections'){
          let selection=scenario.selections.find(x=>x.id===childAction);
          if(method==='POST'&&!childAction){selection={id:body.id??crypto.randomUUID(),scenarioId:scenario.id,kind:'course',subjectId:null,enrollmentId:null,title:'Materia',code:null,statusSnapshot:null,alignment:'unresolved',color:'#dc775d',notes:null,slots:[],source:'manual',confirmedEnrollmentId:null,offerIds:[],...body};scenario.selections.push(selection!);}
          else if(selection&&method==='PATCH')Object.assign(selection,body,{id:selection.id});
          else if(selection&&method==='DELETE')scenario.selections=scenario.selections.filter(x=>x.id!==selection!.id);
          else if(selection&&method==='PUT')selection.offerIds=body.offerIds??[];
          if(selection)return commit({selection});
        }
      }
    }
    return error('Operación no disponible en la demo.',404);
  }catch{return error('No se pudo completar la operación de demostración.');}
}
export function installDemoApi(){window.fetch=demoFetch;}
