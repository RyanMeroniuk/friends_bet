import React from "react";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, ...props },
  ref
) {
  const cls = ["fb-input", className ?? ""].join(" ").trim();
  return <input ref={ref} className={cls} {...props} />;
});

export default Input;
