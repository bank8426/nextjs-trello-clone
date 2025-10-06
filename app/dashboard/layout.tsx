import { PlanProvider } from "@/lib/contexts/planContext";
import { auth } from "@clerk/nextjs/server";

const layout = async ({ children }: { children: React.ReactNode }) => {
  const { has } = await auth();
  const hasProPlan = has({ plan: "pro_user" });
  const hasEnterprisePlan = has({ plan: "enterprise_user" });

  return (
    <PlanProvider hasProPlan={hasProPlan} hasEnterprisePlan={hasEnterprisePlan}>
      {children}
    </PlanProvider>
  );
};

export default layout;
