// Supabase Edge Function source. Deploy separately; never bundle in the mobile app.
import { createClient } from 'npm:@supabase/supabase-js@2.108.2';
Deno.serve(async(request:Request)=>{
 const secret=Deno.env.get('PUSH_DISPATCH_SECRET');
 if(!secret||request.headers.get('Authorization')!==`Bearer ${secret}`)return new Response('Unauthorized',{status:401});
 if(request.method!=='POST')return new Response('Method not allowed',{status:405});
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const headers={'Content-Type':'application/json',...(Deno.env.get('EXPO_ACCESS_TOKEN')?{'Authorization':`Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`}:{})};
 const pending=await db.from('mobile_push_outbox').select('id,device_id,expo_ticket_id,accepted_at').not('expo_ticket_id','is',null).is('delivered_at',null).lt('accepted_at',new Date(Date.now()-15*60000).toISOString()).limit(1000);
 if(pending.error)return new Response('Receipt queue unavailable',{status:503});
 if(pending.data?.length){try{
  const response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers,body:JSON.stringify({ids:pending.data.map(job=>job.expo_ticket_id)})});
  if(!response.ok)throw new Error('Receipt lookup unavailable');const receipts=(await response.json()).data;
  for(const job of pending.data){const receipt=receipts?.[job.expo_ticket_id!];let result;
   if(receipt?.status==='ok')result=await db.from('mobile_push_outbox').update({delivered_at:new Date().toISOString(),last_error:null}).eq('id',job.id);
   else if(receipt?.details?.error==='DeviceNotRegistered')result=await db.from('mobile_push_devices').delete().eq('device_id',job.device_id);
   else if(receipt)result=await db.from('mobile_push_outbox').update({last_error:'Push receipt reports delivery failure',accepted_at:null,expo_ticket_id:null}).eq('id',job.id);
   else if(Date.now()-Date.parse(job.accepted_at)>86400000)result=await db.from('mobile_push_outbox').update({last_error:'Push receipt unavailable after 24 hours; review manually',attempts:5}).eq('id',job.id);
   if(result?.error)throw result.error;
  }
 }catch{return new Response('Push receipt verification unavailable',{status:503});}}
 const {data:jobs,error}=await db.rpc('claim_mobile_push');if(error)return new Response('Queue unavailable',{status:503});
 if(!jobs?.length)return Response.json({accepted:0});
 try{
  const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(Deno.env.get('EXPO_ACCESS_TOKEN')?{'Authorization':`Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`}:{})},body:JSON.stringify(jobs.map((job:any)=>({to:job.token,title:'eFlow',body:'A work update is available. Open eFlow to view it.',channelId:'eflow-work',sound:'default',ttl:3600,data:{kind:'work_update'}})))});
  if(!response.ok)throw new Error('Push provider rejected the batch');
  const tickets=(await response.json()).data;if(!Array.isArray(tickets)||tickets.length!==jobs.length)throw new Error('Incomplete push receipt');
  for(let index=0;index<jobs.length;index++){const job=jobs[index],ticket=tickets[index];if(ticket.status==='ok'){const saved=await db.from('mobile_push_outbox').update({accepted_at:new Date().toISOString(),expo_ticket_id:ticket.id,last_error:null}).eq('id',job.id);if(saved.error)throw saved.error;}else if(ticket.details?.error==='DeviceNotRegistered'){const removed=await db.from('mobile_push_devices').delete().eq('device_id',job.device_id);if(removed.error)throw removed.error;}else{const failed=await db.from('mobile_push_outbox').update({last_error:'Provider rejected delivery'}).eq('id',job.id);if(failed.error)throw failed.error;}}
  return Response.json({accepted:tickets.filter((ticket:any)=>ticket.status==='ok').length});
 }catch{return new Response('Delivery unconfirmed; leased jobs can retry',{status:503});}
});
