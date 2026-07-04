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
    description: 'A local-first wiki that syncs Obsidian notes into a searchable knowledge graph.',
    achievements: [
      'Orchestrated a TypeScript monorepo using Turborepo and Biome for linting, type-checking, and build caching.',
      'Designed a hybrid search RAG pipeline integrating Gemini and local Ollama models, optimizing context retrieval.',
      'Built a real-time markdown parser and file watcher synchronizing note vaults to PostgreSQL via Drizzle ORM.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/llm-wiki',
    domains: ['AI & Intelligence', 'Backend'],
    technologies: ['TypeScript', 'React', 'TanStack Start', 'TanStack React Router', 'TanStack React Query', 'Vite', 'Tailwind CSS', 'Bun', 'Elysia', 'ORPC', 'Drizzle ORM', 'PostgreSQL', 'pgvector', 'Gemini', 'Ollama', 'd3-force', 'Obsidian', 'Vitest'],
    imageUrl: '/projects/llmwiki/screenshot.png'
  },
  {
    id: 'ledgertrace',
    category: 'hackathon',
    title: 'LedgerTrace',
    subtitle: 'AI Marathon 2026',
    description: 'An async reconciliation engine for Stripe and TRON payment events.',
    achievements: [
      'Developed an asynchronous middleware pipeline using Redis to ingest payment events with real-time FX enrichment.',
      'Deployed secure policy-gating using Trusted Execution Environments (TEE) to validate inbound payloads.',
      'Integrated deterministic gating to post validated transactions to a Blnk double-entry ledger database.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/LedgerTrace',
    domains: ['Backend', 'DevOps'],
    technologies: ['TypeScript', 'Bun', 'React', 'Next.js', 'Express', 'PostgreSQL', 'Redis', 'BullMQ', 'Docker Compose', 'Blnk', 'Chutes AI', 'Stripe', 'TRON', 'Git'],
    imageUrl: '/projects/aimarathon/screenshot.png',
    videoUrl: 'https://youtu.be/1o_8vI79uZQ'
  },
  {
    id: 'umhackathon',
    category: 'hackathon',
    title: 'WarungAI',
    subtitle: 'UMHackathon 2026',
    description: 'A voice assistant for micro-SMEs to manage orders and stock.',
    achievements: [
      'Constructed local speech transcription handlers using open LLM sound models.',
      'Designed relational structures in PostgreSQL to log incoming customer orders.',
      'Created dashboard for micro-stall merchants to monitor revenue in real-time.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/UMHackathon-WarungAI',
    domains: ['AI & Intelligence', 'Backend'],
    technologies: ['TypeScript', 'Node.js', 'Hono.js', 'PostgreSQL', 'pgvector', 'Redis', 'BullMQ', 'Docker', 'Telegram Bot', 'ILMU-GLM-5.1', 'GLM-OCR', 'Whisper.cpp'],
    imageUrl: '/projects/umhackathon/screenshot.png',
    videoUrl: 'https://youtu.be/B28F81tFSwQ'
  },
  {
    id: 'myai-future',
    category: 'hackathon',
    title: 'AEGIS',
    subtitle: 'MyAI Future Hackathon 2026',
    description: 'An offline-first disaster relief platform for flood response.',
    achievements: [
      'Integrated OpenCV pipelines to analyze frame feeds and overlay bounding boxes.',
      'Engineered Redis queuing to process safety alerts without blocking video feeds.',
      'Configured multi-container Docker compose environments for local edge node testing.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/MyAI_Future_Hackathon-AEGIS',
    domains: ['AI & Intelligence'],
    technologies: ['Next.js 16', 'React', 'Tailwind CSS 4', 'Framer Motion', 'TanStack Query', 'React-Leaflet', 'Leaflet', 'Node.js', 'Express', 'Prisma', 'PostgreSQL', 'PostGIS', 'Firebase Genkit', 'Gemini 2.5 Flash', 'Kotlin', 'Jetpack Compose', 'Room', 'Dagger Hilt', 'SQLCipher', 'ML Kit OCR', 'WorkManager', 'GitHub Actions', 'Discord Webhooks'],
    imageUrl: '/projects/myaifuture/screenshot.png',
    videoUrl: 'https://youtu.be/WdT77Km9cOc'
  },
  {
    id: 'kitahack',
    category: 'hackathon',
    title: 'Shelf OS',
    subtitle: 'KitaHack 2026',
    description: 'An AI retail system for shelf auditing and waste reduction.',
    achievements: [
      'Developed server handlers to trace device heartbeats and shelf load capacities.',
      'Designed local database schemas using SQLite to manage instant item records.',
      'Crafted responsive layout displaying active warning states for low-stock shelves.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/KitaHack_Shelf-OS',
    domains: ['Backend'],
    technologies: ['Dart', 'Flutter', 'Firebase', 'Firestore', 'Python', 'Google Cloud Functions', 'Vertex AI', 'Gemini 2.5 Flash', 'Cloud Storage', 'Cloud Pub/Sub', 'Google Cloud'],
    imageUrl: '/projects/kitahack/screenshot.png',
    videoUrl: 'https://youtu.be/ZXsvXQVFl1M'
  },
  {
    id: 'greatmalaysiaai',
    category: 'hackathon',
    title: 'AI Powered Learning Companion',
    subtitle: 'Great Malaysia AI Hackathon 2025',
    description: 'An AI study companion that turns text into flashcards, summaries, and schedules.',
    achievements: [
      'Constructed text parsing logic to decompose syllabus contents into semantic chunks.',
      'Engineered LLM prompts to extract key educational takeaways and format flashcards.',
      'Implemented dashboard to track student study history and recall metrics.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/GreatMalaysiaAIHackathon_AI-Powered-Learning-Companion',
    domains: ['AI & Intelligence'],
    technologies: ['TypeScript', 'React', 'Vite', 'Tailwind CSS', 'Node.js', 'Express.js', 'AWS Bedrock', 'Amazon Comprehend', 'Amazon Translate', 'Amazon Transcribe', 'Amazon Polly', 'DynamoDB', 'Docker', 'S3', 'App Runner', 'ECR'],
    imageUrl: '/projects/greatmalaysiaai/screenshot.png',
    videoUrl: 'https://youtu.be/DEYFJtiCJsI'
  },
  {
    id: 'devmatch',
    category: 'hackathon',
    title: 'EcoChain',
    subtitle: 'DevMatch Hackathon 2025',
    description: 'A blockchain app for tracking environmental data and carbon credits.',
    achievements: [
      'Designed EVM smart contracts in Solidity for tracking offset credits and verifying green compliance.',
      'Built a NextJS web dashboard showing real-time carbon statistics and transaction history.',
      'Integrated Web3 wallet connections to manage carbon credit assets securely.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/DevMatch-EcoChain',
    domains: ['Backend'],
    technologies: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Sui SDK', 'zkLogin', 'Solidity', 'Hardhat', 'The Graph', 'Oasis ROFL', 'Google Gemini API', 'React Icons', 'React Markdown', 'Recharts', 'Chart.js'],
    imageUrl: '/projects/devmatch/screenshot.png',
    videoUrl: 'https://youtu.be/XhHIwUfuJPs'
  },
  {
    id: 'futurehack',
    category: 'hackathon',
    title: 'Fake Review and Fraud Detection',
    subtitle: 'FutureHack 2025',
    description: 'A fake review detector using NLP and behavioral fraud signals.',
    achievements: [
      'Created review classification algorithms in Python using NLP sentiment scoring.',
      'Conducted regression and cluster analysis in R to model merchant risk scores.',
      'Designed transactional audit schemas in PostgreSQL to flag anomalies.'
    ],
    githubUrl: 'https://github.com/ryanlau1220/FutureHack_Fake-Review-and-Fraud-Detection',
    domains: ['AI & Intelligence'],
    technologies: ['Python', 'FastAPI', 'PyTorch', 'Hugging Face Transformers', 'BERT', 'R', 'PostgreSQL', 'HTML5', 'CSS3', 'JavaScript'],
    imageUrl: '/projects/futurehack/screenshot.png'
  },
  {
    id: 'krypitalx',
    category: 'internship',
    title: 'KrypitalX',
    subtitle: 'Centralized Trading Platform',
    description: 'A crypto exchange platform for wallet flows, compliance checks, and live account updates.',
    achievements: [
      'Owned the end-to-end design of centralized exchange backend services in Go, implementing compliant wallet flows.',
      'Spearheaded real-time event pipeline integrations using Redis Pub/Sub to trigger instant frontend state updates.',
      'Centralized IAM and user authentication infrastructure utilizing Keycloak for standard OIDC protocols.'
    ],
    domains: ['Backend', 'DevOps'],
    technologies: ['Go', 'React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Redux Toolkit', 'TanStack Query', 'React Router', 'Framer Motion', 'GSAP', 'Keycloak', 'AWS Amplify', 'Stripe', 'Solana Web3.js', 'Viem', 'Redis', 'PostgreSQL', 'GORM', 'Docker', 'GitHub Actions', 'Atlas']
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
    technologies: ['R Programming', 'ERP Systems'],
    sortKey: 202602
  },
  {
    id: 'internship-fp',
    role: 'Software Engineer Intern',
    company: 'First Pavilion Technology Sdn Bhd',
    period: 'Sept 2025 – Jan 2026',
    description: 'Owned centralized exchange wallet development, Keycloak IAM integration, and Docker CI/CD pipelines.',
    achievements: [
      'Designed centralized backend wallet services and tiered compliance checks.',
      'Built Redis event notifications to synchronize client frontend state changes.',
      'Managed database migrations and automated deployment workflows via GitHub Actions.'
    ],
    domains: ['Backend', 'DevOps'],
    technologies: ['Go', 'Redis', 'Docker', 'Git', 'Jira', 'Keycloak', 'Solidity'],
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
    technologies: ['Flutter', 'Java', 'Python', 'MySQL', 'HTML', 'PHP', 'CSS', 'JavaScript'],
    sortKey: 202308
  }
];

export const EVENTS: EventItem[] = [
  {
    id: 'event-ledgertrace',
    title: 'LedgerTrace',
    event: 'AI Marathon 2026',
    date: 'May 2026',
    role: 'Backend Developer',
    description: 'Designed asynchronous double-entry analytical ledgers and Stripe/TRON webhook processing.',
    category: 'hackathon',
    featured: true,
    technologies: ['Bun', 'Turborepo', 'Blnk', 'Stripe', 'TronGrid', 'Chutes AI TEE Models', 'OAuth'],
    sortKey: 202605
  },
  {
    id: 'event-warung',
    title: 'Warung AI',
    event: 'UMHackathon 2026',
    date: 'Apr 2026',
    role: 'Participant',
    description: 'Developed an AI conversational merchant voice assistant to automate order tracking and inventory forecasting.',
    category: 'hackathon',
    featured: true,
    technologies: ['Telegram Bot', 'Hono.js', 'pgvector', 'Whisper.cpp', 'Ollama', 'ILMU-GLM-5.1', 'BullMQ', 'Cloudflare Tunnel'],
    sortKey: 2026042
  },
  {
    id: 'event-aegis',
    title: 'AEGIS',
    event: 'MyAI Future Hackathon 2026',
    date: 'Apr 2026',
    role: 'Participant',
    description: 'Co-created a computer vision safety monitoring system integrated with local LLMs to flag compliance risks.',
    category: 'hackathon',
    featured: true,
    technologies: ['Kotlin', 'Jetpack Compose', 'PostGIS', 'Prisma', 'Firebase Genkit', 'ML Kit OCR', 'Biometric Auth'],
    sortKey: 2026041
  },
  {
    id: 'event-futurehack',
    title: 'Fake Review and Fraud Detection',
    event: 'FutureHack 2025',
    date: 'Jul 2025',
    role: 'Participant',
    description: 'Created NLP sentiment review detection models and transactional outlier regression scoring.',
    category: 'hackathon',
    featured: true,
    technologies: ['Python', 'BERT', 'HTML'],
    sortKey: 202507
  },
  {
    id: 'event-devmatch',
    title: 'EcoChain',
    event: 'DevMatch Hackathon 2025',
    date: 'Aug 2025',
    role: 'Participant',
    description: 'Authored EVM carbon credit offsets tracking smart contracts in Solidity and NextJS Web3 controls.',
    category: 'hackathon',
    featured: true,
    technologies: ['Solidity', 'Next.js', 'Sui SDK', 'Hardhat', 'The Graph', 'Oasis ROFL'],
    sortKey: 202508
  },
  {
    id: 'event-greatmalaysia',
    title: 'AI-Powered Learning Companion',
    event: 'Great Malaysia AI Hackathon 2025',
    date: 'Sep 2025',
    role: 'Participant',
    description: 'Designed LLM parsing algorithms and adaptive retrieval prompts for personalized flashcard generation.',
    category: 'hackathon',
    featured: true,
    technologies: ['AWS App Runner', 'Amazon Bedrock', 'AWS S3', 'AWS ECR', 'AWS Translate', 'AWS Comprehend', 'React', 'Docker'],
    sortKey: 202509
  },
  {
    id: 'event-kitahack',
    title: 'Shelf OS',
    event: 'KitaHack 2026',
    date: 'Feb 2026',
    role: 'Participant',
    description: 'Built a local inventory shelf tracker with device heartbeat statuses and SQLite warning flags.',
    category: 'hackathon',
    featured: true,
    technologies: ['Flutter', 'Vertex AI', 'GCP', 'Firebase', 'Cloud Pub/Sub', 'Firestore'],
    sortKey: 202602
  }
];
