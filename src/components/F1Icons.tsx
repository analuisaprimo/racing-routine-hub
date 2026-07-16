import React, { useEffect, useState } from "react";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

// 🏁 Checkered Flag Icon (Outline styled)
export const F1CheckeredFlag = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    <path d="M4 15c1-1 2.5-1 3.5 0s2.5 1 3.5 0 2.5-1 3.5 0 2.5 1 3.5 0V4c-1 1-2.5 1-3.5 0s-2.5-1-3.5 0-2.5 1-3.5 0-2.5-1-3.5 0V15Z" />
    <path d="M4 22v-7" />
    <path d="M4 8h14" />
    <path d="M7.5 4v11" />
    <path d="M11 4v11" />
    <path d="M14.5 4v11" />
    <path d="M4 11h14" />
  </svg>
);

// 🪖 F1 Helmet Icon (Outline styled)
export const F1Helmet = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Base helmet shape */}
    <path d="M21 11.5a8.3 8.3 0 0 0-16.6 0c0 .8.2 1.6.5 2.3l-1.4.7c-.8.4-1.2 1.3-1 2.2l.6 2.5c.2.8.9 1.3 1.7 1.3h14.4c.8 0 1.5-.5 1.7-1.3l.6-2.5c.2-.9-.2-1.8-1-2.2l-1.4-.7c.3-.7.5-1.5.5-2.3Z" />
    {/* Visor */}
    <path d="M8.5 9h7c.8 0 1.5.5 1.7 1.3l1.1 4c.2.8-.4 1.7-1.3 1.7h-10.2c-.9 0-1.5-.9-1.3-1.7l1.1-4c.2-.8.9-1.3 1.7-1.3Z" fill="currentColor" fillOpacity="0.1" />
    {/* Aerodynamic lines/decals */}
    <path d="M9 3.5c1 1.5 2.5 2 4 2s3-.5 4-2" />
    <path d="M12 5.5v3" />
    <path d="M4 11.5h3" />
    <path d="M17 11.5h3" />
  </svg>
);

// 🧭 F1 Steering Wheel Icon (Outline styled)
export const F1SteeringWheel = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Steering Wheel Outer Shape (flat top and bottom like F1) */}
    <path d="M6 3.5h12c2.5 0 4 1.5 4 4v9c0 2.5-1.5 4-4 4H6c-2.5 0-4-1.5-4-4v-9c0-2.5 1.5-4 4-4Z" />
    {/* Central screen/hub */}
    <rect x="8" y="8" width="8" height="8" rx="1.5" fill="currentColor" fillOpacity="0.1" />
    {/* Grips details */}
    <path d="M2 9h3" />
    <path d="M2 15h3" />
    <path d="M19 9h3" />
    <path d="M19 15h3" />
    {/* Dial buttons */}
    <circle cx="10" cy="11" r="0.75" fill="currentColor" />
    <circle cx="14" cy="11" r="0.75" fill="currentColor" />
    <circle cx="10" cy="13" r="0.75" fill="currentColor" />
    <circle cx="14" cy="13" r="0.75" fill="currentColor" />
  </svg>
);

// 🏆 F1 Podium Icon (Outline styled)
export const F1Podium = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Podium Steps */}
    <path d="M2 20h20" />
    {/* 2nd Place (Left) */}
    <path d="M5 20V12h4v8" />
    {/* 1st Place (Center) */}
    <path d="M10 20V8h4v12" />
    {/* 3rd Place (Right) */}
    <path d="M15 20v-6h4v6" />
    {/* Numbers */}
    <path d="M7 15v2" />
    <path d="M12 11v3" />
    <path d="M17 16v1" />
    {/* Small Trophy on top step */}
    <path d="M11.5 4h1M11 5h2M12 5v2" />
  </svg>
);

// 🛞 F1 Slick Tire Icon (Outline styled)
export const F1Tire = ({ size = 20, className, ...props }: IconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Outer tire circle */}
    <circle cx="12" cy="12" r="9" />
    {/* Inner rim circle */}
    <circle cx="12" cy="12" r="4.5" fill="currentColor" fillOpacity="0.1" />
    {/* Wheel Hub */}
    <circle cx="12" cy="12" r="1.5" />
    {/* Spokes / Rim Design */}
    <path d="m8.8 8.8 6.4 6.4M15.2 8.8l-6.4 6.4M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21" />
  </svg>
);

// 🚥 F1 Start Lights (Semáforo de Largada Animation)
export const F1StartLights = ({
  onComplete,
  className,
}: {
  onComplete?: () => void;
  className?: string;
}) => {
  const [lightsCount, setLightsCount] = useState(0);

  useEffect(() => {
    // Liga uma luz a cada 750ms até chegar a 5
    const timer = setInterval(() => {
      setLightsCount((c) => {
        if (c < 5) {
          return c + 1;
        } else {
          clearInterval(timer);
          // Aguarda mais 1 segundo e "apaga todas as luzes" (LARGADA!)
          setTimeout(() => {
            setLightsCount(6); // 6 indica luzes apagadas
            if (onComplete) {
              setTimeout(onComplete, 400);
            }
          }, 1000);
          return c;
        }
      });
    }, 750);

    return () => clearInterval(timer);
  }, [onComplete]);

  if (lightsCount === 6) {
    return (
      <div className={`flex flex-col items-center justify-center ${className}`}>
        <div className="text-[var(--flag)] text-xl font-bold uppercase tracking-widest animate-bounce">
          🏁 LARGADA! 🏁
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
      <div className="text-xs uppercase tracking-[0.2em] opacity-60 mb-3">Aquecendo para a largada...</div>
      
      {/* Estrutura do semáforo de F1 */}
      <div className="flex gap-4 bg-black/80 px-6 py-4 rounded-2xl shadow-[0_12px_24px_rgba(0,0,0,0.5)] border border-white/10">
        {[0, 1, 2, 3, 4].map((index) => {
          const isActive = index < lightsCount;
          return (
            <div key={index} className="flex flex-col gap-1 items-center">
              {/* Duas luzes vermelhas verticais por coluna, como no semáforo real de F1 */}
              <div
                className={`w-6 h-6 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-red-600 shadow-[0_0_15px_#ef4444,inset_0_2px_4px_rgba(255,255,255,0.4)]"
                    : "bg-red-950/60 border border-red-900/30"
                }`}
              />
              <div
                className={`w-6 h-6 rounded-full transition-all duration-300 ${
                  isActive
                    ? "bg-red-600 shadow-[0_0_15px_#ef4444,inset_0_2px_4px_rgba(255,255,255,0.4)]"
                    : "bg-red-950/60 border border-red-900/30"
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
