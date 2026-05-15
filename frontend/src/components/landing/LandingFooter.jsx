import BrandLogo from "./BrandLogo";
import { navLinks } from "./landingContent";

function LandingFooter() {
  return (
    <footer className="border-t border-white/10 px-5 py-8 sm:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
        <a href="#about" className="flex items-center gap-3 text-white">
          <BrandLogo compact />
        </a>

        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default LandingFooter;
