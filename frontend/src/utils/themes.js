export const EVENT_TYPES = [
  {
    key: 'wedding',
    label: 'Wedding',
    description: 'Celebrate your special day',
    icon: 'Heart'
  },
  {
    key: 'birthday',
    label: 'Birthday',
    description: 'Make memories worth keeping',
    icon: 'Cake'
  },
  {
    key: 'corporate',
    label: 'Corporate',
    description: 'Professional event coverage',
    icon: 'Briefcase'
  }
];

export const TEMPLATES = {
  wedding: [
    {
      key: 'floral',
      name: 'Floral Romance',
      bg: '#fff1f2',
      text: '#881337',
      accent: '#f43f5e',
      button: '#be123c',
      headerFont: "'Playfair Display', serif",
      bodyFont: "'Cormorant Garamond', serif",
      description: 'Soft roses and delicate florals'
    },
    {
      key: 'minimalist',
      name: 'Pure Minimalist',
      bg: '#f8fafc',
      text: '#334155',
      accent: '#64748b',
      button: '#475569',
      headerFont: "'Playfair Display', serif",
      bodyFont: "Inter, sans-serif",
      description: 'Clean, timeless elegance'
    },
    {
      key: 'vintage',
      name: 'Golden Vintage',
      bg: '#fefce8',
      text: '#713f12',
      accent: '#d97706',
      button: '#a16207',
      headerFont: "'Playfair Display', serif",
      bodyFont: "'Cormorant Garamond', serif",
      description: 'Warm vintage charm'
    },
    {
      key: 'modern',
      name: 'Midnight Modern',
      bg: '#172554',
      text: '#f8fafc',
      accent: '#fbbf24',
      button: '#d97706',
      headerFont: "'Playfair Display', serif",
      bodyFont: "Inter, sans-serif",
      description: 'Deep navy with gold accents'
    }
  ],
  birthday: [
    {
      key: 'confetti',
      name: 'Confetti Party',
      bg: '#fef9c3',
      text: '#713f12',
      accent: '#ec4899',
      button: '#db2777',
      headerFont: "'Fredoka', sans-serif",
      bodyFont: "'Nunito', sans-serif",
      description: 'Bright and festive'
    },
    {
      key: 'balloons',
      name: 'Balloon Bliss',
      bg: '#f0f9ff',
      text: '#0c4a6e',
      accent: '#0284c7',
      button: '#0369a1',
      headerFont: "'Fredoka', sans-serif",
      bodyFont: "'Nunito', sans-serif",
      description: 'Pastel skies and balloons'
    },
    {
      key: 'elegant',
      name: 'Birthday Luxe',
      bg: '#3b0764',
      text: '#faf5ff',
      accent: '#fbbf24',
      button: '#d97706',
      headerFont: "'Fredoka', sans-serif",
      bodyFont: "Inter, sans-serif",
      description: 'Rich purple and gold'
    },
    {
      key: 'kids',
      name: 'Kids Fun',
      bg: '#eff6ff',
      text: '#1e3a8a',
      accent: '#f59e0b',
      button: '#2563eb',
      headerFont: "'Chewy', cursive",
      bodyFont: "'Varela Round', sans-serif",
      description: 'Playful and colorful'
    }
  ],
  corporate: [
    {
      key: 'modern_tech',
      name: 'Modern Tech',
      bg: '#0f172a',
      text: '#f8fafc',
      accent: '#06b6d4',
      button: '#0891b2',
      headerFont: "'Outfit', sans-serif",
      bodyFont: "Inter, sans-serif",
      description: 'Dark slate with cyan accents'
    },
    {
      key: 'classic',
      name: 'Classic Professional',
      bg: '#f1f5f9',
      text: '#1e293b',
      accent: '#475569',
      button: '#1e293b',
      headerFont: "'Outfit', sans-serif",
      bodyFont: "Inter, sans-serif",
      description: 'Trusted corporate navy'
    },
    {
      key: 'minimal',
      name: 'Pure Minimal',
      bg: '#ffffff',
      text: '#171717',
      accent: '#525252',
      button: '#171717',
      headerFont: "'Outfit', sans-serif",
      bodyFont: "Inter, sans-serif",
      description: 'Clean black and white'
    },
    {
      key: 'bold',
      name: 'Bold & Dynamic',
      bg: '#4c1d95',
      text: '#ffffff',
      accent: '#c084fc',
      button: '#7c3aed',
      headerFont: "'Outfit', sans-serif",
      bodyFont: "Inter, sans-serif",
      description: 'Deep purple statement'
    }
  ]
};

export function getTemplate(eventType, templateKey) {
  const templates = TEMPLATES[eventType] || TEMPLATES.wedding;
  return templates.find(t => t.key === templateKey) || templates[0];
}

export function getEventType(key) {
  return EVENT_TYPES.find(t => t.key === key) || EVENT_TYPES[0];
}
