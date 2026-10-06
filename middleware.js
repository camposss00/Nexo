import {next} from '@vercel/functions';
import {googleUser} from './google-auth.mjs';
export default async function middleware(request){
 const user=await googleUser(request,{GOOGLE_SESSION_SECRET:process.env.GOOGLE_SESSION_SECRET});
 if(!user)return Response.redirect(new URL('/login',request.url),302);
 return next();
}
export const config={matcher:['/provas/:path*']};
