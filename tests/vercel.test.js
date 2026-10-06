import test from 'node:test';
import assert from 'node:assert/strict';
import {adaptDatabase,getDatabase} from '../lib/database.js';
import handler from '../api/router.js';
import middleware from '../middleware.js';

test('Postgres usa parâmetros e mantém timestamps utilizáveis no navegador',async()=>{
 const calls=[],malicious="aluno' OR 1=1 --";
 const db=adaptDatabase(async(sql,values)=>{calls.push({sql,values});return[{due:'1791240000000',interval:3}]});
 const result=await db.prepare('SELECT interval,due FROM reviews WHERE user_id=? AND card_id=?').bind(malicious,'card').first();
 assert.equal(calls[0].sql,'SELECT "interval",due FROM reviews WHERE user_id=$1 AND card_id=$2');assert.deepEqual(calls[0].values,[malicious,'card']);assert.equal(result.due,1791240000000);
 assert.equal(await adaptDatabase(async()=>[]).prepare('SELECT 1').first(),null);
});

async function invoke(path,method='GET',body,headers={}){
 const result={headers:{},statusCode:0};const req={method,url:'/api/router?path='+encodeURIComponent(path),query:{path},headers:{host:'nexo.example',...headers},body};
 const res={setHeader(k,v){result.headers[k]=v},end(value){result.statusCode=this.statusCode;result.body=Buffer.isBuffer(value)?value.toString():value;}};
 await handler(req,res);return result;
}

test('Rotas reescritas funcionam sem configuração e não aceitam identidade forjada',async()=>{
 assert.equal(getDatabase(),undefined);
 const config=await invoke('auth/config');assert.equal(config.statusCode,200);assert.equal(JSON.parse(config.body).ready,false);
 const content=await invoke('content','GET',undefined,{'oai-authenticated-user-id':'fake'});assert.equal(content.statusCode,401);
 const badOrigin=await invoke('auth/logout','POST',{}, {'content-type':'application/json',origin:'https://evil.example'});assert.equal(badOrigin.statusCode,403);
 const logout=await invoke('auth/logout','POST',{}, {'content-type':'application/json',origin:'https://nexo.example'});assert.equal(logout.statusCode,200);assert.ok(Array.isArray(logout.headers['set-cookie']));assert.match(logout.headers['set-cookie'][0],/Max-Age=0/);
});

test('PDFs exigem sessão assinada e adulterações são rejeitadas',async()=>{
 const previous=process.env.GOOGLE_SESSION_SECRET;const secret='test-only-secret-'.repeat(4);process.env.GOOGLE_SESSION_SECRET=secret;
 try{
  const encoder=new TextEncoder(),data=Buffer.from(JSON.stringify({type:'session',id:'google:student',name:'Aluno',exp:Math.floor(Date.now()/1000)+60})).toString('base64url');
  const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=Buffer.from(await crypto.subtle.sign('HMAC',key,encoder.encode(data))).toString('base64url');
  const request=cookie=>new Request('https://nexo.example/provas/fuvest2025.pdf',{headers:{cookie}});
  assert.equal((await middleware(request(''))).status,302);
  assert.equal((await middleware(request('__Host-nexo-session='+data+'.'+signature))).headers.get('x-middleware-next'),'1');
  assert.equal((await middleware(request('__Host-nexo-session='+data+'.'+signature+'changed'))).status,302);
 }finally{if(previous===undefined)delete process.env.GOOGLE_SESSION_SECRET;else process.env.GOOGLE_SESSION_SECRET=previous;}
});
