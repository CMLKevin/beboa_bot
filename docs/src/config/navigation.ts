export interface NavItem {
  title: string;
  href: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

export interface TopTab {
  id: string;
  label: string;
  href: string;
  sections: string[];
}

// Top navigation tabs - filter sidebar sections based on active tab
export const topTabs: TopTab[] = [
  {
    id: 'guide',
    label: 'User Guide',
    href: '/',
    sections: ['Getting Started', 'Features', 'Commands'],
  },
  {
    id: 'ai',
    label: 'AI Systems',
    href: '/ai',
    sections: ['AI Systems'],
  },
  {
    id: 'jarvis',
    label: 'Jarvis Mode',
    href: '/jarvis',
    sections: ['Jarvis Mode 2.0'],
  },
  {
    id: 'reference',
    label: 'Reference',
    href: '/architecture/structure',
    sections: ['Architecture', 'Developer Guide', 'Deployment'],
  },
];

// Helper to get active tab from pathname
export function getActiveTab(pathname: string): TopTab {
  // Check for exact href match first
  for (const tab of topTabs) {
    if (pathname === tab.href) return tab;
  }

  // Check if pathname falls under any tab's sections
  for (const tab of topTabs) {
    for (const sectionTitle of tab.sections) {
      const section = navigation.find(s => s.title === sectionTitle);
      if (section) {
        for (const item of section.items) {
          if (pathname === item.href || pathname.startsWith(item.href + '/')) {
            return tab;
          }
        }
      }
    }
  }

  return topTabs[0]; // Default to first tab
}

// Get sections for a specific tab
export function getSectionsForTab(tabId: string): NavSection[] {
  const tab = topTabs.find(t => t.id === tabId);
  if (!tab) return navigation;
  return navigation.filter(section => tab.sections.includes(section.title));
}

// Get breadcrumb trail from pathname
export function getBreadcrumbs(pathname: string): { title: string; href: string }[] {
  const crumbs: { title: string; href: string }[] = [];

  // Find the section and item
  for (const section of navigation) {
    for (const item of section.items) {
      if (pathname === item.href || pathname.startsWith(item.href + '/')) {
        crumbs.push({ title: section.title, href: item.href });
        if (pathname !== item.href) {
          crumbs.push({ title: item.title, href: item.href });
        }
        return crumbs;
      }
    }
  }

  return crumbs;
}

export const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Home', href: '/' },
      { title: 'Installation', href: '/getting-started/installation' },
      { title: 'Configuration', href: '/getting-started/configuration' },
      { title: 'Quick Start', href: '/getting-started/quickstart' },
    ],
  },
  {
    title: 'Features',
    items: [
      { title: 'Overview', href: '/features' },
      { title: 'Daily Check-ins', href: '/features/checkins' },
      { title: 'Bebits & Rewards', href: '/features/bebits' },
      { title: 'AI Chat', href: '/features/chat' },
    ],
  },
  {
    title: 'AI Systems',
    items: [
      { title: 'Overview', href: '/ai' },
      { title: 'Dynamic Personality', href: '/ai/personality' },
      { title: 'Mood System', href: '/ai/moods' },
      { title: 'Relationships', href: '/ai/relationships' },
      { title: 'Semantic Memory', href: '/ai/memory' },
      { title: 'LLM Evaluator', href: '/ai/llm-evaluator' },
      { title: 'Tool Calls', href: '/ai/tools' },
    ],
  },
  {
    title: 'Jarvis Mode 2.0',
    items: [
      { title: 'Overview', href: '/jarvis' },
      { title: 'Commands Reference', href: '/jarvis/commands' },
      { title: 'Intent Parsing', href: '/jarvis/parsing' },
      { title: 'Fun Commands', href: '/jarvis/fun' },
    ],
  },
  {
    title: 'Commands',
    items: [
      { title: 'User Commands', href: '/commands/user' },
      { title: 'Admin Commands', href: '/commands/admin' },
    ],
  },
  {
    title: 'Architecture',
    items: [
      { title: 'Project Structure', href: '/architecture/structure' },
      { title: 'Database Schema', href: '/architecture/database' },
      { title: 'Services', href: '/architecture/services' },
      { title: 'Message Flow', href: '/architecture/flow' },
    ],
  },
  {
    title: 'Developer Guide',
    items: [
      { title: 'Extending Commands', href: '/dev/commands' },
      { title: 'Custom Tools', href: '/dev/tools' },
      { title: 'Database Migrations', href: '/dev/migrations' },
      { title: 'API Reference', href: '/dev/api' },
    ],
  },
  {
    title: 'Deployment',
    items: [
      { title: 'Railway', href: '/deployment/railway' },
      { title: 'VPS Setup', href: '/deployment/vps' },
      { title: 'Docker', href: '/deployment/docker' },
    ],
  },
];

export const siteConfig = {
  name: 'Beboa',
  description: 'An AI-powered Discord companion bot',
  github: 'https://github.com/CMLKevin/beboa_evo',
};
