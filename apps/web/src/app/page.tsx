import { SignInButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Video } from "lucide-react";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const WAITLIST_URL = "https://kolla.video/waitlist";
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
const brandSans = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const flowSteps = [
  {
    title: "Film it your way",
    description:
      "Drop in full matches, practice scrimmages, or quick phone clips. Kolla keeps the quality and gets the video ready fast.",
  },
  {
    title: "Tag what matters",
    description:
      "Mark plays, drill segments, and player moments so you can jump back to the right teaching point in seconds.",
  },
  {
    title: "Coach together",
    description:
      "Share playlists with staff and athletes. Comments and assignments stay tied to the exact timestamp, even on mobile.",
    highlight: true,
  },
  {
    title: "See who watched",
    description:
      "Simple viewing stats show who has caught up on film, helping you plan the next session with confidence.",
  },
];
const principles = [
  {
    title: "Built by coaches",
    copy: "Created for a youth handball club and the countless teams like it that just need a reliable video room.",
  },
  {
    title: "Keep budgets in check",
    copy: "Hosted plans stay affordable, and you only pay for the service you actually use—no gold-plated bundles.",
  },
  {
    title: "Fuel player growth",
    copy: "Video is a development accelerator, so every feature keeps athletes learning and coaches teaching.",
  },
];
const capabilities = [
  {
    title: "Roles that make sense",
    copy: "Set different access for coaches, athletes, and guardians so everyone sees exactly what they need.",
  },
  {
    title: "Flexible collections",
    copy: "Group clips by opponent, season, or training block and keep everything tidy as new film comes in.",
  },
  {
    title: "Conversation on the timeline",
    copy: "Leave comments, questions, and shout-outs right on the play so feedback sticks after practice.",
  },
];

