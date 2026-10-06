import {readFileSync} from 'node:fs';
import {neon} from '@neondatabase/serverless';
if(!process.env.DATABASE_URL)throw new Error('Defina DATABASE_URL em .env.local ou no ambiente antes de executar a migração.');
const sql=neon(process.env.DATABASE_URL);
for(const statement of readFileSync(new URL('../db/001-initial.sql',import.meta.url),'utf8').split(';'))if(statement.trim())await sql.query(statement);
console.log('Tabelas e índice do Nexo preparados.');
