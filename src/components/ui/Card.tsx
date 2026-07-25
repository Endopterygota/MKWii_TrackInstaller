import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type CardProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: ReactNode;
  interactive?: boolean;
  accent?: boolean;
};

export function Card({ children, className = "", interactive = false, accent = false, ...props }: CardProps) {
  return (
    <motion.div
      whileHover={interactive ? { y: -2 } : undefined}
      transition={{ duration: 0.18 }}
      className={`card ${accent ? "card--accent" : ""} ${interactive ? "card--interactive" : ""} ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  );
}
