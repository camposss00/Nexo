import {makeWorker} from '../worker.mjs';
import {getDatabase} from '../lib/database.js';
const app=makeWorker({});
export default async function handler(req,res){
 try{
  const host=req.headers.host;if(typeof host!=='string'||!/^\w[\w.:-]*$/.test(host)){res.statusCode=400;return res.end('Host inválido');}
  const protocol=/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)?'http':'https';
  const incoming=new URL(req.url,protocol+'://'+host),route=req.query?.path??incoming.searchParams.get('path');
  const pathname=route===undefined||route===null?incoming.pathname:'/api/'+String(route).replace(/^\/+/, '');
  const url=new URL(pathname,protocol+'://'+host),headers=new Headers();
  for(const [key,value] of Object.entries(req.headers))if(value!==undefined&&!['content-length','transfer-encoding'].includes(key))headers.set(key,Array.isArray(value)?value.join(', '):value);
  let body;
  if(!['GET','HEAD'].includes(req.method)){
   if(req.body!==undefined)body=typeof req.body==='string'||Buffer.isBuffer(req.body)?req.body:JSON.stringify(req.body);
   else{const chunks=[];for await(const chunk of req)chunks.push(chunk);body=Buffer.concat(chunks);}
   if(Buffer.byteLength(body)>32000){res.statusCode=413;res.setHeader('content-type','application/json');return res.end(JSON.stringify({error:'Requisição muito grande.'}));}
  }
  const request=new Request(url,{method:req.method,headers,...(body===undefined?{}:{body})});
  const response=await app.fetch(request,{DB:getDatabase(),GOOGLE_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,GOOGLE_SESSION_SECRET:process.env.GOOGLE_SESSION_SECRET});
  res.statusCode=response.status;for(const [key,value] of response.headers)if(key!=='set-cookie')res.setHeader(key,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('set-cookie',cookies);
  res.end(req.method==='HEAD'?undefined:Buffer.from(await response.arrayBuffer()));
 }catch(e){console.error('Nexo API failed:',e.message);res.statusCode=500;res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify({error:'Não foi possível concluir agora. Confira a configuração da hospedagem.'}));}
}
