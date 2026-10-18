import type { ReactNode } from "react";
import { ProgressBar } from "../components/ProgressBar";

interface Props {
  step: number;
  total: number;
  breadcrumb: string[];
  children: ReactNode;
  footer: ReactNode;
}

export function OnboardingLayout({ step, total, breadcrumb, children, footer }: Props) {
  return (
    <div className="onboarding-layout">
      <div id="main" tabIndex={-1} className="onboarding-card">
        <div className="onboarding-head">
          <span className="tag">
            Step {step} of {total}
          </span>
          <span className="onboarding-steps">{breadcrumb.join(" · ")}</span>
        </div>
        <ProgressBar value={step} max={total} label={`Step ${step} of ${total}`} />
        {children}
        <div className="onboarding-foot">{footer}</div>
      </div>
    </div>
  );
}
