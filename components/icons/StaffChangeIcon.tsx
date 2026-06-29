import React from 'react';

export const StaffChangeIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.8}
    stroke="currentColor"
    {...props}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 8.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM16 20.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM4.75 13.75c.7-1.55 1.88-2.25 3.25-2.25s2.55.7 3.25 2.25M12.75 10.25c.7-1.55 1.88-2.25 3.25-2.25s2.55.7 3.25 2.25M14.5 4.75h3.75v3.75M9.5 19.25H5.75V15.5M18.25 4.75 14 9M5.75 19.25 10 15"
    />
  </svg>
);
