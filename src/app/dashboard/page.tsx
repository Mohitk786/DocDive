import Dashboard from "@/components/Dashboard";
import { db } from "@/db";
import { getUserSubscriptionPlan } from "@/lib/stripe";
import {getKindeServerSession} from "@kinde-oss/kinde-auth-nextjs/server";
import { redirect } from "next/navigation";

const Page = async () =>{
    
    const {getUser} = getKindeServerSession();
    const user = await getUser();


    if(!user || !user.email || !user.id) redirect('/auth-callback?origin=dashboard')
    const userId =  user.id
    const dbUser = await db.user.findFirst({
        where:{
            userNo: userId
        }
    })

    console.log("dashboard", dbUser)
    //reverify if user is added to DB or not
    if(!dbUser) redirect('/auth-callback?origin=dashboard')
    const subscriptionPlan = await getUserSubscriptionPlan()
console.log("subscriptionPlan",subscriptionPlan);


    return (
        <Dashboard subscriptionPlan={subscriptionPlan}/>
    )
}

export default Page;