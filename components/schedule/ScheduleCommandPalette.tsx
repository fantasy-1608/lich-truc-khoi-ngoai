import React, { useEffect, useId, useRef, useState } from 'react';
import { CalendarIcon } from '../icons/CalendarIcon';

export interface ScheduleCommand {
  id: string;
  label: string;
  detail: string;
  run: () => void;
}

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLocaleLowerCase('vi-VN');

/** Lucian #046, MIT (c) 2026 Seokwoooo. Native dialog + React keyboard state. */
export default function ScheduleCommandPalette({ commands }: { commands: ScheduleCommand[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const id = useId();
  const results = commands.filter((command) =>
    normalize(`${command.label} ${command.detail}`).includes(normalize(query.trim())),
  );
  const selectedIndex = Math.min(activeIndex, Math.max(0, results.length - 1));

  const open = () => {
    // Do not stack on top of an existing editor or confirmation dialog.
    if (document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')) return;
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActiveIndex(0);
    dialogRef.current?.showModal();
    inputRef.current?.focus();
  };

  const close = () => {
    dialogRef.current?.close();
    const previous = returnFocusRef.current;
    if (previous && previous !== document.body && previous.isConnected)
      previous.focus({ preventScroll: true });
    else triggerRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !event.repeat) {
        event.preventDefault();
        if (dialogRef.current?.open) close();
        else open();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const run = (command: ScheduleCommand) => {
    close();
    command.run();
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="palette-trigger"
        onClick={open}
        aria-haspopup="dialog"
        aria-label="Tìm nhanh và công cụ"
        aria-keyshortcuts="Meta+K Control+K"
      >
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="m13 2-3 8H5l6 12 3-8h5L13 2Z" strokeLinejoin="round" />
        </svg>
        <span>Tìm nhanh</span>
        <kbd>⌘ / Ctrl K</kbd>
      </button>
      <dialog
        ref={dialogRef}
        className="roster-command-dialog"
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            close();
        }}
      >
        <div className="palette-heading">
          <h2 id={`${id}-title`}>Bạn muốn tìm gì?</h2>
          <button type="button" onClick={close} aria-label="Đóng tìm nhanh">
            Esc
          </button>
        </div>
        <input
          ref={inputRef}
          className="palette-input"
          role="combobox"
          aria-label="Tìm người hoặc công cụ"
          aria-expanded="true"
          aria-autocomplete="list"
          aria-controls={`${id}-list`}
          aria-activedescendant={results.length ? `${id}-${selectedIndex}` : undefined}
          value={query}
          placeholder="Tên người, tháng sau, xuất lịch…"
          autoComplete="off"
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              const next = results.length
                ? (selectedIndex + (event.key === 'ArrowDown' ? 1 : -1) + results.length) %
                  results.length
                : 0;
              setActiveIndex(next);
              document.getElementById(`${id}-${next}`)?.scrollIntoView({ block: 'nearest' });
            } else if (event.key === 'Enter' && results[selectedIndex]) {
              event.preventDefault();
              run(results[selectedIndex]);
            }
          }}
        />
        <div className="palette-results">
          <ul id={`${id}-list`} role="listbox" aria-label="Kết quả tìm nhanh">
            {results.map((command, index) => (
              <li
                key={command.id}
                id={`${id}-${index}`}
                role="option"
                aria-selected={selectedIndex === index}
                className="palette-option"
                style={{ '--item-index': Math.min(index, 5) } as React.CSSProperties}
                onPointerMove={() => setActiveIndex(index)}
                onClick={() => run(command)}
              >
                <span className="palette-result-icon" aria-hidden="true">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <span>
                  <strong>{command.label}</strong>
                  <small>{command.detail}</small>
                </span>
                <span className="palette-enter" aria-hidden="true">
                  ↵
                </span>
              </li>
            ))}
          </ul>
          {!results.length && (
            <p className="palette-empty" role="status">
              Không tìm thấy kết quả. Thử tên khác hoặc “xuất lịch”.
            </p>
          )}
        </div>
        <footer className="palette-footer">
          <span>↑ ↓ chọn</span>
          <span>Enter mở</span>
          <span>Esc đóng</span>
          <span>{results.length} kết quả</span>
        </footer>
      </dialog>
    </>
  );
}
