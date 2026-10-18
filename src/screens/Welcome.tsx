import { useNavigate } from "react-router-dom";
import { Button, FoxPlaceholder } from "../components";
import { useAuth } from "../context/AuthContext";
import { OnboardingLayout } from "../layouts/OnboardingLayout";

const HOW = [
  "Upload your notes or reading",
  "Write answers using a clear structure",
  "Get friendly feedback and improve",
];

export function Welcome() {
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();

  return (
    <OnboardingLayout
      step={1}
      total={3}
      breadcrumb={["Welcome", "Method", "First upload"]}
      footer={
        <>
          <Button
            onClick={async () => {
              await completeOnboarding({});
              navigate("/home");
            }}
          >
            Skip for now
          </Button>
          <Button variant="primary" onClick={() => navigate("/onboarding/method")}>
            Get started
          </Button>
        </>
      }
    >
      <div className="stack" style={{ alignItems: "center", textAlign: "center" }}>
        <FoxPlaceholder state="waving" size="lg" label="Fox waving" />
        <h1 className="page-title">Hi, I am Fox! Let us get you writing.</h1>
        <p className="muted">Here is how FoxTutor works:</p>
        <ol className="stack" style={{ textAlign: "left" }}>
          {HOW.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      </div>
    </OnboardingLayout>
  );
}
