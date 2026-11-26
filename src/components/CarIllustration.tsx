import React from 'react';
import { CarSpec } from '../game/types';

interface CarIllustrationProps {
  car: CarSpec;
  className?: string;
}

export const CarIllustration: React.FC<CarIllustrationProps> = ({
  car,
  className = 'w-11 h-20',
}) => {
  return (
    <svg
      viewBox="0 0 60 110"
      className={className}
      aria-label={`${car.name} colored car`}
      role="img"
    >
      {/* Drop shadow */}
      <rect x="11" y="14" width="42" height="88" rx="12" fill="rgba(0,0,0,0.45)" />

      {/* Wheels */}
      <rect x="4" y="21" width="7" height="18" rx="2.5" fill="#0F172A" />
      <rect x="49" y="21" width="7" height="18" rx="2.5" fill="#0F172A" />
      <rect x="4" y="71" width="7" height="20" rx="2.5" fill="#0F172A" />
      <rect x="49" y="71" width="7" height="20" rx="2.5" fill="#0F172A" />

      {/* Chassis */}
      <rect x="9" y="10" width="42" height="88" rx="12" fill={car.bodyColor} />

      {/* Racing stripe */}
      <rect x="25.5" y="11" width="9" height="86" fill={car.stripeColor} />

      {/* Hood vents */}
      <rect x="15" y="22" width="6" height="10" rx="1.5" fill={car.accentColor} />
      <rect x="39" y="22" width="6" height="10" rx="1.5" fill={car.accentColor} />

      {/* Cabin glass */}
      <rect x="14" y="36" width="32" height="39" rx="7" fill="#0F172A" />

      {/* Roof panel */}
      <rect x="16.5" y="48" width="27" height="18" rx="4" fill={car.bodyColor} />

      {/* Rear spoiler */}
      <rect x="9" y="88" width="42" height="7" rx="2.5" fill="#1E293B" />

      {/* Headlights */}
      <rect x="12" y="10" width="9" height="3.5" rx="1" fill="#FEF9C3" />
      <rect x="39" y="10" width="9" height="3.5" rx="1" fill="#FEF9C3" />

      {/* Taillights */}
      <rect x="12" y="95" width="10" height="3.5" rx="1" fill="#EF4444" />
      <rect x="38" y="95" width="10" height="3.5" rx="1" fill="#EF4444" />
    </svg>
  );
};
