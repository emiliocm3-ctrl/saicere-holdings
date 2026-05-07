"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";

const i18n = {
  en: {
    hero: {
      mission:
        "To relentlessly pursue value creation and act as a catalyst for improvement.",
    },
    about: {
      label: "About",
      text: "Saicere Holdings deploys capital across venture capital, real estate, and debt — actively managing a diversified portfolio while operating a venture lab that creates and tests tools, products, and digital businesses from the ground up.",
      vision: {
        label: "Vision",
        text: "Autonomous infrastructure that enables the pursuit of curiosity and innovation.",
      },
    },
    pillars: {
      label: "What We Do",
      invest: {
        title: "Investments",
        desc: "Capital deployed across venture capital, real estate, and debt. We pursue asymmetric opportunities with a long-term, value-driven approach.",
      },
      manage: {
        title: "Portfolio Management",
        desc: "Active oversight and strategic support across all holdings. We provide operational guidance, network access, and long-term alignment to maximize value creation.",
      },
      lab: {
        title: "Venture Lab",
        desc: "Creating and testing tools, products, and digital businesses. We identify opportunities, build automation-first solutions, and scale operations from concept to launch.",
      },
    },
    values: {
      label: "Our Values",
      purpose: {
        title: "Purpose & Congruence",
        bullets: [
          "Purpose guides every decision. If it doesn\u2019t move us closer, we question it.",
          "What we say, what we value, and what we do must match.",
          "We don\u2019t defer life for later. We build aligned with who we are, starting now.",
        ],
      },
      collab: {
        title: "Collaboration & Connection",
        bullets: [
          "We work together because we want to, not because we have to.",
          "Ego stays at the door. Openness and emotional intelligence keep us connected.",
          "We bring direction, perspective, and space for reflection.",
        ],
      },
      curiosity: {
        title: "Curiosity & Innovation",
        bullets: [
          "We\u2019d rather learn something new than prove we\u2019re right.",
          "Innovation means creating more value \u2014 improving what exists or building what doesn\u2019t.",
          "We think in spectrums, not binaries. Why \u2192 What if \u2192 How.",
        ],
      },
      ambition: {
        title: "Ambition & Freedom",
        bullets: [
          "We keep moving. We don\u2019t settle and we don\u2019t coast.",
          "Freedom is choosing how we spend our time \u2014 but it can\u2019t come at someone else\u2019s expense.",
          "We grow in the direction of our shared vision, not just any direction.",
        ],
      },
    },
    footer: "\u00a9 2026 Saicere Holdings. All rights reserved.",
    signIn: "Sign In",
  },
  es: {
    hero: {
      mission:
        "Perseguir incansablemente la creaci\u00f3n de valor y actuar como catalizador de mejora.",
    },
    about: {
      label: "Nosotros",
      text: "Saicere Holdings despliega capital en venture capital, bienes ra\u00edces y deuda \u2014 gestionando activamente un portafolio diversificado mientras opera un laboratorio de ventures que crea y prueba herramientas, productos y negocios digitales desde cero.",
      vision: {
        label: "Visi\u00f3n",
        text: "Infraestructura aut\u00f3noma que permita la b\u00fasqueda de la curiosidad y la innovaci\u00f3n.",
      },
    },
    pillars: {
      label: "Lo Que Hacemos",
      invest: {
        title: "Inversiones",
        desc: "Capital desplegado en venture capital, bienes ra\u00edces y deuda. Perseguimos oportunidades asim\u00e9tricas con un enfoque de largo plazo orientado al valor.",
      },
      manage: {
        title: "Gesti\u00f3n de Portafolio",
        desc: "Supervisi\u00f3n activa y apoyo estrat\u00e9gico en todas las tenencias. Brindamos gu\u00eda operativa, acceso a redes y alineaci\u00f3n a largo plazo para maximizar la creaci\u00f3n de valor.",
      },
      lab: {
        title: "Laboratorio de Ventures",
        desc: "Creando y probando herramientas, productos y negocios digitales. Identificamos oportunidades, construimos soluciones automation-first y escalamos operaciones del concepto al lanzamiento.",
      },
    },
    values: {
      label: "Nuestros Valores",
      purpose: {
        title: "Prop\u00f3sito y Congruencia",
        bullets: [
          "El prop\u00f3sito gu\u00eda cada decisi\u00f3n. Si no nos acerca, lo cuestionamos.",
          "Lo que decimos, lo que valoramos y lo que hacemos tiene que coincidir.",
          "No diferimos la vida para despu\u00e9s. Construimos alineados con quienes somos, desde hoy.",
        ],
      },
      collab: {
        title: "Colaboraci\u00f3n y Conexi\u00f3n",
        bullets: [
          "Trabajamos juntos porque queremos, no porque debemos.",
          "El ego se queda en la puerta. La apertura y la inteligencia emocional nos mantienen conectados.",
          "Aportamos direcci\u00f3n, perspectiva y espacio para la reflexi\u00f3n.",
        ],
      },
      curiosity: {
        title: "Curiosidad e Innovaci\u00f3n",
        bullets: [
          "Preferimos aprender algo nuevo que demostrar que tenemos raz\u00f3n.",
          "Innovar es crear m\u00e1s valor \u2014 mejorar lo que existe o construir lo que no.",
          "Pensamos en espectros, no en binarios. Por qu\u00e9 \u2192 Qu\u00e9 pasar\u00eda si \u2192 C\u00f3mo.",
        ],
      },
      ambition: {
        title: "Ambici\u00f3n y Libertad",
        bullets: [
          "Seguimos avanzando. No nos conformamos ni nos estancamos.",
          "Libertad es decidir c\u00f3mo usamos nuestro tiempo \u2014 pero no puede ser a costa de otros.",
          "Crecemos en la direcci\u00f3n de nuestra visi\u00f3n compartida, no en cualquier direcci\u00f3n.",
        ],
      },
    },
    footer: "\u00a9 2026 Saicere Holdings. Todos los derechos reservados.",
    signIn: "Iniciar Sesi\u00f3n",
  },
} as const;

