import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";

interface ScrollRevealProps {
  children: ReactNode;
  direction?: "up" | "down" | "left" | "right";
  delay?: number;
  duration?: number;
  className?: string;
  threshold?: number;
  once?: boolean;
}

/**
 * Componente che rivela il contenuto con animazione quando scorre nella vista
 * Utile per creare effetti di apparizione durante lo scroll della pagina
 */
export function ScrollReveal({
  children,
  direction = "up",
  delay = 0,
  duration = 0.4,
  className = "",
  threshold = 0.1,
  once = true,
}: ScrollRevealProps) {
  const [hasPlayed, setHasPlayed] = useState(false);
  const [ref, inView] = useInView({
    triggerOnce: once,
    threshold,
  });

  useEffect(() => {
    if (inView && !hasPlayed) {
      setHasPlayed(true);
    }
  }, [inView, hasPlayed]);

  // Configurazioni di animazione in base alla direzione
  const getAnimations = () => {
    const distance = 50;
    
    switch (direction) {
      case "up":
        return {
          hidden: { opacity: 0, y: distance },
          visible: { opacity: 1, y: 0 },
        };
      case "down":
        return {
          hidden: { opacity: 0, y: -distance },
          visible: { opacity: 1, y: 0 },
        };
      case "left":
        return {
          hidden: { opacity: 0, x: distance },
          visible: { opacity: 1, x: 0 },
        };
      case "right":
        return {
          hidden: { opacity: 0, x: -distance },
          visible: { opacity: 1, x: 0 },
        };
      default:
        return {
          hidden: { opacity: 0 },
          visible: { opacity: 1 },
        };
    }
  };
  
  const animations = getAnimations();
  
  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={inView || hasPlayed ? "visible" : "hidden"}
      variants={animations}
      transition={{ duration, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}