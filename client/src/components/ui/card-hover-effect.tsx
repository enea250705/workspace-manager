import { useState, useRef, ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardHoverEffectProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  elevation?: "sm" | "md" | "lg";
  onClick?: () => void;
}

/**
 * Carta con effetto di hover 3D e bagliore
 * Utilizzabile per elementi interattivi come card dei documenti, notifiche, ecc.
 */
export function CardHoverEffect({
  children,
  className = "",
  glowColor = "rgba(59, 130, 246, 0.5)",
  elevation = "md",
  onClick,
}: CardHoverEffectProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Altezza dell'effetto 3D in base all'impostazione
  const elevationMap = {
    sm: 5,
    md: 10,
    lg: 15,
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    
    // Calcola la posizione relativa del mouse all'interno della card
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Normalizza le coordinate (da 0 a 1)
    const normalizedX = x / rect.width;
    const normalizedY = y / rect.height;
    
    setMousePosition({ x: normalizedX, y: normalizedY });
  };

  // Calcola la rotazione 3D in base alla posizione del mouse
  const rotateX = isHovered ? (mousePosition.y - 0.5) * elevationMap[elevation] : 0;
  const rotateY = isHovered ? (mousePosition.x - 0.5) * -elevationMap[elevation] : 0;

  return (
    <motion.div
      ref={cardRef}
      className={cn(
        "relative rounded-xl overflow-hidden transition-all bg-white",
        isHovered && "z-10",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseMove={handleMouseMove}
      style={{
        transformStyle: "preserve-3d",
      }}
      animate={{
        rotateX: rotateX,
        rotateY: rotateY,
        boxShadow: isHovered
          ? `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 15px ${glowColor}`
          : "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 15,
      }}
    >
      {/* Effetto di luce su hover */}
      {isHovered && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: 0.15,
            background: `radial-gradient(circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%, ${glowColor} 0%, transparent 50%)` 
          }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      {/* Contenuto della card */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}