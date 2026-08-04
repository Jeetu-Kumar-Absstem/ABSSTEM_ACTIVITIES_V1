import { useEffect, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ContactRound,
  Database,
  FileText,
  Mail,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const LAST_UPDATED = 'August 2026';
const PAGE_TITLE = 'Account Deletion Request | ABSSTEM Activities';
const META_DESCRIPTION =
  'Account Deletion Request page for ABSSTEM Activities, including instructions for requesting deletion of employee accounts and associated personal data.';

const tocItems = [
  { id: 'account-deletion', label: 'Account Deletion' },
  { id: 'how-to-request-account-deletion', label: 'How to Request Account Deletion' },
  { id: 'verification-process', label: 'Verification Process' },
  { id: 'what-will-be-deleted', label: 'What Will Be Deleted' },
  { id: 'data-retention', label: 'Data Retention' },
  { id: 'processing-time', label: 'Processing Time' },
  { id: 'need-assistance', label: 'Need Assistance?' },
  { id: 'questions', label: 'Questions' },
];

const highlightCards = [
  {
    icon: ShieldCheck,
    title: 'Verified Requests',
    text: 'Deletion requests are reviewed to protect employee accounts and prevent unauthorized action.',
  },
  {
    icon: Database,
    title: 'Controlled Removal',
    text: 'Approved requests remove the employee profile and associated application data where applicable.',
  },
  {
    icon: ContactRound,
    title: 'Direct Support',
    text: 'Employees can contact ABSSTEM Technologies directly for help with the deletion process.',
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

function AccountDeletionPage() {
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
                Account Deletion
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
                Account Deletion Request
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
                Information about requesting deletion of your ABSSTEM Activities account and associated personal data.
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
                ABSSTEM Activities is an internal employee engagement application developed and managed by ABSSTEM Technologies. This page explains how employees can request account deletion and what information may be removed after verification and approval.
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
            <SectionCard id="account-deletion" icon={Sparkles} title="Account Deletion">
              <p style={{ margin: 0 }}>
                ABSSTEM Activities is an internal employee engagement application developed and managed by ABSSTEM Technologies.
              </p>
              <p style={{ marginBottom: 0 }}>
                Employee accounts are created and managed by the organization. If you would like your account and associated application data to be permanently deleted, you may submit an account deletion request by contacting our support team.
              </p>
            </SectionCard>

            <SectionCard id="how-to-request-account-deletion" icon={Mail} title="How to Request Account Deletion">
              <ol style={{ margin: 0, paddingLeft: '20px' }}>
                <li style={{ marginBottom: '14px' }}>
                  Send an email to
                  <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--text-strong)' }}>
                    contact@absstem.com
                  </div>
                </li>
                <li style={{ marginBottom: '14px' }}>
                  Use the subject
                  <div style={{ marginTop: '6px', fontWeight: 800, color: 'var(--text-strong)' }}>
                    Account Deletion Request
                  </div>
                </li>
                <li>
                  Include the following information
                  <ul style={{ margin: '12px 0 0 20px', padding: 0 }}>
                    <li>Full Name</li>
                    <li>Employee ID (if available)</li>
                    <li>Registered Email Address</li>
                    <li>Reason for requesting deletion (optional)</li>
                  </ul>
                </li>
              </ol>
            </SectionCard>

            <SectionCard id="verification-process" icon={ShieldCheck} title="Verification Process">
              <p style={{ marginTop: 0 }}>
                To protect employee accounts and prevent unauthorized deletion requests, ABSSTEM Technologies may verify your identity before processing your request.
              </p>
              <p style={{ marginBottom: 0 }}>
                Additional information may be requested if required.
              </p>
            </SectionCard>

            <SectionCard id="what-will-be-deleted" icon={CheckCircle2} title="What Will Be Deleted">
              <p style={{ marginTop: 0 }}>
                When your request has been verified and approved, we will permanently delete, where applicable:
              </p>
              <ul style={{ margin: '14px 0 0 20px', padding: 0 }}>
                <li>Employee account</li>
                <li>User profile</li>
                <li>Authentication credentials</li>
                <li>Tournament registrations</li>
                <li>Court bookings</li>
                <li>Booking history</li>
                <li>Activity participation</li>
                <li>Event participation</li>
                <li>Notification preferences</li>
                <li>Associated application data</li>
              </ul>
            </SectionCard>

            <SectionCard id="data-retention" icon={Database} title="Data Retention">
              <p style={{ margin: 0 }}>
                Certain information may be retained for a limited period if required to comply with applicable laws, legal obligations, internal audit requirements, fraud prevention, security purposes, or other legitimate business requirements.
              </p>
              <p style={{ marginBottom: 0 }}>
                Any retained information will only be kept for the minimum period necessary.
              </p>
            </SectionCard>

            <SectionCard id="processing-time" icon={CalendarClock} title="Processing Time">
              <p style={{ margin: 0 }}>
                We aim to review and process verified account deletion requests within a reasonable time after receiving the request.
              </p>
              <p style={{ marginBottom: 0 }}>
                If additional verification is required, processing may take longer.
              </p>
            </SectionCard>

            <SectionCard id="need-assistance" icon={ContactRound} title="Need Assistance?">
              <div
                className="clay-soft"
                style={{
                  padding: '18px',
                  borderRadius: '24px',
                  background:
                    'linear-gradient(135deg, rgba(var(--accent-rgb), 0.08), rgba(255,255,255,0.86))',
                }}
              >
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Contact Support
                    </div>
                    <div style={{ marginTop: '6px', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-strong)' }}>
                      Email
                    </div>
                    <a
                      href="mailto:contact@absstem.com"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: 'var(--accent)', textDecoration: 'none' }}
                    >
                      contact@absstem.com
                      <ArrowRight size={14} />
                    </a>
                  </div>

                  <a
                    href="mailto:contact@absstem.com"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px 16px',
                      borderRadius: '18px',
                      background: 'var(--accent)',
                      color: '#fff',
                      textDecoration: 'none',
                      fontWeight: 800,
                      boxShadow: 'var(--surface-shadow-soft)',
                    }}
                  >
                    <Mail size={16} />
                    Email Support
                  </a>
                </div>
              </div>
            </SectionCard>

            <SectionCard id="questions" icon={Users} title="Questions">
              <p style={{ margin: 0 }}>
                If you have any questions regarding your account, privacy, or personal data, please contact:
              </p>
              <p style={{ marginBottom: 0, fontWeight: 800, color: 'var(--text-strong)' }}>
                contact@absstem.com
              </p>
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

              <nav aria-label="Account deletion table of contents">
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
                Deletion Snapshot
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.7, color: 'var(--text-soft)' }}>
                This page explains how employees can request account deletion, what information may be removed, and how ABSSTEM Technologies verifies requests before processing them.
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
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Last Updated
          </div>
          <p style={{ margin: '6px 0 0', fontSize: '0.95rem', color: 'var(--text-strong)', fontWeight: 800, lineHeight: 1.6 }}>
            {LAST_UPDATED}
          </p>
        </footer>
      </main>
    </div>
  );
}

export default AccountDeletionPage;
