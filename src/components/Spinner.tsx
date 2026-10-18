interface Props {
  label?: string;
}

export function Spinner({ label }: Props) {
  if (!label) {
    return (
      <span className="spinner" aria-hidden="true">
        <span className="spinner__dot" />
      </span>
    );
  }
  return (
    <span className="spinner" role="status">
      <span className="spinner__dot" aria-hidden="true" />
      {label}
    </span>
  );
}
