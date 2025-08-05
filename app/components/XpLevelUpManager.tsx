import React from 'react';
import { useXp } from '../../context/XpContext';
import { LevelUpModal } from './LevelUpModal';

export const XpLevelUpManager: React.FC = () => {
  const { levelUpEvent, clearLevelUpEvent } = useXp();

  return (
    <LevelUpModal
      visible={!!levelUpEvent}
      onClose={clearLevelUpEvent}
      previousLevel={levelUpEvent?.previousLevel || 1}
      newLevel={levelUpEvent?.newLevel || 1}
      totalXp={levelUpEvent?.totalXp || 0}
    />
  );
}; 