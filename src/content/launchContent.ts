export type LaunchStarter = {
  title: string;
  subtitle: string;
  prompt: string;
  action?: 'pick_garment' | 'pick_worn_outfit' | 'explain_app' | 'explain_privacy';
};

export type LaunchContent = {
  greeting: string;
  starters: LaunchStarter[];
  wardrobeCheckIn: {
    title: string;
    subtitle: string;
    prompt: string;
  };
};

export const fallbackLaunchContent: LaunchContent = {
  greeting: 'Hi. Want help choosing something, logging what you wore, or adding a garment?',
  starters: [
    {
      title: 'Dress me today',
      subtitle: 'Build an outfit from my wardrobe',
      prompt: 'Help me choose an outfit for today.',
    },
    {
      title: 'Rediscover a piece',
      subtitle: 'Bring something forgotten back',
      prompt: "Show me something I haven't worn recently and help me style it.",
    },
    {
      title: 'Wardrobe check-in',
      subtitle: 'Find useful patterns and forgotten pieces',
      prompt: 'Give me a few useful wardrobe insights based on what I own, what I wear, and my saved preferences.',
    },
    {
      title: 'Log today’s outfit',
      subtitle: 'Save what I wore today',
      prompt: 'Help me log what I wore today.',
    },
  ],
  wardrobeCheckIn: {
    title: 'Get a wardrobe check-in',
    subtitle: 'Explore wear patterns, pairings, and pieces worth rediscovering.',
    prompt: 'Give me a few useful wardrobe insights based on what I own, what I wear, and my saved preferences.',
  },
};

export const emptyWardrobeLaunchContent: LaunchContent = {
  greeting: 'Your wardrobe starts with one piece. Add a garment or share what you’re wearing today, and I’ll help organize it without scanning your photo library.',
  starters: [
    {
      title: 'Add my first piece',
      subtitle: 'Choose up to four garment photos',
      prompt: 'Add these garments to my wardrobe.',
      action: 'pick_garment',
    },
    {
      title: 'Add what I’m wearing',
      subtitle: 'Save the pieces and log today’s outfit',
      prompt: 'I’m wearing this today. Add any new garments and log the outfit.',
      action: 'pick_worn_outfit',
    },
    {
      title: 'How does this work?',
      subtitle: 'See how Chat, Wardrobe, and Timeline connect',
      prompt: 'How does this app work?',
      action: 'explain_app',
    },
    {
      title: 'What stays private?',
      subtitle: 'Understand what remains on this device',
      prompt: 'What stays private?',
      action: 'explain_privacy',
    },
  ],
  wardrobeCheckIn: fallbackLaunchContent.wardrobeCheckIn,
};
