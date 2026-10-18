import { useRef, useState } from "react";
import { Button } from "./Button";

interface Props {
  onFiles: (files: File[]) => void;
  accept?: string;
  title?: string;
  hint?: string;
  buttonLabel?: string;
}

export function DropZone({
  onFiles,
  accept = ".pdf,.doc,.docx,.txt,.md,.rtf",
  title = "Drop PDF, DOCX or TXT here, or browse files.",
  hint,
  buttonLabel = "browse files",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  function handleFiles(list: FileList | null) {
    if (list && list.length) onFiles(Array.from(list));
  }

  return (
    <div
      className={`dropzone${active ? " dropzone--active" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setActive(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <p>{title}</p>
      {hint && <p className="dropzone__hint">{hint}</p>}
      <Button type="button" onClick={() => inputRef.current?.click()}>
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="visually-hidden"
        aria-label="Choose a file to upload"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
