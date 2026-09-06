import type * as React from "react";

import { cn } from "@chatwootjs/ui/lib/utils";

export interface ChatwootLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  color?: string;
}

export function ChatwootLogo({ className, color = "#FF6B00", ...props }: ChatwootLogoProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-4 flex-shrink-0", className)}
      {...props}
    >
      <circle cx="8" cy="8" r="8" fill={color} />
      <path
        d="M11.4172 11.4172H7.70831C5.66383 11.4172 4 9.75328 4 7.70828C4 5.66394 5.66383 4 7.70835 4C9.75339 4 11.4172 5.66394 11.4172 7.70828V11.4172Z"
        fill="white"
        stroke="white"
        strokeWidth="0.1875"
      />
    </svg>
  );
}
