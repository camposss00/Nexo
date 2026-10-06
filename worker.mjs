import {subjects,lessons,questions,exams,writing} from './content.mjs';
import {googleAuth,googleUser} from './google-auth.mjs';
export function makeWorker(assets){
 const allCards=lessons.flatMap(l=>l.cards.map(c=>({...c,subject:l.subject,lessonId:l.id,source:l.source})));
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
 return {async fetch(request,env){
  try {
   const url=new URL(request.url),path=url.pathname;
   const authResponse=await googleAuth(request,env);if(authResponse)return authResponse;
   const google=await googleUser(request,env),uid=google?.id,name=google?.name||google?.email||'';
   if(path.startsWith('/api/')&&path!=='/api/state'&&!uid)return json({error:'Entre com sua conta Google para acessar os estudos.'},401);
   if(path==='/api/content')return json({subjects,lessons,cards:allCards,exams,writing,questions:questions.map(({correct,explanation,...rest})=>rest)});
   if(path==='/api/state'&&request.method==='GET'){
    if(!uid)return json({user:null,profile:null,reviews:[],lessons:[],attempts:[]});
    if(!env.DB)return json({user:{name,id:uid},unavailable:true,error:'Seu histórico está temporariamente indisponível.'},503);
    const [profile,reviews,done,attempts]=await Promise.all([
     env.DB.prepare('SELECT * FROM profiles WHERE user_id = ?').bind(uid).first(),
     env.DB.prepare('SELECT card_id, due, interval, repetitions, rating FROM reviews WHERE user_id = ?').bind(uid).all(),
     env.DB.prepare('SELECT lesson_id, completed_at FROM lesson_progress WHERE user_id = ?').bind(uid).all(),
     env.DB.prepare('SELECT id, created_at, exam, answers, score, total FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 30').bind(uid).all()
    ]);
    return json({user:{name,id:uid},profile,reviews:reviews.results,lessons:done.results,attempts:attempts.results.map(a=>({...a,answers:JSON.parse(a.answers)}))});
   }
   if(path.startsWith('/api/')&&request.method==='POST'){
    if(!uid)return json({error:'Entre na sua conta para salvar seu progresso.'},401);
    if(!env.DB)return json({error:'Não foi possível salvar agora. Tente novamente.'},503);
    if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return json({error:'Formato de requisição inválido.'},415);
    const origin=request.headers.get('origin');if(origin&&origin!==url.origin)return json({error:'Origem inválida.'},403);
    const raw=await request.text();if(raw.length>30000)return json({error:'Requisição muito grande.'},413);
    let data;try{data=JSON.parse(raw)}catch{return json({error:'Dados inválidos.'},400)}
    if(path==='/api/profile'){
     if(typeof data.name!=='string'||!data.name.trim()||data.name.length>80||!['ENEM','Fuvest / USP','ITA','Provão Paulista'].includes(data.goal)||![15,30,45,60].includes(data.dailyMinutes))return json({error:'Confira os dados do seu perfil.'},400);
     await env.DB.prepare('INSERT INTO profiles (user_id,name,goal,daily_minutes) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,goal=excluded.goal,daily_minutes=excluded.daily_minutes').bind(uid,data.name.trim(),data.goal,data.dailyMinutes).run();
     return json({ok:true});
    }
    if(path==='/api/lesson'){
     if(!lessons.some(l=>l.id===data.lessonId))return json({error:'Aula não encontrada.'},400);
     await env.DB.prepare('INSERT INTO lesson_progress (user_id,lesson_id,completed_at) VALUES (?,?,?) ON CONFLICT(user_id,lesson_id) DO NOTHING').bind(uid,data.lessonId,Date.now()).run();return json({ok:true});
    }
    if(path==='/api/review'){
     if(!allCards.some(c=>c.id===data.cardId)||![0,1,2].includes(data.rating))return json({error:'Revisão inválida.'},400);
     const old=await env.DB.prepare('SELECT interval,repetitions FROM reviews WHERE user_id=? AND card_id=?').bind(uid,data.cardId).first();
     const interval=data.rating===0?0:data.rating===1?1:Math.min(60,Math.max(3,(old?.interval||1)*2));
     const due=Date.now()+(interval?interval*86400000:600000);
     await env.DB.prepare('INSERT INTO reviews (user_id,card_id,due,interval,repetitions,rating) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id,card_id) DO UPDATE SET due=excluded.due,interval=excluded.interval,repetitions=excluded.repetitions,rating=excluded.rating').bind(uid,data.cardId,due,interval,data.rating===0?0:(old?.repetitions||0)+1,data.rating).run();
     return json({ok:true,due,interval});
    }
    if(path==='/api/attempt'){
     if(!Array.isArray(data.answers)||!data.answers.length||data.answers.length>100)return json({error:'Respostas inválidas.'},400);
     let score=null,feedback=[];
     if(data.exam==='treino'){
      const seen=new Set();
      for(const a of data.answers){const q=questions.find(q=>q.id===a.id);if(!q||seen.has(a.id)||!Number.isInteger(a.answer)||a.answer<0||a.answer>4)return json({error:'Questão ou resposta inválida.'},400);seen.add(a.id);feedback.push({id:q.id,correct:q.correct,explanation:q.explanation,isCorrect:a.answer===q.correct});}
      score=feedback.filter(f=>f.isCorrect).length;
     }else{
      const exam=exams.find(e=>e.id===data.exam);if(!exam||data.answers.some((a,i)=>a.id!==String(i+1)||(!Number.isInteger(a.answer)||a.answer< -1||a.answer>4))||data.answers.length!==exam.count)return json({error:'Caderno ou respostas inválidas.'},400);
     }
     const id=crypto.randomUUID();await env.DB.prepare('INSERT INTO attempts (id,user_id,created_at,exam,answers,score,total) VALUES (?,?,?,?,?,?,?)').bind(id,uid,Date.now(),data.exam,JSON.stringify(data.answers),score,data.answers.length).run();
     return json({id,score,total:data.answers.length,feedback});
    }
    return json({error:'Rota não encontrada.'},404);
   }
   if(path.startsWith('/api/'))return json({error:'Rota não encontrada.'},404);
   if(path.startsWith('/provas/')){if(!uid)return new Response('Entre com sua conta Google.',{status:401});if(env.ASSETS)return env.ASSETS.fetch(request);}
   const asset=assets[path==='/'?'/index.html':path]||(!path.includes('.')?assets['/index.html']:null);
   if(!asset)return new Response('Não encontrado',{status:404});
   const types={html:'text/html; charset=utf-8',css:'text/css; charset=utf-8',js:'text/javascript; charset=utf-8',svg:'image/svg+xml'};
   return new Response(asset,{headers:{'content-type':types[(path==='/'?'index.html':path).split('.').pop()]||'text/plain','cache-control':'no-cache','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin','content-security-policy':"default-src 'self'; script-src 'self' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://accounts.google.com; frame-src 'self' https://drive.google.com https://accounts.google.com; font-src 'self'; object-src 'none'; base-uri 'self'"}});
  }catch(e){console.error('Nexo request failed',e.message);return json({error:'Não foi possível concluir agora. Seu conteúdo continua disponível; tente novamente.'},500);}
 }};
}