type Lang = keyof typeof i18n;

const pillarIcons = [
  <svg key="invest" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>,
  <svg key="manage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>,
  <svg key="lab" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
    <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0-4h18" />
  </svg>,
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, revealed };
}

function RevealSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, revealed } = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`reveal-section ${revealed ? "revealed" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = i18n[lang];
  const toggleLang = useCallback(() => setLang((l) => (l === "en" ? "es" : "en")), []);

  const pillarKeys = ["invest", "manage", "lab"] as const;
  const valueKeys = ["purpose", "collab", "curiosity", "ambition"] as const;

  return (
    <>
      <style>{`
        .hero-section {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .hero-section::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 50% 40%, rgba(184,148,47,0.05) 0%, transparent 70%),
            radial-gradient(ellipse 50% 80% at 80% 20%, rgba(184,148,47,0.03) 0%, transparent 60%);
          pointer-events: none;
        }
        .reveal-section {
          opacity: 0;
          transform: translateY(32px);
          transition: opacity 0.7s cubic-bezier(0.22,1,0.36,1), transform 0.7s cubic-bezier(0.22,1,0.36,1);
        }
        .reveal-section.revealed {
          opacity: 1;
          transform: translateY(0);
        }
        .pillar-card {
          transition: border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
        }
        .pillar-card:hover {
          border-color: rgba(37,99,235,0.45);
          box-shadow: 0 4px 24px rgba(37,99,235,0.10);
          transform: translateY(-2px);
        }
        .value-card {
          transition: border-color 0.3s ease, box-shadow 0.3s ease;
        }
        .value-card:hover {
          border-color: rgba(37,99,235,0.35);
          box-shadow: 0 4px 20px rgba(37,99,235,0.08);
        }
        .nav-blur {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }
        @keyframes hero-focus {
          from {
            opacity: 0;
            filter: blur(14px);
            transform: scale(0.94);
          }
          to {
            opacity: 1;
            filter: blur(0);
            transform: scale(1);
          }
        }
        @keyframes hero-soft-focus {
          from { opacity: 0; filter: blur(8px); transform: translateY(8px); }
          to   { opacity: 1; filter: blur(0);   transform: translateY(0); }
        }
        .hero-logo {
          animation: hero-focus 1200ms cubic-bezier(0.22, 1, 0.36, 1) 100ms both;
        }
        .hero-wordmark {
          animation: hero-soft-focus 900ms cubic-bezier(0.22, 1, 0.36, 1) 700ms both;
        }
        .hero-mission {
          animation: hero-soft-focus 900ms cubic-bezier(0.22, 1, 0.36, 1) 1100ms both;
        }
        .hero-divider {
          animation: hero-soft-focus 700ms ease-out 1500ms both;
        }
        .brand-mark {
          position: relative;
          display: inline-flex;
          align-items: center;
        }
        .brand-mark .brand-text {
          transition: opacity 0.3s ease;
        }
        .brand-mark .brand-logo {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }
        .brand-mark:hover .brand-text,
        .brand-mark:focus-visible .brand-text {
          opacity: 0;
        }
        .brand-mark:hover .brand-logo,
        .brand-mark:focus-visible .brand-logo {
          opacity: 1;
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-logo,
          .hero-wordmark,
          .hero-mission,
          .hero-divider { animation: none; }
        }
      `}</style>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 nav-blur bg-bg/80 border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span
            className="brand-mark cursor-default outline-none"
            tabIndex={0}
            aria-label="Saicere"
          >
            <span className="brand-text text-text font-semibold tracking-wide text-sm uppercase">
              Saicere
            </span>
            <Image
              src="/isotipo.png"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              priority
              className="brand-logo h-6 w-6"
            />
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="px-4 py-1.5 text-sm text-text-muted border border-border rounded-md hover:text-interaction hover:border-interaction/40 transition-colors"
            >
              {t.signIn}
            </Link>
            <button
              onClick={toggleLang}
              className="px-3 py-1.5 text-sm text-text-muted border border-border rounded-md hover:text-interaction hover:border-interaction/40 transition-colors cursor-pointer"
              aria-label="Toggle language"
            >
              {lang === "en" ? "ES" : "EN"}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <Image
            src="/isotipo.png"
            alt="Saicere"
            width={256}
            height={256}
            priority
            className="hero-logo mx-auto mb-8 h-24 w-24 md:h-32 md:w-32"
          />
          <h1 className="hero-wordmark text-4xl md:text-5xl lg:text-6xl font-light leading-tight tracking-tight text-text">
            Saicere<span className="text-accent">.</span>
          </h1>
          <p className="hero-mission mt-8 text-lg md:text-xl text-text-muted font-light leading-relaxed max-w-2xl mx-auto">
            {t.hero.mission}
          </p>
          <div className="hero-divider mt-12 flex justify-center">
            <div className="w-px h-16 bg-gradient-to-b from-accent/40 to-transparent" />
          </div>
        </div>
      </section>

      {/* About */}
      <section className="py-32 px-6">
        <div className="max-w-4xl mx-auto">
          <RevealSection>
            <p className="text-xs uppercase tracking-[0.25em] text-accent mb-10">
              {t.about.label}
            </p>
          </RevealSection>
          <RevealSection delay={100}>
            <p className="text-lg md:text-xl text-text-muted font-light leading-relaxed">
              {t.about.text}
            </p>
          </RevealSection>
          <RevealSection delay={200}>
            <div className="mt-16 border-l-2 border-accent/30 pl-8">
              <p className="text-xs uppercase tracking-[0.25em] text-accent mb-4">
                {t.about.vision.label}
              </p>
              <p className="text-base md:text-lg text-text font-light leading-relaxed italic">
                {t.about.vision.text}
              </p>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-32 px-6 bg-bg-elevated">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <p className="text-xs uppercase tracking-[0.25em] text-accent mb-16 text-center">
              {t.pillars.label}
            </p>
          </RevealSection>
          <div className="grid md:grid-cols-3 gap-6">
            {pillarKeys.map((key, i) => (
              <RevealSection key={key} delay={i * 150}>
                <div className="pillar-card border border-border rounded-2xl p-8 bg-bg h-full flex flex-col">
                  <div className="text-accent mb-6">{pillarIcons[i]}</div>
                  <h3 className="text-lg font-medium text-text mb-3">
                    {t.pillars[key].title}
                  </h3>
                  <p className="text-sm text-text-muted font-light leading-relaxed">
                    {t.pillars[key].desc}
                  </p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <RevealSection>
            <p className="text-xs uppercase tracking-[0.25em] text-accent mb-16 text-center">
              {t.values.label}
            </p>
          </RevealSection>
          <div className="grid md:grid-cols-2 gap-6">
            {valueKeys.map((key, i) => (
              <RevealSection key={key} delay={i * 100}>
                <div className="value-card border border-border rounded-2xl p-8 bg-bg h-full">
                  <h3 className="text-lg font-medium text-text mb-5">
                    {t.values[key].title}
                  </h3>
                  <ul className="space-y-3">
                    {t.values[key].bullets.map((bullet, j) => (
                      <li
                        key={j}
                        className="flex items-start gap-3 text-sm text-text-muted font-light leading-relaxed"
                      >
                        <span className="mt-2 block w-1 h-1 rounded-full bg-accent/50 shrink-0" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-6 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-sm text-text-dim">{t.footer}</p>
        </div>
      </footer>
    </>
  );
}
