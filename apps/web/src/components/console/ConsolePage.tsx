import s from './ConsolePage.module.css';

// A Console screen's frame (D-157): the title, a sentence under it, the screen's actions on the right
// (under the title on a phone), then the content. Inside AppShell's <main>, so it adds no landmark.

export interface ConsolePageProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function ConsolePage({ title, description, actions, children }: ConsolePageProps) {
  return (
    <div className={s.page}>
      <div className={s.head}>
        <div className={s.titles}>
          <h1 className={s.h1}>{title}</h1>
          {description ? <p className={s.description}>{description}</p> : null}
        </div>
        {actions ? <div className={s.actions}>{actions}</div> : null}
      </div>
      {children}
    </div>
  );
}
