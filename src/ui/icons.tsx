import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const LocateIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M3 11.5 20.5 3.5 12.5 21l-1.8-7.7L3 11.5Z" />
  </Icon>
);

export const SearchIcon = (props: IconProps) => (
  <Icon {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m20 20-4.6-4.6" />
  </Icon>
);

export const BackIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </Icon>
);

export const ExternalIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M9 5h10v10M19 5 5 19" />
  </Icon>
);

export const TreeIcon = (props: IconProps) => (
  <Icon {...props}>
    <path d="M12 21v-6.5" />
    <path d="m12 17.5-2.5-2" />
    <path d="M8 15a4 4 0 0 1-1.6-7.6 5.6 5.6 0 0 1 11.2 0A4 4 0 0 1 16 15Z" />
  </Icon>
);
