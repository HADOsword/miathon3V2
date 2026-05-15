import { MessageSquareText, UploadCloud, WandSparkles } from "lucide-react";
import SectionHeading from "./SectionHeading";
import StepCard from "./StepCard";
import { howItWorksSteps } from "./landingContent";

const stepIcons = [UploadCloud, WandSparkles, MessageSquareText];

function HowItWorksSection() {
  return (
    <section id="how-it-works" className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="How It Works"
          title="A focused path from upload to practice"
          description="Keep the process simple: upload, understand what to improve, then rehearse the questions your CV is likely to create."
        />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {howItWorksSteps.map((step, index) => (
            <StepCard
              key={step.title}
              icon={stepIcons[index]}
              step={step.step}
              title={step.title}
              description={step.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorksSection;
