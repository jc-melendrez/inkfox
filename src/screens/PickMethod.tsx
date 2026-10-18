import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { MethodKey } from "../api/types";
import { Button, RadioCard, Tag } from "../components";
import { OnboardingLayout } from "../layouts/OnboardingLayout";

type Choice = MethodKey | "unsure";

export function PickMethod() {
  const navigate = useNavigate();
  const [choice, setChoice] = useState<Choice>("PEEL");

  return (
    <OnboardingLayout
      step={2}
      total={3}
      breadcrumb={["Welcome", "Method", "First upload"]}
      footer={
        <>
          <Button onClick={() => navigate("/onboarding")}>Back</Button>
          <Button
            variant="primary"
            onClick={() =>
              navigate("/onboarding/upload", {
                state: { method: choice === "TEEL" ? "TEEL" : "PEEL" },
              })
            }
          >
            Continue
          </Button>
        </>
      }
    >
      <h1 className="page-title">Pick a starting method</h1>
      <fieldset className="stack radio-group">
        <legend className="visually-hidden">Pick a starting method</legend>
        <RadioCard
          name="method"
          value="PEEL"
          checked={choice === "PEEL"}
          onChange={() => setChoice("PEEL")}
          title="PEEL"
          tag={<Tag tone="accent">Recommended</Tag>}
          description="Point, Evidence, Explain, Link. Great for beginners."
        />
        <RadioCard
          name="method"
          value="TEEL"
          checked={choice === "TEEL"}
          onChange={() => setChoice("TEEL")}
          title="TEEL"
          description="Topic sentence, Evidence, Explain, Link."
        />
        <RadioCard
          name="method"
          value="unsure"
          checked={choice === "unsure"}
          onChange={() => setChoice("unsure")}
          title="Not sure yet"
          description="We will start you on PEEL. Change anytime in Settings."
        />
      </fieldset>
      <p className="text-sm muted">Start with PEEL and we will guide you step by step.</p>
    </OnboardingLayout>
  );
}
