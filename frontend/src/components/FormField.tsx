import React from "react";

export default function FormField({
  label,
  htmlFor,
  helperText,
  errorText,
  children,
  required = false,
  inline = false,
}: {
  label?: string;
  htmlFor?: string;
  helperText?: string;
  errorText?: string;
  children: React.ReactNode;
  required?: boolean;
  inline?: boolean; // allows side-by-side label and input
}) {
  return (
    <div className={inline ? "fb-ff fb-ff--inline" : "fb-ff"}>
      {label ? (
        <label className="fb-ff__label" htmlFor={htmlFor}>
          {label}{required ? <span className="fb-ff__req">*</span> : null}
        </label>
      ) : null}
      <div className="fb-ff__control">
        {children}
        {helperText && !errorText ? (
          <div className="fb-ff__helper">{helperText}</div>
        ) : null}
        {errorText ? <div className="fb-ff__error">{errorText}</div> : null}
      </div>
    </div>
  );
}
