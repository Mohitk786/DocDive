import BillingForm from "@/components/BillingForm";
import { getUserSubscriptionPlan } from "@/lib/stripe"

const Page = async() => {

  const subscriptionPlan = await getUserSubscriptionPlan();


  return (
    <div>
      <BillingForm subscriptionPlan={subscriptionPlan}></BillingForm>
    </div>
  )
}

export default Page