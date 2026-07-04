export interface Project {
  id: string;
  category: 'open-source' | 'hackathon' | 'internship';
  title: string;
  subtitle: string;
  description: string;
  achievements: string[];
  githubUrl?: string;
  demoUrl?: string;
  domains: string[];
  technologies: string[];
  imageUrl?: string;
  videoUrl?: string;
}

export interface Experience {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
  achievements: string[];
  domains: string[];
  technologies: string[];
  sortKey: number;
}

export interface EventItem {
  id: string;
  title: string;
  event: string;
  date: string;
  role: string;
  outcome?: string;
  description: string;
  category: 'hackathon' | 'education' | 'internship' | 'other';
  featured: boolean;
  technologies: string[];
  sortKey: number;
}

export const PROJECTS: Project[] = [
  {
    id: 'llm-wiki',
    category: 'open-source',
    title: 'LLM-Wiki',
    subtitle: 'Open Source AI Vault Sync',
    description: 'A local-first AI knowledge extraction engine that watches note vaults and indexes them into structured databases for sub-200ms semantic querying.',
    achievements: [
      'Orchestrated a TypeScript monorepo using Turborepo and Biome for linting, type-checking, and build caching.',
      'Designed a hybrid search RAG pipeline integrating Gemini and local Ollama models, optimizing context retrieval.',
      'Built a real-time markdown parser and file watcher synchronizing note vaults to PostgreSQL via Drizzle ORM.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/llm-wiki',
    domains: ['AI & Intelligence', 'Backend'],
    technologies: ['TypeScript', 'NextJS', 'PostgreSQL', 'pgvector', 'Redis', 'Git'],
    imageUrl: '/projects/llmwiki/screenshot.png'
  },
  {
    id: 'krypitalx',
    category: 'internship',
    title: 'KrypitalX',
    subtitle: 'Centralized Exchange Ledger',
    description: 'A centralized crypto exchange backend wallet service that manages core wallet flows, transaction ledgers, and tiered compliance screening.',
    achievements: [
      'Owned the end-to-end design of centralized exchange backend services in Go, implementing compliant wallet flows.',
      'Spearheaded real-time event pipeline integrations using Redis Pub/Sub to trigger instant frontend state updates.',
      'Centralized IAM and user authentication infrastructure utilizing Keycloak for standard OIDC protocols.'
    ],
    domains: ['Backend', 'DevOps'],
    technologies: ['Golang', 'Redis', 'ReactJS', 'Docker', 'Git']
  },
  {
    id: 'ledgertrace',
    category: 'hackathon',
    title: 'LedgerTrace',
    subtitle: 'Analytical Middleware Engine',
    description: 'An asynchronous fintech middleware engine that ingests high-frequency payment webhooks and double-entry logs transactions in secure environments.',
    achievements: [
      'Developed an asynchronous middleware pipeline using Redis to ingest payment events with real-time FX enrichment.',
      'Deployed secure policy-gating using Trusted Execution Environments (TEE) to validate inbound payloads.',
      'Integrated deterministic gating to post validated transactions to a Blnk double-entry ledger database.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/LedgerTrace',
    domains: ['Backend', 'DevOps'],
    technologies: ['TypeScript', 'NodeJS', 'Redis', 'Docker', 'Git'],
    imageUrl: '/projects/aimarathon/screenshot.png',
    videoUrl: 'https://youtu.be/1o_8vI79uZQ'
  },
  {
    id: 'devmatch',
    category: 'hackathon',
    title: 'EcoChain',
    subtitle: 'Decentralized Carbon Tracking (DevMatch)',
    description: 'A blockchain-based carbon offset tracking platform that registers ecological contributions and transfers green credits transparently.',
    achievements: [
      'Designed EVM smart contracts in Solidity for tracking offset credits and verifying green compliance.',
      'Built a NextJS web dashboard showing real-time carbon statistics and transaction history.',
      'Integrated Web3 wallet connections to manage carbon credit assets securely.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/DevMatch-EcoChain',
    domains: ['Backend'],
    technologies: ['Solidity', 'ReactJS', 'TypeScript', 'NextJS', 'Git'],
    imageUrl: '/projects/devmatch/screenshot.png',
    videoUrl: 'https://youtu.be/XhHIwUfuJPs'
  },
  {
    id: 'futurehack',
    category: 'hackathon',
    title: 'FraudShield',
    subtitle: 'Review & Fraud Detection (FutureHack)',
    description: 'A statistical fraud detection engine that identifies suspicious merchant behaviors and fake reviews using data analysis pipelines.',
    achievements: [
      'Created review classification algorithms in Python using NLP sentiment scoring.',
      'Conducted regression and cluster analysis in R to model merchant risk scores.',
      'Designed transactional audit schemas in PostgreSQL to flag anomalies.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/FutureHack_Fake-Review-and-Fraud-Detection',
    domains: ['AI & Intelligence'],
    technologies: ['Python', 'R', 'PostgreSQL', 'Git'],
    imageUrl: '/projects/futurehack/screenshot.png'
  },
  {
    id: 'greatmalaysiaai',
    category: 'hackathon',
    title: 'StudyBuddy AI',
    subtitle: 'AI Learning Companion (GreatMalaysiaAI)',
    description: 'An adaptive AI companion that parses text materials to automatically generate personalized flashcards, study schedules, and summaries.',
    achievements: [
      'Constructed text parsing logic to decompose syllabus contents into semantic chunks.',
      'Engineered LLM prompts to extract key educational takeaways and format flashcards.',
      'Implemented dashboard to track student study history and recall metrics.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/GreatMalaysiaAIHackathon_AI-Powered-Learning-Companion',
    domains: ['AI & Intelligence'],
    technologies: ['TypeScript', 'NextJS', 'PostgreSQL', 'Git'],
    imageUrl: '/projects/greatmalaysiaai/screenshot.png',
    videoUrl: 'https://youtu.be/DEYFJtiCJsI'
  },
  {
    id: 'kitahack',
    category: 'hackathon',
    title: 'Shelf OS',
    subtitle: 'Warehouse Stocking System (KitaHack)',
    description: 'An intelligent warehouse operational system featuring automated inventory tracking and localized device status monitoring.',
    achievements: [
      'Developed server handlers to trace device heartbeats and shelf load capacities.',
      'Designed local database schemas using SQLite to manage instant item records.',
      'Crafted responsive layout displaying active warning states for low-stock shelves.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/KitaHack_Shelf-OS',
    domains: ['Backend'],
    technologies: ['TypeScript', 'ReactJS', 'NodeJS', 'SQLite', 'Git'],
    imageUrl: '/projects/kitahack/screenshot.png',
    videoUrl: 'https://youtu.be/ZXsvXQVFl1M'
  },
  {
    id: 'myai-future',
    category: 'hackathon',
    title: 'Project AEGIS',
    subtitle: 'Warehouse Safety Monitor (MyAI Future)',
    description: 'A computer vision safety compliance system that processes warehouse footage to detect compliance violations in real-time.',
    achievements: [
      'Integrated OpenCV pipelines to analyze frame feeds and overlay bounding boxes.',
      'Engineered Redis queuing to process safety alerts without blocking video feeds.',
      'Configured multi-container Docker compose environments for local edge node testing.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/MyAI_Future_Hackathon-AEGIS',
    domains: ['AI & Intelligence'],
    technologies: ['Python', 'Docker', 'Redis', 'Git'],
    imageUrl: '/projects/myaifuture/screenshot.png',
    videoUrl: 'https://youtu.be/WdT77Km9cOc'
  },
  {
    id: 'umhackathon',
    category: 'hackathon',
    title: 'WarungAI',
    subtitle: 'Conversational Stall Assistant (UMHack)',
    description: 'A local-language conversational voice assistant designed for street vendors to automate order management and inventory updates.',
    achievements: [
      'Constructed local speech transcription handlers using open LLM sound models.',
      'Designed relational structures in PostgreSQL to log incoming customer orders.',
      'Created dashboard for micro-stall merchants to monitor revenue in real-time.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/UMHackathon-WarungAI',
    domains: ['AI & Intelligence', 'Backend'],
    technologies: ['TypeScript', 'ReactJS', 'NodeJS', 'PostgreSQL', 'Git'],
    imageUrl: '/projects/umhackathon/screenshot.png',
    videoUrl: 'https://youtu.be/B28F81tFSwQ'
  }
];

export const EXPERIENCES: Experience[] = [
  {
    id: 'edu-bsc',
    role: 'BS in Software Engineering',
    company: 'Asia Pacific University (APU)',
    period: 'Feb 2026 – Present',
    description: 'Pursuing advanced software engineering studies focusing on architecture and distributed databases.',
    achievements: [
      'Deepening core engineering concepts in distributed ledger databases.',
      'Analyzing network protocols and low-latency system architectures.'
    ],
    domains: ['Education'],
    technologies: ['TypeScript', 'Golang', 'Java', 'Git'],
    sortKey: 202602
  },
  {
    id: 'internship-fp',
    role: 'Software Engineer Intern',
    company: 'Fintech Exchange Backend Team',
    period: 'Sept 2025 – Jan 2026',
    description: 'Owned centralized exchange wallet development, Keycloak IAM integration, and Docker CI/CD pipelines.',
    achievements: [
      'Designed centralized backend wallet services and tiered compliance checks.',
      'Built Redis event notifications to synchronize client frontend state changes.',
      'Managed database migrations and automated deployment workflows via GitHub Actions.'
    ],
    domains: ['Backend', 'DevOps'],
    technologies: ['Golang', 'Redis', 'Docker', 'Git'],
    sortKey: 202509
  },
  {
    id: 'edu-dip',
    role: 'Diploma in ICT',
    company: 'Asia Pacific University (APU)',
    period: 'Aug 2023 – Aug 2025',
    description: 'Completed core software foundations, object-oriented programming, and relational databases.',
    achievements: [
      'Graduated with a CGPA of 3.56 / 4.0.',
      'Built relational database projects and basic security models.'
    ],
    domains: ['Education'],
    technologies: ['Java', 'Python', 'MySQL', 'Git'],
    sortKey: 202308
  }
];

export const EVENTS: EventItem[] = [
  {
    id: 'event-ledgertrace',
    title: 'LedgerTrace Backend Architect',
    event: 'AI Marathon',
    date: 'May 2026',
    role: 'Participant',
    outcome: 'Fintech Innovation Spec',
    description: 'Designed asynchronous double-entry analytical ledgers and Stripe/TRON webhook processing.',
    category: 'hackathon',
    featured: true,
    technologies: ['TypeScript', 'NodeJS', 'Redis', 'Docker'],
    sortKey: 202605
  },
  {
    id: 'event-warung',
    title: 'Lead Full-Stack Developer',
    event: 'UMHackathon (WarungAI)',
    date: 'Apr 2026',
    role: 'Participant',
    outcome: 'Runner Up (2nd Place)',
    description: 'Developed an AI conversational merchant voice assistant to automate order tracking and inventory forecasting.',
    category: 'hackathon',
    featured: true,
    technologies: ['TypeScript', 'ReactJS', 'NodeJS', 'PostgreSQL', 'Ollama'],
    sortKey: 2026042
  },
  {
    id: 'event-aegis',
    title: 'Backend & CV Developer',
    event: 'MyAI Future Hackathon (Project AEGIS)',
    date: 'Apr 2026',
    role: 'Participant',
    outcome: 'Special Mention (Tech Innovation)',
    description: 'Co-created a computer vision safety monitoring system integrated with local LLMs to flag compliance risks.',
    category: 'hackathon',
    featured: true,
    technologies: ['Python', 'Docker', 'Redis'],
    sortKey: 2026041
  },
  {
    id: 'event-futurehack',
    title: 'Data & Sentiment Engineer',
    event: 'FutureHack (FraudShield)',
    date: 'Jul 2027',
    role: 'Participant',
    outcome: 'Fraud Classification Winner',
    description: 'Created NLP sentiment review detection models and transactional outlier regression scoring.',
    category: 'hackathon',
    featured: true,
    technologies: ['Python', 'R', 'PostgreSQL'],
    sortKey: 202707
  },
  {
    id: 'event-devmatch',
    title: 'Smart Contract Developer',
    event: 'DevMatch (EcoChain)',
    date: 'Aug 2025',
    role: 'Participant',
    outcome: 'Decentralized Track Finalist',
    description: 'Authored EVM carbon credit offsets tracking smart contracts in Solidity and NextJS Web3 controls.',
    category: 'hackathon',
    featured: true,
    technologies: ['Solidity', 'ReactJS', 'TypeScript', 'NextJS'],
    sortKey: 202508
  },
  {
    id: 'event-greatmalaysia',
    title: 'Core AI Developer',
    event: 'GreatMalaysiaAI (StudyBuddy AI)',
    date: 'Sep 2025',
    role: 'Participant',
    outcome: 'Top AI Tool Spec',
    description: 'Designed LLM parsing algorithms and adaptive retrieval prompts for personalized flashcard generation.',
    category: 'hackathon',
    featured: true,
    technologies: ['TypeScript', 'NextJS', 'PostgreSQL'],
    sortKey: 202509
  },
  {
    id: 'event-kitahack',
    title: 'Local OS Lead',
    event: 'KitaHack (Shelf OS)',
    date: 'Feb 2026',
    role: 'Participant',
    description: 'Built a local inventory shelf tracker with device heartbeat statuses and SQLite warning flags.',
    category: 'hackathon',
    featured: true,
    technologies: ['TypeScript', 'ReactJS', 'NodeJS', 'SQLite'],
    sortKey: 202602
  }
];
