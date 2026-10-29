import { type ReactNode } from "react";
import clsx from "clsx";
// Импорт CSS-модуля даёт объект "s" со свойствами-классами (s.button, s.primary, ...).
import s from "./Button.module.css";

/**
 * Допустимые значения визуального варианта кнопки.
 * Здесь используется операция объединения (union):
 * https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html
 */
type ButtonVariant = "primary" | "secondary";
type ButtonSize = "sm" | "md" | "lg";

/**
 * Пропсы кнопки.
 * - children: контент внутри (текст, иконка и пр.)
 * - variant/size: опциональные, с умолчаниями ("primary", "md")
 * - className: позволяет доклеить свои классы (например, от родителя)
 *
 * Опциональность достигается за счёт указанного рядом с пропсом вопросительного знака.
 */
interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  className?: string;
  onClick?: () => void; // при желании можно сузить до React.MouseEventHandler<HTMLButtonElement>
}

/**
 * Универсальная кнопка.
 * При помощи знака `=` сразу указываем значения «по умолчанию» для части параметров.
 */
export function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  className,
  onClick,
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        s.button,
        s[variant],         // s.primary или s.secondary
        s[size],            // s.sm, s.md или s.lg
        disabled && s.disabled,
        className           // внешние пользовательские классы
      )}
    >
      {children}
    </button>
  );
}