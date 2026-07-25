import type { ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";

type ButtonProps = Omit<HTMLMotionProps<"button">, "children"> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "check" | "dolphin" | "ghost" | "danger";
  icon?: ReactNode;
};

export function Button({ children, variant = "secondary", icon, className = "", ...props }: ButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.975 }}
      className={`button button--${variant} ${className}`}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </motion.button>
  );
}
