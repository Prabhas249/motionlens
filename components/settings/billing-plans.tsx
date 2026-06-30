"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

type Plan = {
  id: string;
  name: string;
  price: string;
  cadence: string;
  blurb: string;
  features: string[];
  highlight?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "",
    blurb: "Try it out.",
    features: ["5 credits to start", "All 3 analysis modes", "Code export — always free"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9",
    cadence: "/mo",
    blurb: "For builders shipping regularly.",
    features: [
      "150 credits / month",
      "≈ 150 standard or 50 precision analyses",
      "Standard · Annotated · Precision",
      "Code export (Framer Motion, GSAP, CSS, Tailwind)",
      "Priority processing",
    ],
    highlight: true,
  },
  {
    id: "studio",
    name: "Studio",
    price: "$19",
    cadence: "/mo",
    blurb: "For teams and heavy use.",
    features: [
      "300 credits / month",
      "≈ 300 standard or 100 precision analyses",
      "Everything in Pro",
      "Highest-priority processing",
    ],
  },
];

export function BillingPlans({ currentPlan }: { currentPlan: string }) {
  const [notice, setNotice] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div
              key={plan.id}
              className={cn(
                "flex flex-col rounded-xl border p-4",
                plan.highlight && !isCurrent && "border-primary/50 ring-1 ring-primary/20",
                isCurrent && "bg-muted/30",
              )}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium">{plan.name}</p>
                {plan.highlight && !isCurrent && <Badge>Popular</Badge>}
                {isCurrent && <Badge variant="secondary">Current</Badge>}
              </div>
              <p className="mt-2 text-2xl font-semibold">
                {plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                  {plan.cadence}
                </span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-5">
                {isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current plan
                  </Button>
                ) : plan.id === "free" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Free
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    onClick={() =>
                      setNotice(
                        `Checkout for ${plan.name} is coming soon — payments are being wired up.`,
                      )
                    }
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {notice && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
          {notice}
        </p>
      )}
    </div>
  );
}
