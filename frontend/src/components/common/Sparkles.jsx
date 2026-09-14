import React from 'react';
import Particles, { ParticlesProvider } from '@tsparticles/react';
import { loadSlim } from '@tsparticles/slim';
import { motion, useAnimation } from 'framer-motion';

// tsParticles v4's ParticlesProvider requires this callback's identity to
// stay stable across the app's lifecycle (it throws otherwise) - so it's
// a module-level function, not something created inside a component.
async function initEngine(engine) {
  await loadSlim(engine);
}

// Wrap any tree that renders <SparklesCore> with this once - it loads the
// slim engine and only renders children once that's ready.
export function SparklesProvider({ children }) {
  return <ParticlesProvider init={initEngine}>{children}</ParticlesProvider>;
}

// tsParticles-backed replacement for the CSS tiled-dot stardust: same job
// (an ambient, slowly drifting field of light behind dark surfaces) done
// with real particle simulation instead of a repeating background-image.
export function SparklesCore({
  id,
  style,
  background = 'transparent',
  minSize = 0.6,
  maxSize = 1.6,
  speed = 1,
  particleColors = ['#FFFFFF', '#DCEBFA', '#9BC7F5'],
  particleDensity = 70
}) {
  const controls = useAnimation();

  const particlesLoaded = async (container) => {
    if (container) {
      controls.start({ opacity: 1, transition: { duration: 1.2 } });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={controls}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', ...style }}
      aria-hidden="true"
    >
      <Particles
        id={id}
        particlesLoaded={particlesLoaded}
        style={{ width: '100%', height: '100%' }}
        options={{
          background: { color: { value: background } },
          fullScreen: { enable: false },
          fpsLimit: 90,
          interactivity: {
            events: {
              onClick: { enable: false },
              onHover: { enable: false },
              resize: true
            }
          },
          particles: {
            color: { value: particleColors },
            move: {
              enable: true,
              speed: 0.25,
              direction: 'none',
              random: true,
              straight: false,
              outModes: { default: 'out' }
            },
            number: {
              density: { enable: true, width: 400, height: 400 },
              value: particleDensity
            },
            opacity: {
              value: { min: 0.1, max: 0.9 },
              animation: { enable: true, speed, sync: false, startValue: 'random' }
            },
            shape: { type: 'circle' },
            size: { value: { min: minSize, max: maxSize } }
          },
          detectRetina: true
        }}
      />
    </motion.div>
  );
}
