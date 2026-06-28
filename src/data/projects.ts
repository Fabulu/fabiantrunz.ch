export interface ProjectLink {
  type: 'website' | 'github' | 'store' | 'donate';
  url: string;
  labelKey: string;
}

export interface Project {
  id: string;
  featured: boolean;
  titleKey: string;
  taglineKey: string;
  descriptionKey: string;
  tags: string[];
  icon: string | null;
  links: ProjectLink[];
}

export const projects: Project[] = [
  {
    id: 'readzen',
    featured: true,
    titleKey: 'ReadZen',
    taglineKey: 'project.readzen.tagline',
    descriptionKey: 'project.readzen.description',
    tags: ['.NET 8', 'Avalonia', 'Vanilla JS', 'CBETA', 'OpenZen'],
    icon: null,
    links: [
      { type: 'website', url: 'https://readzen.pages.dev', labelKey: 'project.links.website' },
      { type: 'github', url: 'https://github.com/Fabulu/ReadZen', labelKey: 'project.links.github' },
      { type: 'donate', url: 'https://ko-fi.com/readzen', labelKey: 'project.links.donate' },
    ],
  },
  {
    id: 'qda',
    featured: false,
    titleKey: 'Vortex',
    taglineKey: 'project.vortex.tagline',
    descriptionKey: 'project.vortex.description',
    tags: ['.NET 8', 'Avalonia', 'Event Sourcing', 'SQLite', 'AI/ML', 'CQRS'],
    icon: null,
    links: [],
  },
  {
    id: 'lunalog',
    featured: false,
    titleKey: 'Luna Log',
    taglineKey: 'project.lunalog.tagline',
    descriptionKey: 'project.lunalog.description',
    tags: ['Kotlin', 'Jetpack Compose', 'SQLite', 'Material3'],
    icon: '/icons/lunalog.png',
    links: [
      { type: 'store', url: 'https://play.google.com/store/apps/details?id=ch.trunz.lunalog', labelKey: 'project.links.store' },
    ],
  },
  {
    id: 'se4x',
    featured: false,
    titleKey: 'SE4X Companion',
    taglineKey: 'project.se4x.tagline',
    descriptionKey: 'project.se4x.description',
    tags: ['Flutter', 'PWA', 'Board Games'],
    icon: '/icons/se4x.png',
    links: [
      { type: 'website', url: 'https://se4x.pages.dev', labelKey: 'project.links.website' },
      { type: 'github', url: 'https://github.com/Fabulu/SE4xCompanion', labelKey: 'project.links.github' },
    ],
  },
  {
    id: 'whogoesfirst',
    featured: false,
    titleKey: 'Who Goes First?',
    taglineKey: 'project.whogoesfirst.tagline',
    descriptionKey: 'project.whogoesfirst.description',
    tags: ['Flutter', 'Multi-touch', '12 Languages'],
    icon: '/icons/whogoesfirst.png',
    links: [
      { type: 'website', url: 'https://whogoesfirst.pages.dev', labelKey: 'project.links.website' },
    ],
  },
  {
    id: 'openzen',
    featured: false,
    titleKey: 'Open Zen',
    taglineKey: 'project.openzen.tagline',
    descriptionKey: 'project.openzen.description',
    tags: ['Digital Humanities', 'TEI XML', 'Textual Criticism'],
    icon: null,
    links: [
      { type: 'github', url: 'https://github.com/Fabulu/woodblockeditionprocess', labelKey: 'project.links.github' },
    ],
  },
  {
    id: 'busin0',
    featured: false,
    titleKey: 'Busin 0: Wizardry Alternative Neo',
    taglineKey: 'project.busin0.tagline',
    descriptionKey: 'project.busin0.description',
    tags: ['PS2', 'ROM Hacking', 'Reverse Engineering', 'xdelta', 'Translation'],
    icon: '/icons/busin0.png',
    links: [
      { type: 'website', url: 'https://busin0-en.pages.dev', labelKey: 'project.links.website' },
    ],
  },
];
