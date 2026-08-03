import { useEffect, type ReactNode } from 'react';
import {
  ArrowRight,
  BellRing,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Globe,
  HardDriveUpload,
  Mail,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
  LockKeyhole,
  ServerCog,
  ContactRound,
  Clock3,
} from 'lucide-react';

const LAST_UPDATED = 'August 3, 2026';
const PAGE_TITLE = 'Privacy Policy | ABSSTEM Activities';
const META_DESCRIPTION =
  'Privacy Policy for ABSSTEM Activities, the employee engagement and tournament management application developed by ABSSTEM Technologies.';

const tocItems = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'information-we-collect', label: 'Information We Collect' },
  { id: 'how-we-use-information', label: 'How We Use Information' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'database', label: 'Database' },
  { id: 'push-notifications', label: 'Push Notifications' },
  { id: 'information-sharing', label: 'Information Sharing' },
  { id: 'data-security', label: 'Data Security' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'employee-rights', label: 'Employee Rights' },
  { id: 'children', label: 'Children' },
  { id: 'third-party-services', label: 'Third Party Services' },
  { id: 'changes', label: 'Changes to This Policy' },
  { id: 'contact-information', label: 'Contact Information' },
];

const highlightCards = [
  {
    icon: ShieldCheck,
    title: 'Secure Access',
    text: 'Employee identity is verified through Supabase Authentication before access is granted.',
  },
  {
    icon: BellRing,
    title: 'Timely Updates',
    text: 'Tournament and activity notifications are delivered through Firebase Cloud Messaging.',
  },
  {
    icon: LockKeyhole,
    title: 'Controlled Sharing',
    text: 'Information is only shared with trusted providers or when required by law.',
  },
];

