import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";
import { navLinks } from "./landingContent";
import { hasValidAuthToken } from "../../api/client";

function LandingNavbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoggedIn] = useState(() => hasValidAuthToken());

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#030303]/78 backdrop-blur-xl">
            <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:h-[4.5rem] sm:px-8">
                <div className="flex items-center gap-10 xl:gap-12">
                    <a href="#about" className="flex items-center gap-3" aria-label="CVMentor AI home">
                        <BrandLogo />
                    </a>

                    <div className="hidden items-center gap-8 lg:flex">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="text-sm font-medium text-zinc-300 transition hover:text-white"
                            >
                                {link.label}
                            </a>
                        ))}
                    </div>
                </div>

                <div className="hidden items-center gap-3 lg:flex">
                    {isLoggedIn ? (
                        <>
                            <Link
                                to="/upload-cv"
                                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.04] hover:text-white"
                            >
                                Upload CV
                            </Link>
                            <Link
                                to="/dashboard"
                                className="rounded-xl bg-[#f7f5ef] px-5 py-2.5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_42px_rgba(245,245,240,0.28)]"
                            >
                                Dashboard
                            </Link>
                        </>
                    ) : (
                        <>
                            <Link
                                to="/login"
                                className="rounded-xl border border-white/15 px-5 py-2.5 text-sm font-semibold text-zinc-200 transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/[0.04] hover:text-white"
                            >
                                Login
                            </Link>
                            <Link
                                to="/register"
                                className="rounded-xl bg-[#f7f5ef] px-5 py-2.5 text-sm font-bold text-black shadow-[0_16px_42px_rgba(247,245,239,0.12)] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_0_42px_rgba(245,245,240,0.28)]"
                            >
                                Get Started
                            </Link>
                        </>
                    )}
                </div>

                <button
                    type="button"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 text-zinc-100 transition hover:border-white/30 hover:bg-white/[0.06] lg:hidden"
                    onClick={() => setIsOpen((value) => !value)}
                    aria-label="Toggle navigation menu"
                    aria-expanded={isOpen}
                >
                    {isOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </nav>

            {isOpen && (
                <div className="border-t border-white/10 bg-[#030303]/95 px-5 py-5 shadow-[0_22px_70px_rgba(0,0,0,0.42)] lg:hidden">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4">
                        {navLinks.map((link) => (
                            <a
                                key={link.href}
                                href={link.href}
                                className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5 hover:text-white"
                                onClick={() => setIsOpen(false)}
                            >
                                {link.label}
                            </a>
                        ))}
                        <div className="grid grid-cols-2 gap-3 pt-2">
                            {isLoggedIn ? (
                                <>
                                    <Link
                                        to="/upload-cv"
                                        className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Upload CV
                                    </Link>
                                    <Link
                                        to="/dashboard"
                                        className="rounded-xl bg-[#f7f5ef] px-4 py-2.5 text-center text-sm font-bold text-black"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Dashboard
                                    </Link>
                                </>
                            ) : (
                                <>
                                    <Link
                                        to="/login"
                                        className="rounded-xl border border-white/15 px-4 py-2.5 text-center text-sm font-semibold text-zinc-200"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="rounded-xl bg-[#f7f5ef] px-4 py-2.5 text-center text-sm font-bold text-black"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Get Started
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
}

export default LandingNavbar;
