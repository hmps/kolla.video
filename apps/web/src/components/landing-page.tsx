"use client";

import { ArrowRight, Video, Upload, Tag, Users, Eye, Shield, FolderOpen, MessageCircle, Github, Play, Sparkles } from "lucide-react";
import { Space_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";

const brandMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

const bodyFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const faqs = [
  {
    question: "Why another video platform?",
    answer:
      "We built Kolla after pricing out Hudl and similar tools for our youth handball club. Coaches needed the essentials without the enterprise bill.",
  },
  {
    question: "Can I self-host Kolla?",
    answer:
      "Yes. Kolla is open source, so you can run it on your own stack and keep every clip with your club.",
  },
  {
    question: "How many teams can I have?",
    answer:
      "Unlimited. Spin up a squad for every age group, training camp, or tournament with no extra charges.",
  },
  {
    question: "How many players can I invite?",
    answer:
      "Unlimited. Share video with every athlete, assistant, or volunteer who helps your program run.",
  },
  {
    question: "Are clip uploads limited?",
    answer:
      "No caps. Keep posting full matches, practice reels, and skill sessions so nothing gets lost.",
  },
  {
    question: "Does it work on mobile?",
    answer:
      "Yes. Athletes and coaches can watch, tag, and comment from phones, tablets, or laptops.",
  },
];

const flowSteps = [
  {
    icon: Upload,
    title: "Film it your way",
    description:
      "Drop in full matches, practice scrimmages, or quick phone clips. Kolla keeps the quality and gets the video ready fast.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Tag,
    title: "Tag what matters",
    description:
      "Mark plays, drill segments, and player moments so you can jump back to the right teaching point in seconds.",
    gradient: "from-violet-500 to-purple-500",
  },
  {
    icon: Users,
    title: "Coach together",
    description:
      "Share playlists with staff and athletes. Comments and assignments stay tied to the exact timestamp, even on mobile.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Eye,
    title: "See who watched",
    description:
      "Simple viewing stats show who has caught up on film, helping you plan the next session with confidence.",
    gradient: "from-emerald-500 to-teal-500",
  },
];

const features = [
  { icon: Shield, label: "Role-based access" },
  { icon: FolderOpen, label: "Flexible collections" },
  { icon: MessageCircle, label: "Timeline comments" },
  { icon: Upload, label: "Unlimited uploads" },
  { icon: Users, label: "Unlimited members" },
  { icon: Github, label: "Open source" },
];

const useCases = [
  {
    title: "Youth Clubs",
    description: "Built for grassroots teams:",
    items: [
      "Affordable for any budget",
      "Easy for volunteers to manage",
      "Safe sharing with parents",
      "Season-by-season organization",
    ],
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    title: "High School Teams",
    description: "Support player development:",
    items: [
      "Film study before big games",
      "Individual skill breakdowns",
      "Recruit-ready highlight reels",
      "Cross-sport compatibility",
    ],
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    title: "Club Academies",
    description: "Scale across age groups:",
    items: [
      "Centralized video library",
      "Coach collaboration tools",
      "Player progress tracking",
      "Tournament film sharing",
    ],
    gradient: "from-violet-500 to-purple-500",
  },
];

// Intersection Observer hook for scroll animations
function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

// Animated section wrapper
function AnimatedSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, isInView } = useInView();

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${className}`}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(30px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function LandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className={`${bodyFont.className} min-h-screen bg-white text-slate-800`}>
      {/* Custom styles for animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(15, 23, 42, 0.3); }
          50% { box-shadow: 0 0 40px rgba(15, 23, 42, 0.5); }
        }
        @keyframes gradient-shift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .group:hover .shimmer-effect {
          animation: shimmer 0.8s ease-out;
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-slate-900/25">
              <Video className="h-5 w-5" />
            </div>
            <span className={`${brandMono.className} text-xl font-bold transition-colors duration-300 group-hover:text-slate-600`}>
              kolla
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="https://github.com/hmps/kolla.video"
              className="text-sm text-slate-600 transition-all duration-300 hover:text-slate-900 hover:-translate-y-0.5"
            >
              GitHub
            </Link>
            <Link
              href="/sign-in"
              className="group relative overflow-hidden rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-900/25 hover:-translate-y-0.5"
            >
              <span className="relative z-10">Sign in</span>
              <div className="shimmer-effect absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden px-6 py-20 md:py-28">
          {/* Animated background gradient */}
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{
              background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(99, 102, 241, 0.15), transparent 40%)`,
            }}
          />
          {/* Grid pattern */}
          <div className="pointer-events-none absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />

          <div className="relative mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <AnimatedSection>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  Built by coaches, for coaches
                </div>
                <h1 className={`${brandMono.className} text-4xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-[3.25rem]`}>
                  Film Study That{" "}
                  <span className="animate-gradient bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 bg-clip-text text-transparent">
                    Doesn&apos;t Break the Bank.
                  </span>
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-slate-600">
                  Kolla keeps film study friendly and focused: film the game, upload
                  to Kolla, tag the moments, and share them with your squad.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button asChild className="group relative overflow-hidden rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-1 animate-pulse-glow">
                    <Link href="/sign-up">
                      <span className="relative z-10 flex items-center">
                        Get Started Free
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                      <div className="shimmer-effect absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="group rounded-md border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition-all duration-300 hover:border-slate-400 hover:bg-slate-50 hover:-translate-y-1">
                    <Link href="https://github.com/hmps/kolla.video">
                      <Github className="mr-2 h-4 w-4" />
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </AnimatedSection>

              {/* Phone Mockup with floating animation */}
              <AnimatedSection delay={200} className="flex justify-center lg:justify-end">
                <div className="relative">
                  {/* Glow effect behind phone */}
                  <div className="absolute -inset-4 rounded-[50px] bg-gradient-to-br from-blue-500/20 via-violet-500/20 to-purple-500/20 blur-2xl" />

                  <div className="animate-float relative h-[500px] w-[260px] overflow-hidden rounded-[40px] border-8 border-slate-900 bg-gradient-to-br from-slate-50 to-slate-100 shadow-2xl">
                    <div className="flex h-full flex-col">
                      {/* Phone status bar */}
                      <div className="flex items-center justify-center bg-slate-900 py-2">
                        <div className="h-6 w-24 rounded-full bg-slate-800" />
                      </div>
                      {/* App content placeholder with video preview */}
                      <div className="flex-1 p-4">
                        <div className="mb-4 h-4 w-20 rounded bg-slate-200" />
                        <div className="group relative mb-3 aspect-video w-full cursor-pointer overflow-hidden rounded-lg bg-gradient-to-br from-slate-200 to-slate-300">
                          {/* Play button overlay */}
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 shadow-lg">
                              <Play className="h-5 w-5 text-slate-900" fill="currentColor" />
                            </div>
                          </div>
                        </div>
                        <div className="mb-2 h-3 w-full rounded bg-slate-200" />
                        <div className="mb-4 h-3 w-3/4 rounded bg-slate-200" />
                        <div className="flex gap-2">
                          <div className="h-8 w-16 rounded bg-slate-900 transition-transform duration-300 hover:scale-105" />
                          <div className="h-8 w-16 rounded border border-slate-300 bg-white transition-transform duration-300 hover:scale-105" />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-300 hover:bg-slate-100">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                            <div className="flex-1">
                              <div className="mb-1 h-3 w-24 rounded bg-slate-200" />
                              <div className="h-2 w-32 rounded bg-slate-100" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-300 hover:bg-slate-100">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600" />
                            <div className="flex-1">
                              <div className="mb-1 h-3 w-20 rounded bg-slate-200" />
                              <div className="h-2 w-28 rounded bg-slate-100" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="border-y border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-10">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <p className="mb-6 text-center text-sm text-slate-500">
                Trusted by youth clubs and academies
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-24 rounded bg-slate-200 opacity-60 transition-all duration-300 hover:opacity-100 hover:scale-110"
                    style={{ transitionDelay: `${i * 50}ms` }}
                  />
                ))}
              </div>
            </AnimatedSection>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-center text-3xl font-bold text-slate-900`}>
                What&apos;s in the Box?
              </h2>
            </AnimatedSection>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature, index) => (
                <AnimatedSection key={feature.label} delay={index * 100}>
                  <div className="group flex cursor-default items-center gap-4 rounded-xl border border-transparent p-4 transition-all duration-300 hover:border-slate-200 hover:bg-slate-50 hover:shadow-lg hover:shadow-slate-200/50 hover:-translate-y-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 transition-all duration-300 group-hover:bg-slate-900 group-hover:text-white group-hover:scale-110">
                      <feature.icon className="h-5 w-5 text-slate-700 transition-colors duration-300 group-hover:text-white" />
                    </div>
                    <span className={`${brandMono.className} text-sm font-medium text-slate-800`}>
                      {feature.label}
                    </span>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
                Get Started in Minutes
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-600">
                Film the game, drop the video into Kolla, and everything else
                is ready to go. No clutter, no maze of menus.
              </p>
            </AnimatedSection>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {flowSteps.map((step, index) => (
                <AnimatedSection key={step.title} delay={index * 150}>
                  <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 transition-all duration-500 hover:border-slate-300 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-2">
                    {/* Gradient accent line */}
                    <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${step.gradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />

                    <div className="mb-4 flex items-center gap-4">
                      <span className={`${brandMono.className} text-sm font-bold text-slate-300 transition-colors duration-300 group-hover:text-slate-400`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${step.gradient} text-white shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl`}>
                        <step.icon className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className={`${brandMono.className} text-xl font-bold text-slate-900`}>
                      {step.title}
                    </h3>
                    <p className="mt-3 text-slate-600">
                      {step.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Built for Coaches */}
        <section className="border-b border-slate-200 bg-gradient-to-b from-white to-slate-50 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
                Built for Coaches, by Coaches
              </h2>
              <p className="mt-4 max-w-3xl text-lg text-slate-600">
                We created Kolla for a youth handball club and the countless teams like it
                that just need a reliable video room without the enterprise price tag.
              </p>
            </AnimatedSection>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { emoji: "💰", title: "Keep budgets in check", description: "Hosted plans stay affordable, and you only pay for the service you actually use—no gold-plated bundles.", bg: "bg-emerald-50", hoverBg: "hover:bg-emerald-100" },
                { emoji: "🚀", title: "Fuel player growth", description: "Video is a development accelerator, so every feature keeps athletes learning and coaches teaching.", bg: "bg-blue-50", hoverBg: "hover:bg-blue-100" },
                { emoji: "🔓", title: "Open source", description: "Every line of code lives in the open. Self-host it or let us handle it—your choice.", bg: "bg-violet-50", hoverBg: "hover:bg-violet-100" },
              ].map((item, index) => (
                <AnimatedSection key={item.title} delay={index * 100}>
                  <div className={`group rounded-2xl border border-slate-200 ${item.bg} p-8 transition-all duration-300 ${item.hoverBg} hover:border-slate-300 hover:shadow-xl hover:-translate-y-2`}>
                    <div className="mb-4 text-4xl transition-transform duration-300 group-hover:scale-125">
                      {item.emoji}
                    </div>
                    <h3 className={`${brandMono.className} font-bold text-slate-900`}>
                      {item.title}
                    </h3>
                    <p className="mt-3 text-sm text-slate-600">
                      {item.description}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
                Use Cases
              </h2>
            </AnimatedSection>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {useCases.map((useCase, index) => (
                <AnimatedSection key={useCase.title} delay={index * 150}>
                  <div className="group">
                    <div className={`mb-4 h-1 w-12 rounded-full bg-gradient-to-r ${useCase.gradient} transition-all duration-300 group-hover:w-24`} />
                    <h3 className={`${brandMono.className} text-xl font-bold text-slate-900`}>
                      {useCase.title}
                    </h3>
                    <p className="mt-2 text-slate-600">{useCase.description}</p>
                    <ul className="mt-4 space-y-3">
                      {useCase.items.map((item, itemIndex) => (
                        <li
                          key={item}
                          className="flex items-start gap-3 text-sm text-slate-600 transition-all duration-300 hover:translate-x-1"
                          style={{ transitionDelay: `${itemIndex * 50}ms` }}
                        >
                          <span className={`mt-1.5 h-1.5 w-1.5 rounded-full bg-gradient-to-r ${useCase.gradient}`} />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
                FAQs
              </h2>
            </AnimatedSection>
            <div className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {faqs.map((faq, index) => (
                <AnimatedSection key={faq.question} delay={index * 100}>
                  <div className="group cursor-default rounded-xl p-4 transition-all duration-300 hover:bg-slate-50">
                    <h3 className={`${brandMono.className} font-bold text-slate-900 transition-colors duration-300 group-hover:text-blue-600`}>
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-slate-600">
                      {faq.answer}
                    </p>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden px-6 py-24">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          {/* Animated orbs */}
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute right-1/4 bottom-1/4 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative mx-auto max-w-6xl text-center">
            <AnimatedSection>
              <h2 className={`${brandMono.className} text-3xl font-bold text-white md:text-4xl`}>
                Ready to level up your film study?
              </h2>
              <p className="mt-4 text-lg text-slate-300">
                Get started free. No credit card required.
              </p>
              <div className="mt-8">
                <Button asChild className="group relative overflow-hidden rounded-md bg-white px-8 py-4 text-sm font-medium text-slate-900 transition-all duration-300 hover:bg-slate-100 hover:shadow-2xl hover:shadow-white/25 hover:-translate-y-1">
                  <Link href="/sign-up">
                    <span className="relative z-10 flex items-center">
                      Start Building Now
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </Link>
                </Button>
              </div>
            </AnimatedSection>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="group inline-flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white transition-all duration-300 group-hover:scale-110">
                  <Video className="h-5 w-5" />
                </div>
                <span className={`${brandMono.className} text-xl font-bold`}>
                  kolla
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-slate-600">
                Video built for the next rep. Open source film study for sports teams.
              </p>
            </div>
            <div>
              <h4 className={`${brandMono.className} mb-4 font-bold text-slate-900`}>
                Product
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="/sign-up" className="transition-all duration-300 hover:text-slate-900 hover:translate-x-1 inline-block">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="transition-all duration-300 hover:text-slate-900 hover:translate-x-1 inline-block">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className={`${brandMono.className} mb-4 font-bold text-slate-900`}>
                Resources
              </h4>
              <ul className="space-y-2 text-sm text-slate-600">
                <li>
                  <Link href="https://github.com/hmps/kolla.video" className="transition-all duration-300 hover:text-slate-900 hover:translate-x-1 inline-block">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="mailto:team@kolla.video" className="transition-all duration-300 hover:text-slate-900 hover:translate-x-1 inline-block">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-500">
            © {new Date().getFullYear()} Kolla — video built for the next rep.
          </div>
        </div>
      </footer>
    </div>
  );
}
