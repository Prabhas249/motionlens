import { redirect } from "next/navigation";
import { getProfile } from "@/lib/profile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BillingPlans } from "@/components/settings/billing-plans";

export const metadata = { title: "Billing · Settings" };

const FREE_GRANT = 5;

export default async function BillingPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  const isFree = profile.plan === "free";
  const used = isFree ? Math.max(0, FREE_GRANT - profile.credits) : 0;
  const pct = isFree ? Math.min(100, (used / FREE_GRANT) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current plan</CardTitle>
            <Badge variant={isFree ? "secondary" : "default"} className="capitalize">
              {profile.plan}
            </Badge>
          </div>
          <CardDescription>
            {isFree
              ? "You're on the free plan — 5 runs to try MotionLens."
              : "Thanks for being on a paid plan."}
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-semibold tabular-nums">
                {profile.credits}
                <span className="text-base font-normal text-muted-foreground">
                  {isFree ? ` / ${FREE_GRANT}` : ""} runs left
                </span>
              </p>
            </div>
          </div>
          {isFree && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-1 font-medium">Plans</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Upgrade for more runs each month. Code export is always free.
        </p>
        <BillingPlans currentPlan={profile.plan} />
      </div>
    </div>
  );
}
