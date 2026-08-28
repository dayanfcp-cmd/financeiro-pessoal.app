"use client";

export function Sheet({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-[rgba(24,18,60,0.5)] transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      />
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 max-w-[460px] mx-auto md:right-8 md:left-auto md:bottom-8 bg-white rounded-t-[24px] md:rounded-[20px] px-5 pt-2 max-h-[92vh] overflow-y-auto transition-transform duration-[260ms] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
      >
        <div className="w-10 h-[5px] rounded-full bg-[var(--line)] mx-auto my-2" />
        {children}
      </div>
    </>
  );
}
