import React from 'react';
import {
  MeetupGridCard,
  MeetupCompactCard,
  MeetupListCard,
} from './meetup-cards';
import type { Meetup } from './meetup-cards';

// Re-export Meetup type for consumers that import from this file
export type { Meetup } from './meetup-cards';

interface MeetupCardProps {
  meetup: Meetup;
  onPress: (meetup: Meetup) => void;
  variant?: 'list' | 'grid' | 'compact';
  /** Grid card width (only applies to variant="grid") */
  width?: number;
  /** Distance in meters (only applies to variant="compact") */
  distance?: number;
}

/**
 * Facade component -- delegates to specialized card variants.
 * Maintains 100% backward compatibility with the original API.
 */
const MeetupCard: React.FC<MeetupCardProps> = ({
  meetup,
  onPress,
  variant = 'list',
  width,
  distance,
}) => {
  switch (variant) {
    case 'grid':
      return <MeetupGridCard meetup={meetup} onPress={onPress} width={width} />;
    case 'compact':
      return <MeetupCompactCard meetup={meetup} onPress={onPress} distance={distance} />;
    case 'list':
    default:
      return <MeetupListCard meetup={meetup} onPress={onPress} />;
  }
};

export default MeetupCard;
