const encoder=new TextEncoder();
const bytes=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const base64=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const encode=o=>base64(encoder.encode(JSON.stringify(o)));
const decode=s=>JSON.parse(new TextDecoder().decode(bytes(s)));
const cookies=r=>Object.fromEntries((r.headers.get('cookie')||'').split(';').map(s=>s.trim().split(/=(.*)/s)).filter(a=>a[0]).map(a=>[a[0],a[1]]));
const cookie=(name,value,age)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`;
const response=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
async function key(secret){return crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign','verify'])}
async function sign(value,secret){const data=encode(value);return data+'.'+base64(await crypto.subtle.sign('HMAC',await key(secret),encoder.encode(data)))}
async function read(value,secret){try{if(!secret||!value||value.length>6000)return null;const parts=value.split('.');if(parts.length!==2||!await crypto.subtle.verify('HMAC',await key(secret),bytes(parts[1]),encoder.encode(parts[0])))return null;const p=decode(parts[0]);return Number.isFinite(p.exp)&&p.exp>Date.now()/1000?p:null}catch{return null}}
let googleKeys=null,keysExpire=0;
async function verifyGoogle(token,clientId,nonce){
 if(typeof token!=='string'||token.length>16000)throw Error('Invalid token');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const header=decode(parts[0]),payload=decode(parts[1]);
 if(header.alg!=='RS256'||typeof header.kid!=='string')throw Error('Invalid algorithm');
 if(!googleKeys||keysExpire<Date.now()){
  const r=await fetch('https://www.googleapis.com/oauth2/v3/certs');if(!r.ok)throw Error('Google unavailable');
  const d=await r.json();if(!Array.isArray(d.keys))throw Error('Invalid keys');googleKeys=d.keys;keysExpire=Date.now()+3600000;
 }
 const jwk=googleKeys.find(k=>k.kid===header.kid);if(!jwk)throw Error('Unknown key');
 const publicKey=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',publicKey,bytes(parts[2]),encoder.encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');
 const now=Date.now()/1000;
 if(!['accounts.google.com','https://accounts.google.com'].includes(payload.iss)||payload.aud!==clientId||!Number.isFinite(payload.exp)||payload.exp<=now||!Number.isFinite(payload.iat)||payload.iat>now+60||payload.email_verified!==true||payload.nonce!==nonce||typeof payload.sub!=='string'||!payload.sub||payload.sub.length>255)throw Error('Invalid claims');
 return{id:'google:'+payload.sub,name:typeof payload.name==='string'?payload.name.slice(0,80):payload.email,email:payload.email};
}
export async function googleUser(request,env){const p=await read(cookies(request)['__Host-nexo-session'],env.GOOGLE_SESSION_SECRET);return p?.type==='session'&&typeof p.id==='string'&&p.id.startsWith('google:')?{id:p.id,name:p.name,email:p.email}:null}
export async function googleAuth(request,env){
 const path=new URL(request.url).pathname;
 const ready=/^[\w.-]+\.apps\.googleusercontent\.com$/.test(env.GOOGLE_CLIENT_ID||'')&&typeof env.GOOGLE_SESSION_SECRET==='string'&&env.GOOGLE_SESSION_SECRET.length>=32;
 if(path==='/api/auth/config'&&request.method==='GET'){
  if(!ready)return response({ready:false,error:'O login Google ainda precisa ser configurado pelo responsável pelo app.'});
  const nonce=crypto.randomUUID();const value=await sign({type:'nonce',nonce,exp:Math.floor(Date.now()/1000)+600},env.GOOGLE_SESSION_SECRET);
  return response({ready:true,clientId:env.GOOGLE_CLIENT_ID,nonce},200,{'set-cookie':cookie('__Host-nexo-login',value,600)});
 }
 if(!['/api/auth/google','/api/auth/logout'].includes(path))return null;
 if(request.method!=='POST')return response({error:'Método inválido.'},405);
 if(request.headers.get('origin')!==new URL(request.url).origin)return response({error:'Origem inválida.'},403);
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return response({error:'Formato inválido.'},415);
 if(path==='/api/auth/logout')return response({ok:true},200,{'set-cookie':cookie('__Host-nexo-session','',0)});
 if(!ready)return response({error:'O login Google ainda não foi configurado.'},503);
 const raw=await request.text();if(raw.length>20000)return response({error:'Requisição inválida.'},413);
 let data;try{data=JSON.parse(raw)}catch{return response({error:'Dados inválidos.'},400)}
 const challenge=await read(cookies(request)['__Host-nexo-login'],env.GOOGLE_SESSION_SECRET);
 if(challenge?.type!=='nonce')return response({error:'A tentativa de entrada expirou. Atualize a página.'},401);
 try{
  const user=await verifyGoogle(data.credential,env.GOOGLE_CLIENT_ID,challenge.nonce);
  const session=await sign({...user,type:'session',exp:Math.floor(Date.now()/1000)+604800},env.GOOGLE_SESSION_SECRET);
  const out=response({ok:true},200,{'set-cookie':cookie('__Host-nexo-session',session,604800)});out.headers.append('set-cookie',cookie('__Host-nexo-login','',0));return out;
 }catch{return response({error:'Não foi possível confirmar sua conta Google. Atualize a página e tente novamente.'},401)}
}
