import { auth } from "@/lib/auth";
import { ArrowRight, Video, Upload, Tag, Users, Eye, Shield, FolderOpen, MessageCircle, Github } from "lucide-react";
import { headers } from "next/headers";
import { Space_Mono, Inter } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

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
  },
  {
    icon: Tag,
    title: "Tag what matters",
    description:
      "Mark plays, drill segments, and player moments so you can jump back to the right teaching point in seconds.",
  },
  {
    icon: Users,
    title: "Coach together",
    description:
      "Share playlists with staff and athletes. Comments and assignments stay tied to the exact timestamp, even on mobile.",
  },
  {
    icon: Eye,
    title: "See who watched",
    description:
      "Simple viewing stats show who has caught up on film, helping you plan the next session with confidence.",
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
  },
];

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className={`${bodyFont.className} min-h-screen bg-white text-slate-800`}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
              <Video className="h-5 w-5" />
            </div>
            <span className={`${brandMono.className} text-xl font-bold`}>
              kolla
            </span>
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              href="https://github.com/hmps/kolla.video"
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              GitHub
            </Link>
            <Link
              href="/sign-in"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-28">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div>
                <p className="mb-4 text-sm font-medium uppercase tracking-wider text-slate-500">
                  Built by coaches, for coaches
                </p>
                <h1 className={`${brandMono.className} text-4xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-[3.25rem]`}>
                  Film Study That Doesn&apos;t Break the Bank.
                </h1>
                <p className="mt-6 text-lg leading-relaxed text-slate-600">
                  Kolla keeps film study friendly and focused: film the game, upload
                  to Kolla, tag the moments, and share them with your squad.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button asChild className="rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800">
                    <Link href="/sign-up">
                      Get Started Free <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-md border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    <Link href="https://github.com/hmps/kolla.video">
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </div>
              {/* Phone Mockup Placeholder */}
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="h-[500px] w-[260px] overflow-hidden rounded-[40px] border-8 border-slate-900 bg-gradient-to-br from-slate-100 to-slate-200 shadow-2xl">
                    <div className="flex h-full flex-col">
                      {/* Phone status bar */}
                      <div className="flex items-center justify-center bg-slate-900 py-2">
                        <div className="h-6 w-24 rounded-full bg-slate-800" />
                      </div>
                      {/* App content placeholder */}
                      <div className="flex-1 p-4">
                        <div className="mb-4 h-4 w-20 rounded bg-slate-300" />
                        <div className="mb-3 aspect-video w-full rounded-lg bg-gradient-to-br from-slate-300 to-slate-400" />
                        <div className="mb-2 h-3 w-full rounded bg-slate-300" />
                        <div className="mb-4 h-3 w-3/4 rounded bg-slate-300" />
                        <div className="flex gap-2">
                          <div className="h-8 w-16 rounded bg-slate-900" />
                          <div className="h-8 w-16 rounded border border-slate-300 bg-white" />
                        </div>
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-300" />
                            <div className="flex-1">
                              <div className="mb-1 h-3 w-24 rounded bg-slate-300" />
                              <div className="h-2 w-32 rounded bg-slate-200" />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-300" />
                            <div className="flex-1">
                              <div className="mb-1 h-3 w-20 rounded bg-slate-300" />
                              <div className="h-2 w-28 rounded bg-slate-200" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Badges */}
        <section className="border-y border-slate-200 bg-slate-50 px-6 py-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-6 text-center text-sm text-slate-500">
              Trusted by youth clubs and academies
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
              {/* Placeholder logos */}
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-24 rounded bg-slate-300" />
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className={`${brandMono.className} text-center text-3xl font-bold text-slate-900`}>
              What&apos;s in the Box?
            </h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div key={feature.label} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                    <feature.icon className="h-5 w-5 text-slate-700" />
                  </div>
                  <span className={`${brandMono.className} text-sm font-medium text-slate-800`}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
              Get Started in Minutes
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-600">
              Film the game, drop the video into Kolla, and everything else
              is ready to go. No clutter, no maze of menus.
            </p>
            <div className="mt-12 grid gap-8 md:grid-cols-2">
              {flowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-4">
                    <span className={`${brandMono.className} text-sm font-bold text-slate-400`}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
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
              ))}
            </div>
          </div>
        </section>

        {/* Built for Coaches */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
              Built for Coaches, by Coaches
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-slate-600">
              We created Kolla for a youth handball club and the countless teams like it
              that just need a reliable video room without the enterprise price tag.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                  <span className="text-lg">💰</span>
                </div>
                <h3 className={`${brandMono.className} font-bold text-slate-900`}>
                  Keep budgets in check
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Hosted plans stay affordable, and you only pay for the service you actually use—no gold-plated bundles.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                  <span className="text-lg">🚀</span>
                </div>
                <h3 className={`${brandMono.className} font-bold text-slate-900`}>
                  Fuel player growth
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Video is a development accelerator, so every feature keeps athletes learning and coaches teaching.
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
                  <span className="text-lg">🔓</span>
                </div>
                <h3 className={`${brandMono.className} font-bold text-slate-900`}>
                  Open source
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Every line of code lives in the open. Self-host it or let us handle it—your choice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
              Use Cases
            </h2>
            <div className="mt-12 grid gap-8 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <div key={useCase.title}>
                  <h3 className={`${brandMono.className} text-xl font-bold text-slate-900`}>
                    {useCase.title}
                  </h3>
                  <p className="mt-2 text-slate-600">{useCase.description}</p>
                  <ul className="mt-4 space-y-2">
                    {useCase.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                        <span className="mt-1 text-slate-400">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-slate-200 px-6 py-20">
          <div className="mx-auto max-w-6xl">
            <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
              FAQs
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
              {faqs.map((faq) => (
                <div key={faq.question}>
                  <h3 className={`${brandMono.className} font-bold text-slate-900`}>
                    {faq.question}
                  </h3>
                  <p className="mt-2 text-slate-600">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="px-6 py-20">
          <div className="mx-auto max-w-6xl text-center">
            <h2 className={`${brandMono.className} text-3xl font-bold text-slate-900`}>
              Ready to level up your film study?
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Get started free. No credit card required.
            </p>
            <div className="mt-8">
              <Button asChild className="rounded-md bg-slate-900 px-8 py-3 text-sm font-medium text-white hover:bg-slate-800">
                <Link href="/sign-up">
                  Start Building Now <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <Video className="h-5 w-5" />
                </div>
                <span className={`${brandMono.className} text-xl font-bold`}>
                  kolla
                </span>
              </div>
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
                  <Link href="/sign-up" className="hover:text-slate-900">
                    Get Started
                  </Link>
                </li>
                <li>
                  <Link href="/sign-in" className="hover:text-slate-900">
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
                  <Link href="https://github.com/hmps/kolla.video" className="hover:text-slate-900">
                    GitHub
                  </Link>
                </li>
                <li>
                  <Link href="mailto:team@kolla.video" className="hover:text-slate-900">
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
