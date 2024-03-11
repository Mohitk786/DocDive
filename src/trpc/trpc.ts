import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server';
import { TRPCError, initTRPC } from '@trpc/server';


const t = initTRPC.create();

//apna define kiya hua middleware to check if user is logged in or not
const middleware = t.middleware
const isAuth = middleware(async(opts)=>{
    
    const {getUser}  = getKindeServerSession();
    const user = await getUser();

    if(!user || !user.id){
        throw new TRPCError({code:"UNAUTHORIZED"})
    }
    return opts.next({          //similar to nodejs
        ctx: {
            userId: user.id,
            user,
        }
    }); 
})


export const router = t.router;
export const publicProcedure = t.procedure;  //any user can access
export const privateProcedure = t.procedure.use(isAuth)