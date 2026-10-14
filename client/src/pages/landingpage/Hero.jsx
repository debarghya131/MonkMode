import { Link } from "react-router-dom";
import { useState } from "react";
import { motion as Motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import monkIllustration from "../../assets/monk.webp";

const pillars = [
  { number: "01", title: "Find your focus", description: "Give your tasks, goals, and daily journal a place to live." },
  { number: "02", title: "Build your rhythm", description: "Turn small habits and consistent training into a daily practice." },
  { number: "03", title: "See your growth", description: "Reflect on your progress with insights and weekly reports." },
];

const orbitFeatures = [
  { label: "Overview", icon: "◉" },
  { label: "Journal", icon: "✎" },
  { label: "Tasks", icon: "✓" },
  { label: "Habits", icon: "↻" },
  { label: "Goals", icon: "⚑" },
  { label: "Gym", icon: "⌁" },
  { label: "Weekly Report", icon: "▥" },
  { label: "Analysis", icon: "↗" },
  { label: "AI Guide", icon: "✧" },
];

export default function Hero() {
  const reducedMotion = useReducedMotion();
  const [orbitPaused, setOrbitPaused] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const glowVisible = useMotionValue(0);
  const artX = useMotionValue(0);
  const artY = useMotionValue(0);
  const glowX = useSpring(pointerX, { stiffness: 90, damping: 28 });
  const glowY = useSpring(pointerY, { stiffness: 90, damping: 28 });
  const glowOpacity = useSpring(glowVisible, { stiffness: 65, damping: 22 });
  const artOffsetX = useSpring(artX, { stiffness: 65, damping: 24 });
  const artOffsetY = useSpring(artY, { stiffness: 65, damping: 24 });

  const movePointer = (event) => {
    if (reducedMotion || event.pointerType !== "mouse") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    pointerX.set(x);
    pointerY.set(y);
    glowVisible.set(1);
    artX.set((x / bounds.width - 0.5) * 12);
    artY.set((y / bounds.height - 0.5) * 8);
  };

  const resetPointer = () => {
    glowVisible.set(0);
    artX.set(0);
    artY.set(0);
  };

  return (
    <main className="home-main" id="main-content" onPointerMove={movePointer} onPointerLeave={resetPointer}>
      {!reducedMotion && <Motion.div className="home-pointer-glow" aria-hidden="true" style={{ x: glowX, y: glowY, opacity: glowOpacity }} />}
      <section className="home-hero" aria-labelledby="home-heading">
        <div className="home-copy">
          <p className="home-eyebrow"><span /> A little focus. A different life.</p>
          <h1 id="home-heading">Less noise.<br />More <em>MonkMode.</em></h1>
          <p className="home-description">Make space for the person you want to become. Bring your habits, goals, and daily reflections together in one calm corner of your world.</p>
          <div className="home-actions">
            <Link className="home-button home-button-primary" to="/demo-login">Explore the demo <span aria-hidden="true">↗</span></Link>
            <Link className="home-button home-button-secondary" to="/signup">Start your journey <span aria-hidden="true">→</span></Link>
          </div>
          <p className="home-action-note"><span aria-hidden="true">✧</span> Your next chapter starts with one small step.</p>
        </div>

        <Motion.div className="home-art" style={{ x: artOffsetX, y: artOffsetY }}>
          <div className="home-orbit home-orbit-outer" aria-hidden="true" />
          <div className="home-orbit home-orbit-inner" aria-hidden="true" />
          <span className="home-orbit-dot" aria-hidden="true" />
          <div className="home-art-label"><span /> A SPACE TO BECOME</div>
          <Motion.img src={monkIllustration} alt="Monk sitting peacefully in meditation" className="home-monk"
            animate={reducedMotion ? undefined : { y: [0, -10, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            fetchPriority="high" />
          <ul className="home-feature-orbit" aria-label="MonkMode features" data-paused={orbitPaused}>
            {orbitFeatures.map((feature, index) => (
              <li className="home-feature-spoke" key={feature.label} style={{ "--feature-angle": `${index * 360 / orbitFeatures.length - 90}deg` }}>
                <div className="home-feature-position">
                  <span className="home-feature-chip"><span className="home-feature-icon" aria-hidden="true">{feature.icon}</span><span>{feature.label}</span></span>
                </div>
              </li>
            ))}
          </ul>
          <div className="home-art-footer">
            <p className="home-art-caption">Breathe. Begin. Become.</p>
            <button type="button" className="home-orbit-toggle" aria-pressed={orbitPaused} onClick={() => setOrbitPaused(value => !value)}>
              {orbitPaused ? "Resume orbit" : "Pause orbit"}
            </button>
          </div>
        </Motion.div>
      </section>

      <section className="home-pillars" aria-label="The MonkMode practice">
        {pillars.map((pillar, index) => <Motion.div className="home-pillar" key={pillar.number}
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, delay: reducedMotion ? 0 : index * 0.1 }}>
          <span className="home-pillar-number">{pillar.number}</span>
          <div><h2>{pillar.title}</h2><p>{pillar.description}</p></div>
        </Motion.div>)}
      </section>
    </main>
  );
}
