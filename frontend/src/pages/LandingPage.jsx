import AmbientBackground from "../components/landing/AmbientBackground";
import FeaturesSection from "../components/landing/FeaturesSection";
import HeroSection from "../components/landing/HeroSection";
import HowItWorksSection from "../components/landing/HowItWorksSection";
import LandingFooter from "../components/landing/LandingFooter";
import LandingNavbar from "../components/landing/LandingNavbar";

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030303] text-[#f7f5ef]">
      <AmbientBackground />
      <LandingNavbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
       
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