function scrollToSection(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function SectionCard({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof ShieldCheck;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="clay-card"
      style={{
        padding: '0',
        overflow: 'hidden',
        scrollMarginTop: '120px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '22px 22px 14px',
          borderBottom: '1px solid var(--border)',
          background:
            'linear-gradient(135deg, rgba(var(--accent-rgb), 0.06), rgba(255,255,255,0))',
        }}
      >
        <div
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '16px',
            background: 'var(--accent-soft)',
            color: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon size={20} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h2
            style={{
              margin: 0,
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--text-strong)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h2>
        </div>
      </div>

      <div style={{ padding: '20px 22px 22px', lineHeight: 1.75, color: 'var(--text)' }}>
        {children}
      </div>
    </section>
  );
}

function PrivacyPolicy() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = PAGE_TITLE;

    const previousDescription =
      document.querySelector<HTMLMetaElement>('meta[name="description"]')?.getAttribute('content') ?? '';

    let descriptionTag = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!descriptionTag) {
      descriptionTag = document.createElement('meta');
      descriptionTag.setAttribute('name', 'description');
      document.head.appendChild(descriptionTag);
    }
    descriptionTag.setAttribute('content', META_DESCRIPTION);

    const previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'smooth';

    return () => {
      document.title = previousTitle;
      if (descriptionTag) {
        descriptionTag.setAttribute('content', previousDescription);
      }
      document.documentElement.style.scrollBehavior = previousScrollBehavior;
    };
  }, []);

  return (
    <div
      className="privacy-policy-page"
      style={{
        minHeight: '100vh',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        background:
          'radial-gradient(circle at top left, rgba(var(--accent-rgb), 0.12), transparent 28%), radial-gradient(circle at top right, rgba(49, 210, 200, 0.10), transparent 24%), var(--bg)',
        color: 'var(--text)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0))',
          pointerEvents: 'none',
        }}
      />

      <main
        style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <header
          className="clay-card"
          style={{
            padding: '28px',
            borderRadius: '32px',
            background:
              'linear-gradient(135deg, rgba(var(--accent-rgb), 0.12), rgba(255,255,255,0.9) 46%, rgba(49, 210, 200, 0.08))',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ maxWidth: '720px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'var(--bg-surface-strong)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border)',
                  boxShadow: 'var(--surface-shadow-soft)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  marginBottom: '16px',
                }}
              >
                <FileText size={14} />
                Privacy Policy
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 'clamp(2rem, 4vw, 3.4rem)',
                  lineHeight: 1.05,
                  fontWeight: 900,
                  color: 'var(--text-strong)',
                  letterSpacing: '-0.03em',
                }}
              >
                Privacy Policy
              </h1>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 'clamp(1rem, 1.9vw, 1.15rem)',
                  lineHeight: 1.7,
                  color: 'var(--text-soft)',
                  maxWidth: '680px',
                }}
              >
                ABSSTEM Activities Mobile &amp; Web Application
              </p>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: '0.98rem',
                  lineHeight: 1.75,
                  color: 'var(--text)',
                  maxWidth: '760px',
                }}
              >
                Welcome to ABSSTEM Activities. ABSSTEM Activities is an employee engagement and tournament management application developed by ABSSTEM Technologies. This Privacy Policy explains how we collect, use, store and protect information when employees use our web application and Android application.
              </p>
            </div>

            <div
              style={{
                minWidth: '250px',
                maxWidth: '320px',
                width: '100%',
                display: 'grid',
                gap: '12px',
              }}
            >
              <div
                className="clay-soft"
                style={{
                  padding: '16px',
                  borderRadius: '24px',
                  background: 'var(--bg-surface-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock3 size={18} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Last Updated
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--text-strong)', marginTop: '2px' }}>
                      {LAST_UPDATED}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="clay-soft"
                style={{
                  padding: '16px',
                  borderRadius: '24px',
                  background: 'var(--bg-surface-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ContactRound size={18} color="var(--accent)" />
                  <div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Support
                    </div>
                    <a
                      href="mailto:contact@absstem.com"
                      style={{
                        fontSize: '0.92rem',
                        fontWeight: 800,
                        color: 'var(--text-strong)',
                        textDecoration: 'none',
                      }}
                    >
                      contact@absstem.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          {highlightCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                className="clay-card"
                style={{
                  padding: '18px',
                  borderRadius: '24px',
                  minHeight: '100%',
                  background: 'var(--bg-surface-strong)',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '16px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <Icon size={18} />
                </div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: '1rem',
                    fontWeight: 800,
                    color: 'var(--text-strong)',
                  }}
                >
                  {card.title}
                </h2>
                <p style={{ margin: '8px 0 0', fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-soft)' }}>
                  {card.text}
                </p>
              </div>
            );
          })}
        </section>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 300px',
            gap: '20px',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: '18px', minWidth: 0 }}>
            <SectionCard id="introduction" icon={Sparkles} title="Introduction">
              <p style={{ margin: 0 }}>
                Welcome to ABSSTEM Activities. This application is designed for employees and authorized users only. It supports internal engagement, tournament management, activity participation, and administrative coordination across our web and Android experiences.
              </p>
            </SectionCard>

            <SectionCard id="information-we-collect" icon={Users} title="Information We Collect">
              <p style={{ marginTop: 0 }}>
                We may collect the following information when you use the application:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Employee Name</li>
                <li>Employee ID</li>
                <li>Email Address</li>
                <li>Department, if available</li>
                <li>Profile Information</li>
                <li>Tournament registrations</li>
                <li>Activity participation</li>
                <li>User preferences</li>
                <li>Device information required for app functionality</li>
                <li>Firebase push notification token</li>
                <li>Log information for troubleshooting</li>
              </ul>
              <p style={{ marginBottom: 0 }}>
                Passwords are securely managed through Supabase Authentication and are never stored in plain text by the application.
              </p>
            </SectionCard>

            <SectionCard id="how-we-use-information" icon={ClipboardListIcon} title="How We Use Information">
              <p style={{ marginTop: 0 }}>
                We use collected information to operate and improve the application, including:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Authentication and user login</li>
                <li>Managing tournaments</li>
                <li>Managing activities</li>
                <li>Sending notifications</li>
                <li>Improving application performance</li>
                <li>Providing customer support</li>
                <li>Security operations</li>
                <li>Analytics, only if implemented</li>
              </ul>
            </SectionCard>

            <SectionCard id="authentication" icon={ShieldCheck} title="Authentication">
              <p style={{ margin: 0 }}>
                The application uses Supabase Authentication. Authentication securely verifies employee identity before allowing access to the platform and its protected features.
              </p>
            </SectionCard>

            <SectionCard id="database" icon={Database} title="Database">
              <p style={{ margin: 0 }}>
                Employee information is securely stored in Supabase. Only authorized users and administrators may access permitted information based on their role and responsibilities.
              </p>
            </SectionCard>

            <SectionCard id="push-notifications" icon={BellRing} title="Push Notifications">
              <p style={{ marginTop: 0 }}>
                Firebase Cloud Messaging (FCM) is used to send notifications such as:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Tournament updates</li>
                <li>Activity reminders</li>
                <li>Announcements</li>
                <li>General app notifications</li>
              </ul>
              <p style={{ marginBottom: 0 }}>
                Users can disable notifications through device settings.
              </p>
            </SectionCard>

            <SectionCard id="information-sharing" icon={ServerCog} title="Information Sharing">
              <p style={{ marginTop: 0 }}>
                ABSSTEM does not sell employee personal information. Information is shared only with trusted service providers necessary for operating the application, such as Supabase and Firebase Cloud Messaging, or when required by law.
              </p>
              <div
                className="clay-soft"
                style={{
                  padding: '14px 16px',
                  borderRadius: '20px',
                  marginTop: '16px',
                  background: 'var(--bg-surface-strong)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent)', fontWeight: 800 }}>
                  <CheckCircle2 size={16} />
                  Trusted sharing only
                </div>
                <p style={{ margin: 0 }}>
                  Data is shared strictly to operate the product, support users, or meet legal obligations.
                </p>
              </div>
            </SectionCard>

            <SectionCard id="data-security" icon={LockKeyhole} title="Data Security">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>Encryption in transit</li>
                <li>Secure authentication</li>
                <li>Access controls</li>
                <li>Administrative permissions</li>
                <li>Reasonable technical safeguards</li>
              </ul>
              <p style={{ marginBottom: 0, marginTop: '14px' }}>
                We take security seriously, but no method of electronic storage or transmission is completely risk-free.
              </p>
            </SectionCard>

            <SectionCard id="data-retention" icon={HardDriveUpload} title="Data Retention">
              <p style={{ margin: 0 }}>
                Data is retained only as long as required for business operations or legal obligations.
              </p>
            </SectionCard>

            <SectionCard id="employee-rights" icon={FileText} title="Employee Rights">
              <p style={{ marginTop: 0 }}>
                Employees may request the following where applicable and permitted by company policy:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Correction of inaccurate information</li>
                <li>Contact with administrators regarding their data</li>
                <li>Deletion where applicable and permitted by policy</li>
              </ul>
            </SectionCard>

            <SectionCard id="children" icon={Smartphone} title="Children">
              <p style={{ margin: 0 }}>
                This application is intended only for employees and authorized users. It is not intended for children under 13.
              </p>
            </SectionCard>

            <SectionCard id="third-party-services" icon={Globe} title="Third Party Services">
              <p style={{ marginTop: 0 }}>
                The application may rely on the following third-party services:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Supabase</li>
                <li>Firebase Cloud Messaging</li>
                <li>Google Play Services on Android</li>
              </ul>
            </SectionCard>

            <SectionCard id="changes" icon={CalendarClock} title="Changes to This Privacy Policy">
              <p style={{ margin: 0 }}>
                ABSSTEM may update this Privacy Policy periodically. Users are encouraged to review this page occasionally to stay informed about changes.
              </p>
            </SectionCard>

            <SectionCard id="contact-information" icon={Mail} title="Contact Information">
              <div style={{ display: 'grid', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Company
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>ABSSTEM Technologies</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Website
                  </div>
                  <a
                    href="https://absstem.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    absstem.com
                    <ArrowRight size={14} />
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Support Email
                  </div>
                  <a
                    href="mailto:contact@absstem.com"
                    style={{ marginTop: '4px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--accent)', textDecoration: 'none' }}
                  >
                    contact@absstem.com
                    <ArrowRight size={14} />
                  </a>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Phone
                  </div>
                  <div style={{ marginTop: '4px', fontWeight: 700 }}>Not publicly listed. Please use email for support.</div>
                </div>
              </div>
            </SectionCard>
          </div>

          <aside
            style={{
              position: 'sticky',
              top: '24px',
              display: 'grid',
              gap: '16px',
            }}
          >
            <div
              className="clay-card"
              style={{
                padding: '18px',
                borderRadius: '24px',
                background: 'var(--bg-surface-strong)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '14px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '14px',
                    background: 'var(--accent-soft)',
                    color: 'var(--accent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronRight size={18} />
                </div>
                <div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--muted)',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                    }}
                  >
                    Table of Contents
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-strong)' }}>
                    Quick Navigation
                  </div>
                </div>
              </div>

              <nav aria-label="Privacy policy table of contents">
                <div style={{ display: 'grid', gap: '8px' }}>
                  {tocItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => scrollToSection(item.id)}
                      className="clay-soft"
                      style={{
                        width: '100%',
                        border: '1px solid var(--border)',
                        borderRadius: '18px',
                        padding: '10px 12px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text)',
                        textAlign: 'left',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        fontSize: '0.86rem',
                        fontWeight: 600,
                        transition: 'transform 0.15s ease, border-color 0.15s ease, background 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateX(3px)';
                        e.currentTarget.style.borderColor = 'var(--accent-soft-2)';
                        e.currentTarget.style.background = 'var(--accent-soft)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateX(0)';
                        e.currentTarget.style.borderColor = 'var(--border)';
                        e.currentTarget.style.background = 'var(--bg-surface)';
                      }}
                    >
                      <span>{item.label}</span>
                      <ChevronRight size={14} color="var(--muted)" />
                    </button>
                  ))}
                </div>
              </nav>
            </div>

            <div
              className="clay-card"
              style={{
                padding: '18px',
                borderRadius: '24px',
                background: 'var(--bg-surface-strong)',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                Privacy Snapshot
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-soft)' }}>
                This policy is written for ABSSTEM employees and authorized users. It focuses on secure access, limited sharing, and clear support channels for the ABSSTEM Activities platform.
              </p>
            </div>
          </aside>
        </div>

        <footer
          className="clay-card"
          style={{
            marginTop: '22px',
            padding: '18px 22px',
            borderRadius: '24px',
            background: 'var(--bg-surface-strong)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            © ABSSTEM Technologies. All Rights Reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

const ClipboardListIcon = FileText;

export default PrivacyPolicy;
