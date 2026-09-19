export type LaunchStarter = {
  title: string;
  subtitle: string;
  prompt: string;
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
