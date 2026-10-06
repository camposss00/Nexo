import {neon} from '@neondatabase/serverless';
export function adaptDatabase(query){
 const normalize=row=>row?Object.fromEntries(Object.entries(row).map(([key,value])=>[key,['due','completed_at','created_at'].includes(key)&&value!==null?Number(value):value])):null;
 function prepare(statement,values=[]){
  let parameter=0;const sql=statement.replace(/\binterval\b/g,'"interval"').replace(/\?/g,()=>'$'+(++parameter));
  const execute=()=>query(sql,values);
  return{bind(...next){return prepare(statement,next)},async first(){return normalize((await execute())[0])},async all(){return{results:(await execute()).map(normalize)}},async run(){await execute();return{success:true}}};
 }
 return{prepare};
}
let cachedDatabase,cachedUrl;
export function getDatabase(){
 const url=process.env.DATABASE_URL;if(!url)return undefined;
 if(!cachedDatabase||cachedUrl!==url){const sql=neon(url);cachedDatabase=adaptDatabase((statement,values)=>sql.query(statement,values));cachedUrl=url;}
 return cachedDatabase;
}
