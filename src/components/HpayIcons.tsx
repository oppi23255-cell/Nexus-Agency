import React from 'react';

export function HostapayMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path d="M0 18.0906V8.04389L13.9092 0V10.0553L0 18.0906Z" fill="currentColor" />
      <path d="M0 18.0908H10.0468L18.0924 32H8.03708L0 18.0908Z" fill="currentColor" />
      <path d="M32.0016 13.9077V23.9545L18.0924 32.0001V21.9448L32.0016 13.9077Z" fill="currentColor" />
      <path d="M32.0016 13.9075H21.9549L13.9092 0H23.9646L32.0016 13.9075Z" fill="#e25d0a" />
    </svg>
  );
}

export function CountryFlagBadge({ code }: { code: 'SA' | 'EG' | 'AE' | 'KG' }) {
  if (code === 'SA') {
    return (
      <span
        title="SA"
        className="inline-flex h-4 w-6 items-center justify-center rounded-[3px] bg-[#006c35] text-[8.5px] font-bold tracking-tight text-white border border-white/10 shrink-0"
      >
        SA
      </span>
    );
  }
  if (code === 'EG') {
    return (
      <span
        title="EG"
        className="inline-flex h-4 w-6 overflow-hidden rounded-[3px] border border-white/10 flex-col shrink-0"
      >
        <span className="h-1/3 w-full bg-[#ce1126]" />
        <span className="h-1/3 w-full bg-white" />
        <span className="h-1/3 w-full bg-[#111111]" />
      </span>
    );
  }
  if (code === 'AE') {
    return (
      <span
        title="AE"
        className="inline-flex h-4 w-6 overflow-hidden rounded-[3px] border border-white/10 shrink-0"
      >
        <span className="w-1.5 h-full bg-[#ff0000]" />
        <span className="flex-1 flex flex-col">
          <span className="h-1/3 w-full bg-[#00732f]" />
          <span className="h-1/3 w-full bg-white" />
          <span className="h-1/3 w-full bg-[#111111]" />
        </span>
      </span>
    );
  }
  return (
    <span
      title="KG"
      className="inline-flex h-4 w-6 items-center justify-center rounded-[3px] bg-[#e8112d] text-[8.5px] font-bold text-[#ffef00] border border-white/10 shrink-0"
    >
      KG
    </span>
  );
}

export function HostapayLogo({
  collapsed = false,
  countryCode = 'SA',
}: {
  collapsed?: boolean;
  countryCode?: 'SA' | 'EG' | 'AE' | 'KG';
}) {
  if (collapsed) {
    return <HostapayMark className="w-5 h-5 text-white shrink-0" />;
  }

  return (
    <div className="flex items-center gap-2.5 select-none">
      <span className="text-[19px] font-bold tracking-[-0.025em] text-white leading-none whitespace-nowrap">
        hostapay.trade
      </span>
      <CountryFlagBadge code={countryCode} />
    </div>
  );
}
