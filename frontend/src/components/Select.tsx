import React from "react";

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, children, ...props },
  ref
) {
  const cls = ["fb-select", className ?? ""].join(" ").trim();
  return (
    <select ref={ref} className={cls} {...props}>
      {children}
    </select>
  );
});

export default Select;
