import React from "react";
import { motion } from "framer-motion";

interface ScrollRevealSectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  delay?: number;
}

export const ScrollRevealSection: React.FC<ScrollRevealSectionProps> = ({
  children,
  className = "",
  id,
  delay = 0,
}) => {
  return (
    <motion.div
      id={id}
      initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.7,
        delay,
        ease: [0.16, 1, 0.3, 1], // fluid cubic bezier
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollRevealSection;
