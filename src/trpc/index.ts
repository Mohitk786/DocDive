import { TRPCError } from '@trpc/server';
import { privateProcedure, publicProcedure, router } from './trpc';
import { getKindeServerSession } from "@kinde-oss/kinde-auth-nextjs/server";
import { db } from '@/db';

import {INFINITE_QUERY_LIMIT} from "@/config/infinite-query"

import {z} from "zod"
import { absoluteUrl } from '@/lib/utils';
import { getUserSubscriptionPlan, stripe } from '@/lib/stripe';
import { PLANS } from '@/config/stripe';

export const appRouter = router({
  
  authCallback:   publicProcedure.query(async () => {
   
    const { getUser } = getKindeServerSession();
    const user = await getUser();

    if (!user || !user.id || !user.email) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // check if user is present or not in database
    const dbUser = await db.user.findFirst({
      where: {
        userNo: user?.id
      }
    });

    console.log(dbUser?.id)

    //If user is not in DB it means it is new user so add it to DB
    if (!dbUser) {
      const newU = await db.user.create({
        data: {
          email: user.email,
          userNo: user?.id
        }
      });

      console.log("User created in the database:", newU);
    }

    return { success: true };
  }),

  getUserFiles:   privateProcedure.query(async({ctx})=>{
    const {userId, user} = ctx;    //coming from middleware
    
    return await db.file.findMany({
      where:{
        userNo: userId
      }
    })
  }),

  deleteFile :    privateProcedure.input(z.object({id: z.string()}
                  )).mutation(async ({ctx, input})=>{
                    const {userId} = ctx;


                    //find that file which has id as input id and userID of current user
                    const file = await db.file.findFirst({
                      where: {
                        id: input.id, 
                        userNo : userId,
                      }
                    })

                    if(!file) throw  new TRPCError({code:"NOT_FOUND"})

                    //delet the file
                    await db.file.delete({
                      where:{
                        id:input.id
                      }
                    })

                    return file

                  }),
  

  getFile :       privateProcedure.input(z.object({key: z.string()}
                  )).mutation(async ({ctx, input})=>{
                    const {user, userId} = ctx

                    const file = await db.file.findFirst({
                      where:{
                        key:input.key,
                        userNo: userId
                      }
                    })

                    if(!file) throw new TRPCError({code:"NOT_FOUND"})
                    return file;
                  }),



                  
  getFileUploadStatus: privateProcedure.input(z.object({fileId: z.string()}
                      )).query(async({ctx, input})=>{

                        const {user, userId} = ctx;

                        const file = await db.file.findFirst({
                          where:{
                            id: input.fileId,
                            userNo: userId
                          }
                        })

                        if(!file) return {status:"PENDING" as const}

                        return {status: file.uploadStatus}

                      }),

  getFileMessages:  privateProcedure.input(z.object({
                    limit: z.number().min(1).max(100).nullish(), //nullish means it is optional
                    cursor: z.string().nullish(),
                    fileId: z.string()
                    })).query(async ({ctx, input})=>{
                      
                        const{user, userId} = ctx;
                        const {fileId, cursor} = input
                        const limit = input.limit ?? INFINITE_QUERY_LIMIT //infinite query limit represent number of messages to display on screen

                        const file = await db.file.findFirst({
                          where:{
                            id:fileId,
                            userNo:userId,
                          },
                        })

                        if(!file) throw new TRPCError({code:"NOT_FOUND"})
                        
                        //fetch messages
                        const messages = await db.message.findMany({
                          take: limit + 1,
                          where:{
                            fileId
                          },
                          orderBy:{
                            createdAt: "desc" //descending
                          },
                          cursor: cursor ? {id:cursor} : undefined,
                          select:{
                            id:true,
                            isUserMessage: true,
                            createdAt: true,
                            text: true
                          }

                        })

                        let nextCursor: typeof cursor | undefined = undefined;
                        if(messages.length > limit){
                          const nextItem = messages.pop()
                          nextCursor = nextItem?.id
                        }

                        return {
                          messages,
                          nextCursor
                        }
                    }),

  createStripeSession: privateProcedure.mutation(async ({ctx})=>{
                    const {userId} = await ctx

                    const billingUrl = absoluteUrl("/dashboard/billing")

                    if(!userId) throw new TRPCError({code:"UNAUTHORIZED"})

                    const dbUser = await db.user.findFirst({
                      where:{
                        userNo: userId
                      }
                    })

                    if(!dbUser) throw new TRPCError({code:"UNAUTHORIZED"})

                    const subscriptionPlan = await getUserSubscriptionPlan()

                    //already pro customer
                    if(subscriptionPlan.isSubscribed && dbUser.stripeCustomerId){
                      const stripeSession = await stripe.billingPortal.sessions.create({
                        customer: dbUser.stripeCustomerId,
                        return_url: billingUrl,
                      })

                      return {url: stripeSession.url}
                    }

                    //not subscrbed
                    const stripeSession = await stripe.checkout.sessions.create({
                      success_url: billingUrl,
                      cancel_url: billingUrl,
                      payment_method_types: ["card"],
                      mode: "subscription",
                      billing_address_collection:"auto",
                      line_items: [
                        {
                          price: PLANS.find((p)=> p.name === "Pro")?.price.priceIds.test, //test mode
                          quantity: 1
                        }
                      ],
                      metadata: {
                        userId: userId
                      }
                    })


                    return {url: stripeSession.url}

                    })

 
});

export type AppRouter = typeof appRouter;
