import { createContext, useContext, useEffect } from 'react';

// What the R2 admin shell offers the page inside it (D-160 R2-1c): the breadcrumb's record name (a
// Workspace's page names itself, as the mockup's `PARENT` crumb does) and the R2 toast.

export interface AdminChrome {
  setRecord: (name: string | null) => void;
  toast: (message: string) => void;
}

const Ctx = createContext<AdminChrome>({ setRecord: () => {}, toast: () => {} });

export const AdminChromeProvider = Ctx.Provider;
export const useAdminChrome = (): AdminChrome => useContext(Ctx);

/** A record's page puts its name in the breadcrumb while it is open. */
export function useRecordCrumb(name: string | null): void {
  const { setRecord } = useAdminChrome();
  useEffect(() => {
    setRecord(name);
    return () => setRecord(null);
  }, [name, setRecord]);
}
