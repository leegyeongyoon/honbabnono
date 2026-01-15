import React from 'react';

interface StaticMapViewProps {
  location: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

// Web version - not used (web has its own implementation in the wizard)
const StaticMapView: React.FC<StaticMapViewProps> = () => {
  return null;
};

export default StaticMapView;
