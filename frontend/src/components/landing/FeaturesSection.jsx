import { BrainCircuit, MessageSquareText, SearchCheck } from "lucide-react";
import FeatureCard from "./FeatureCard";
import SectionHeading from "./SectionHeading";
import { features } from "./landingContent";

const featureIcons = [SearchCheck, BrainCircuit, MessageSquareText];

function FeaturesSection() {
  return (
    <section id="features" className="px-5 py-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <SectionHeading
          eyebrow="Features"
          title="Everything you need before the interview"
          description="CVMentor AI turns one uploaded CV into focused feedback, clearer positioning, and practical interview preparation."
        />

        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={featureIcons[index]}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
