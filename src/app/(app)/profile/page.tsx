import Link from "next/link";
import {
  Link2, FolderGit2, Globe, MapPin, Briefcase, GraduationCap, Wrench, Clock,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type {
  ParsedCertification, ParsedEducation, ParsedExperience, ParsedProject,
} from "@/lib/resume/schema";
import {
  AboutSection, DetailsSection, ChipsSection,
  ExperienceSection, EducationSection, CertificationsSection, ProjectsSection,
  skillsIcon, langIcon,
} from "./profile-client";

export const dynamic = "force-dynamic";

const arr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function Stat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3.5 py-2">
      <Icon size={16} className="shrink-0 text-muted" strokeWidth={2} />
      <div className="leading-tight">
        <div className="text-sm font-semibold text-foreground">{value}</div>
        <div className="text-[11px] text-muted">{label}</div>
      </div>
    </div>
  );
}

function SocialLink({ href, icon: Icon }: { href: string; icon: LucideIcon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted transition-colors hover:border-foreground hover:text-foreground"
    >
      <Icon size={16} />
    </a>
  );
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: rd } = await supabase
    .from("resume_data")
    .select("*")
    .eq("profile_id", user!.id)
    .maybeSingle();

  const onboarded = Boolean(profile?.full_name || profile?.resume_path);

  if (!onboarded) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-14">
        <h1 className="text-[32px] font-semibold tracking-[-0.4px] text-foreground">Profile</h1>
        <div className="mt-8 rounded-2xl bg-background p-8 text-center shadow-card">
          <p className="text-base font-medium text-foreground">Let’s set up your profile</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Upload your résumé and add your details so we can auto-fill applications for you.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-block rounded-full bg-[#19191a] px-6 py-2.5 text-sm font-medium text-white hover:opacity-90"
          >
            Complete onboarding
          </Link>
        </div>
      </main>
    );
  }

  const wa = (profile?.work_authorization ?? {}) as { us?: boolean; needs_sponsorship?: boolean };
  const name = profile?.full_name ?? "Your profile";
  const initial = name.trim()[0]?.toUpperCase() ?? "?";

  const experience = arr<ParsedExperience>(rd?.experience);
  const education = arr<ParsedEducation>(rd?.education);
  const skills = arr<string>(rd?.skills);
  const languages = arr<string>(rd?.languages);

  const stats: { icon: LucideIcon; value: string; label: string }[] = [];
  if (rd?.years_experience) stats.push({ icon: Clock, value: `${rd.years_experience}+`, label: "Years exp." });
  if (experience.length) stats.push({ icon: Briefcase, value: String(experience.length), label: "Roles" });
  if (skills.length) stats.push({ icon: Wrench, value: String(skills.length), label: "Skills" });
  if (education.length) stats.push({ icon: GraduationCap, value: String(education.length), label: "Education" });
  if (profile?.location) stats.push({ icon: MapPin, value: profile.location, label: "Location" });

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      {/* Hero header */}
      <header className="overflow-hidden rounded-2xl shadow-card">
        <div className="h-24 bg-gradient-to-br from-black/[0.07] via-black/[0.03] to-transparent" />
        <div className="bg-background px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-foreground text-3xl font-semibold text-background ring-4 ring-background">
              {initial}
            </span>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="truncate text-2xl font-semibold tracking-[-0.3px] text-foreground">{name}</h1>
              <p className="mt-1 truncate text-sm text-muted">
                {[rd?.headline, profile?.location].filter(Boolean).join(" · ") || "Add a headline below"}
              </p>
            </div>
            {(profile?.linkedin_url || profile?.github_url || profile?.portfolio_url) && (
              <div className="flex gap-2 pb-1">
                {profile?.linkedin_url && <SocialLink href={profile.linkedin_url} icon={Link2} />}
                {profile?.github_url && <SocialLink href={profile.github_url} icon={FolderGit2} />}
                {profile?.portfolio_url && <SocialLink href={profile.portfolio_url} icon={Globe} />}
              </div>
            )}
          </div>

          {stats.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2.5">
              {stats.map((s) => (
                <Stat key={s.label} icon={s.icon} value={s.value} label={s.label} />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Story (main, left) + facts (sidebar, right) */}
      <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
        <div className="flex flex-col gap-5">
          <AboutSection headline={rd?.headline ?? null} summary={rd?.summary ?? null} years={rd?.years_experience ?? null} />
          <ExperienceSection items={experience} />
          <EducationSection items={education} />
          <CertificationsSection items={arr<ParsedCertification>(rd?.certifications)} />
          <ProjectsSection items={arr<ParsedProject>(rd?.projects)} />
        </div>

        <div className="flex flex-col gap-5">
          <DetailsSection
            fullName={profile?.full_name ?? null}
            email={profile?.email ?? user?.email ?? null}
            phone={profile?.phone ?? null}
            location={profile?.location ?? null}
            address={profile?.address ?? null}
            city={profile?.city ?? null}
            postalCode={profile?.postal_code ?? null}
            country={profile?.country ?? null}
            linkedin={profile?.linkedin_url ?? null}
            github={profile?.github_url ?? null}
            portfolio={profile?.portfolio_url ?? null}
            authorizedUs={Boolean(wa.us)}
            needsSponsorship={Boolean(wa.needs_sponsorship)}
          />
          <ChipsSection title="Skills" icon={skillsIcon} field="skills" items={skills} />
          <ChipsSection title="Languages" icon={langIcon} field="languages" items={languages} />
        </div>
      </div>
    </main>
  );
}
