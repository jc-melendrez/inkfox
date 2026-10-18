import type { ReactNode } from "react";

interface Props {
  aside?: ReactNode;
  children: ReactNode;
}

export function AuthLayout({ aside, children }: Props) {
  return (
    <div className={aside ? "auth-layout" : "auth-layout auth-layout--single"}>
      {aside && <div className="auth-layout__aside auth-layout__aside--left">{aside}</div>}
      <div id="main" tabIndex={-1} className="auth-layout__form">{children}</div>
    </div>
  );
}
