import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Receipt,
  ShieldCheck,
  BarChart3,
  FileText,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Receipt,
    title: "Expense Submission",
    description:
      "Submit expenses with file attachments. Supports images, PDFs, and Word documents up to 4 MB each.",
  },
  {
    icon: ShieldCheck,
    title: "Role-Based Access",
    description:
      "Employee, Finance, and Admin roles with granular permissions tailored to each responsibility.",
  },
  {
    icon: BarChart3,
    title: "Spending Policies",
    description:
      "Enforce per-position spending limits and transaction caps automatically at submission time.",
  },
  {
    icon: FileText,
    title: "Full Audit Trail",
    description:
      "Every status change is logged. Complete expense history from draft to reimbursed.",
  },
  {
    icon: Users,
    title: "Multi-Company",
    description:
      "Manage multiple organizations with isolated data, employees, and approval hierarchies.",
  },
  {
    icon: Zap,
    title: "Fast Approvals",
    description:
      "Streamlined approval workflow moves expenses from submission to reimbursement quickly.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center">
              <Receipt className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">
              Imbursare
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              Sign In
            </Button>
            <Button size="sm" render={<Link href="/register" />}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden py-24 sm:py-32">
          {/* Background gradient orbs */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10"
          >
            <div className="absolute -top-40 -right-32 h-150 w-150 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-32 h-125 w-125 rounded-full bg-accent/10 blur-3xl" />
          </div>

          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-foreground mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Now with multi-company support
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
              Expense reimbursement,{" "}
              <span className="text-primary dark:text-primary">simplified</span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground leading-relaxed">
              Imbursare streamlines how your team submits, approves, and
              reimburses expenses — with policy enforcement, audit trails, and
              role-based access built in.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8" render={<Link href="/register" />}>
                Start for free
              </Button>
              <Button size="lg" variant="outline" className="px-8" render={<Link href="/login" />}>
                Sign in
              </Button>
            </div>
          </div>
        </section>

        {/* Stats banner */}
        <section className="border-y border-border bg-muted/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
            {[
              { label: "Companies", value: "500+" },
              { label: "Expenses Processed", value: "1M+" },
              { label: "Avg. Approval Time", value: "< 2 hrs" },
              { label: "Uptime", value: "99.9%" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                Everything your finance team needs
              </h2>
              <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                From submission to reimbursement, every step is tracked,
                enforced, and auditable.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map(({ icon: Icon, title, description }) => (
                <Card
                  key={title}
                  className="group border-border hover:border-primary/40 transition-colors duration-200"
                >
                  <CardHeader className="pb-3">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Icon className="h-5 w-5 text-primary dark:text-primary" />
                    </div>
                    <CardTitle className="text-base">{title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-primary text-primary-foreground">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Ready to simplify reimbursements?
            </h2>
            <p className="mt-4 text-primary-foreground/70 max-w-lg mx-auto">
              Set up your company, invite your team, and start processing
              expenses in minutes.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-8 bg-accent text-accent-foreground hover:bg-accent/90"
                render={<Link href="/register" />}
              >
                Create your company
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                render={<Link href="/login" />}
              >
                Sign in
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-primary flex items-center justify-center">
              <Receipt className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-medium text-foreground">Imbursare</span>
          </div>
          <p>© {new Date().getFullYear()} Imbursare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
