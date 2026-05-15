import { Link, useLocation } from "react-router-dom";
import { FileText, LayoutDashboard, MessageSquareText, Target, Upload } from "lucide-react";
import BrandLogo from "./landing/BrandLogo";
import ProfileMenu from "./ProfileMenu";

const navItems = [
    {
        to: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        isActive: (pathname) => pathname === "/dashboard",
    },
    {
        to: "/resumes",
        label: "CV Data",
        icon: FileText,
        isActive: (pathname) => pathname.startsWith("/resumes") && !pathname.endsWith("/market"),
    },
    {
        to: "/market",
        label: "Market",
        icon: Target,
        isActive: (pathname) => pathname === "/market" || pathname.endsWith("/market"),
    },
    {
        to: "/interview",
        label: "Interview",
        icon: MessageSquareText,
        isActive: (pathname) => pathname === "/interview",
    },
];

const navLinkClass = (active) =>
    `inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition duration-200 ${
        active
            ? "bg-zinc-100 text-zinc-950 shadow-[0_12px_32px_rgba(247,245,239,0.12)]"
            : "border border-transparent text-zinc-400 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.055] hover:text-zinc-100"
    }`;

function AppNavbar() {
    const { pathname } = useLocation();
    const isUploadActive = pathname === "/upload-cv";

    return (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#030303]/78 backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-[92rem] items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-5 lg:gap-7">
                    <Link to="/dashboard" className="flex shrink-0 items-center gap-3" aria-label="Dashboard">
                        <BrandLogo compact />
                    </Link>

                    <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
                        {navItems.map(({ to, label, icon: Icon, isActive }) => (
                            <Link
                                key={to}
                                to={to}
                                aria-current={isActive(pathname) ? "page" : undefined}
                                className={navLinkClass(isActive(pathname))}
                            >
                                <Icon size={16} />
                                {label}
                            </Link>
                        ))}
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    <Link
                        to="/upload-cv"
                        aria-current={isUploadActive ? "page" : undefined}
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold shadow-[0_16px_42px_rgba(245,158,11,0.16)] transition duration-200 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300/45 sm:px-4 ${
                            isUploadActive
                                ? "bg-zinc-100 text-zinc-950"
                                : "bg-amber-300 text-zinc-950 hover:bg-amber-200"
                        }`}
                    >
                        <Upload size={16} />
                        <span className="hidden sm:inline">Upload CV</span>
                    </Link>
                    <ProfileMenu />
                </div>
            </div>

            <nav className="mx-auto flex max-w-[92rem] gap-1 overflow-x-auto border-t border-white/10 px-4 py-2 md:hidden" aria-label="Mobile navigation">
                {navItems.map(({ to, label, icon: Icon, isActive }) => (
                    <Link
                        key={to}
                        to={to}
                        aria-current={isActive(pathname) ? "page" : undefined}
                        className={`${navLinkClass(isActive(pathname))} shrink-0`}
                    >
                        <Icon size={15} />
                        {label}
                    </Link>
                ))}
            </nav>
        </header>
    );
}

export default AppNavbar;
