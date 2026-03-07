export default function PlayMatchLogo({ size = 120 }: { size?: number }) {
  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      {/* Card background */}
      <div 
        className="absolute inset-0 bg-gradient-to-br from-white to-gray-200 rounded-lg shadow-2xl transform rotate-6"
        style={{
          width: size * 0.75,
          height: size,
          left: size * 0.125,
        }}
      >
        <div className="absolute inset-2 border-2 border-blue-400 rounded"></div>
      </div>
      
      {/* Soccer ball */}
      <div 
        className="absolute bg-white rounded-full shadow-xl flex items-center justify-center transform -rotate-12"
        style={{
          width: size * 0.65,
          height: size * 0.65,
          top: size * 0.175,
          left: size * 0.25,
          zIndex: 10,
        }}
      >
        {/* Soccer ball pattern */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full"
          style={{ transform: 'rotate(15deg)' }}
        >
          {/* Center pentagon */}
          <polygon 
            points="50,20 65,35 58,55 42,55 35,35" 
            fill="#1e293b"
            stroke="#374151"
            strokeWidth="1"
          />
          
          {/* Top hexagons */}
          <polygon 
            points="50,5 65,10 65,25 50,20 35,25 35,10" 
            fill="white"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          
          {/* Side hexagons */}
          <polygon 
            points="65,35 80,35 85,50 75,65 65,60 58,55" 
            fill="white"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          
          <polygon 
            points="35,35 20,35 15,50 25,65 35,60 42,55" 
            fill="white"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          
          {/* Bottom hexagons */}
          <polygon 
            points="42,55 35,60 35,75 50,85 58,75 58,60" 
            fill="white"
            stroke="#1e293b"
            strokeWidth="1.5"
          />
          
          {/* Additional pentagons for detail */}
          <polygon 
            points="35,10 20,15 20,30 35,35 35,25" 
            fill="#1e293b"
            stroke="#374151"
            strokeWidth="1"
          />
          
          <polygon 
            points="65,10 80,15 80,30 65,35 65,25" 
            fill="#1e293b"
            stroke="#374151"
            strokeWidth="1"
          />
        </svg>
      </div>
      
      {/* Shine effect on ball */}
      <div 
        className="absolute bg-white/40 rounded-full blur-sm"
        style={{
          width: size * 0.2,
          height: size * 0.2,
          top: size * 0.25,
          left: size * 0.35,
          zIndex: 11,
        }}
      />
    </div>
  );
}