function WaitlistCta({ variant = "light" }: { variant?: "light" | "dark" }) {
  const isLight = variant === "light";
  return (
    <div
      className={`rounded-[40px] border-2 p-6 sm:p-8 ${
        isLight
          ? "border-slate-300 bg-slate-50 text-slate-900"
          : "border-slate-700 bg-slate-800 text-slate-100"
      }`}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-4 sm:max-w-md">
          <p
            className={`text-xs uppercase tracking-[0.35em] ${
              isLight ? "text-slate-500" : "text-slate-300"
            }`}
          >
            Waitlist
          </p>
          <h3
            className={`${brandSans.className} text-2xl font-semibold sm:text-[2rem] ${
              isLight ? "text-slate-900" : "text-slate-50"
            }`}
          >
            Secure a spot for your next season.
          </h3>
          <p
            className={`text-sm leading-relaxed ${
              isLight ? "text-slate-600" : "text-slate-200"
            }`}
          >
            Add your best contact and we’ll reach out as new cohorts open with
            onboarding materials tailored to your club.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <form
            action={WAITLIST_URL}
            method="get"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Input
              type="email"
              name="email"
              placeholder="coach@club.com"
              className={`h-12 rounded-full border px-5 text-sm sm:text-base ${
                isLight
                  ? "border-slate-300 bg-white text-slate-900 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-slate-700"
                  : "border-slate-700 bg-slate-900 text-slate-100 placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200/60"
              }`}
              required
            />
            <Button
              type="submit"
              className={`h-12 rounded-full px-6 text-sm font-semibold sm:text-base ${
                isLight
                  ? "bg-slate-900 text-slate-50 hover:bg-slate-800"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              Join Waitlist
            </Button>
          </form>
          <p
            className={`mt-3 text-xs ${
              isLight ? "text-slate-500" : "text-slate-300"
            } sm:text-sm`}
          >
            We reply within a few days with a quick checklist and sample
            workflows.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <header className="fixed left-1/2 top-6 z-50 flex w-full -translate-x-1/2 justify-center px-4 sm:px-8">
        <div className="flex w-full max-w-7xl items-center justify-between rounded-full border-2 border-slate-700 bg-slate-50 px-6 py-3 text-slate-900 shadow-[0_10px_40px_rgba(15,23,42,0.35)] sm:px-10">
          <div className="flex items-center gap-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-700 bg-white text-slate-900">
              <Video className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <span
                className={`${brandSans.className} text-xl font-semibold uppercase tracking-[0.14em]`}
              >
                Kolla.video
              </span>
              <p className="text-[0.65rem] uppercase tracking-[0.12em] text-slate-500">
                Video for every team
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="ghost"
              className="rounded-full border border-slate-300 px-5 py-2 text-xs font-medium uppercase tracking-[0.28em] text-slate-900 hover:bg-slate-200"
            >
              <Link href="https://github.com/hmps/kolla.video">GitHub</Link>
            </Button>
            <SignInButton mode="modal">
              <Button className="rounded-full border border-slate-900 bg-slate-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-100 hover:bg-slate-800">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>
      </header>
      <main className="space-y-0 pb-24 pt-36">
        <section className="border-b h-[70vh] border-slate-800 px-8 py-24 sm:px-16 sm:py-32 lg:px-32">
          <div className="w-full max-w-5xl">
            <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
              Built By Coaches
            </p>
            <h1
              className={`${brandSans.className} mt-6 max-w-6xl text-7xl font-semibold leading-[1.05] sm:text-6xl md:text-[4.25rem]`}
            >
              Film study that doesn't break the bank
            </h1>
            <p className="mt-8 max-w-6xl text-lg leading-relaxed text-slate-200">
              Kolla keeps film study friendly and focused: film the game,
              upload to Kolla, tag the moments, and share them with your squad.
            </p>
          </div>
        </section>
        <section className="border-b border-slate-200 bg-slate-50 px-8 py-28 text-slate-900 sm:px-16 sm:py-36 lg:px-32">
          <div className="w-full">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-4xl">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                  How It Works
                </p>
                <h2
                  className={`${brandSans.className} mt-4 text-4xl font-semibold leading-tight sm:text-[3.2rem]`}
                >
                  From camera roll to team review in minutes.
                </h2>
                <p className="mt-6 text-base leading-relaxed text-slate-600 sm:text-lg">
                  Film the game, drop the video into Kolla, and everything else
                  is ready to go. No clutter, no maze of menus—just the steps
                  coaches actually run every week.
                </p>
              </div>
            </div>
            <div className="mt-16 grid gap-6 lg:grid-cols-2">
              {flowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className={`relative border-2 px-8 py-10 ${
                    step.highlight
                      ? "border-slate-900 bg-slate-900 text-slate-50"
                      : "border-slate-200 bg-white text-slate-900"
                  }`}
                >
                  <div className="absolute left-8 top-8 text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
                    {String(index + 1).padStart(2, "0")}
                  </div>
                  <div className="pl-20">
                    <h3
                      className={`${brandSans.className} text-2xl font-semibold sm:text-3xl`}
                    >
                      {step.title}
                    </h3>
                    <p
                      className={`mt-4 text-sm leading-relaxed sm:text-base ${
                        step.highlight ? "text-slate-200" : "text-slate-600"
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-b border-slate-800 px-8 py-28 sm:px-16 sm:py-36 lg:px-32">
          <div className="w-full">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-7">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  Why Kolla
                </p>
                <h2
                  className={`${brandSans.className} mt-4 text-4xl font-semibold leading-tight sm:text-[3.2rem]`}
                >
                  Built to stay out of the way of real coaching.
                </h2>
              </div>
            </div>
            <div className="mt-16 grid gap-12 lg:grid-cols-3">
              {principles.map((principle) => (
                <div
                  key={principle.title}
                  className="border-2 border-slate-700 bg-slate-800 p-10"
                >
                  <h3
                    className={`${brandSans.className} text-2xl font-semibold text-slate-50`}
                  >
                    {principle.title}
                  </h3>
                  <p className="mt-5 text-sm leading-relaxed text-slate-300 sm:text-base">
                    {principle.copy}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <section className="border-b border-slate-200 bg-slate-200 px-8 py-28 text-slate-900 sm:px-16 sm:py-36 lg:px-32">
          <div className="w-full">
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                  Team Access
                </p>
                <h2
                  className={`${brandSans.className} mt-4 text-4xl font-semibold leading-tight sm:text-[3.2rem]`}
                >
                  Controls that match how clubs actually work.
                </h2>
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">
                  Invite the whole club, share playlists with a click, and see
                  who has watched which clips so you know where to follow up.
                  It’s everything you need to keep the group aligned before the
                  next session.
                </p>
              </div>
              <div className="grid gap-8 lg:grid-cols-3">
                {capabilities.map((item) => (
                  <div
                    key={item.title}
                    className="border-2 border-slate-500 bg-slate-50 p-10"
                  >
                    <h3
                      className={`${brandSans.className} text-2xl font-semibold text-slate-900`}
                    >
                      {item.title}
                    </h3>
                    <p className="mt-5 text-sm leading-relaxed text-slate-600 sm:text-base">
                      {item.copy}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="border-b border-slate-200 bg-slate-50 px-8 py-28 text-slate-900 sm:px-16 sm:py-36 lg:px-32">
          <div className="w-full">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-6">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">
                  Open Source
                </p>
                <h2
                  className={`${brandSans.className} mt-4 text-4xl font-semibold leading-tight sm:text-[3.2rem]`}
                >
                  Run Kolla your way.
                </h2>
              </div>
              <div className="mt-10 space-y-6 text-base leading-relaxed text-slate-600 sm:text-lg lg:col-span-6 lg:mt-0">
                <p>
                  Kolla is open source, so every line of code lives in the open.
                  If you want to self-host, clone the repo, point it at your
                  storage, and keep full control of your footage and data.
                </p>
                <p>
                  Prefer not to run servers? Join the hosted waitlist and we’ll
                  handle storage, updates, and onboarding while you focus on
                  coaching.
                </p>
                <Button
                  asChild
                  className="inline-flex items-center rounded-none border-2 border-slate-900 bg-slate-900 px-6 py-3 text-sm font-semibold uppercase tracking-[0.24em] text-slate-50 hover:bg-slate-800"
                >
                  <Link href="https://github.com/hmps/kolla.video">
                    Explore GitHub
                    <ArrowRight className="ml-3 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="px-8 py-28 sm:px-16 sm:py-36 lg:px-32">
          <div className="w-full">
            <div className="lg:grid lg:grid-cols-12 lg:gap-16">
              <div className="lg:col-span-5">
                <p className="text-xs uppercase tracking-[0.4em] text-slate-400">
                  FAQ
                </p>
                <h2
                  className={`${brandSans.className} mt-4 text-4xl font-semibold leading-tight sm:text-[3.2rem]`}
                >
                  Answers for busy coaches.
                </h2>
              </div>
              <div className="mt-12 space-y-8 text-slate-200 lg:col-span-7 lg:mt-0">
                {faqs.map((faq) => (
                  <div
                    key={faq.question}
                    className="border-b border-slate-800 pb-6"
                  >
                    <p
                      className={`${brandSans.className} text-2xl font-semibold text-slate-100`}
                    >
                      {faq.question}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-slate-400 sm:text-base">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800 px-6 py-14 text-xs uppercase tracking-[0.32em] text-slate-500 sm:px-12 lg:px-16">
        <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Kolla — video built for the next rep.
          </p>
          <Link href="mailto:team@kolla.video" className="hover:text-slate-200">
            team@kolla.video
          </Link>
        </div>
      </footer>
    </div>
  );
}
