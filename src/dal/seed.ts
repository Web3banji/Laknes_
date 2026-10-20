/**
 * Seed script for populating canonical Elysium ecosystem projects and quests.
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const dbPath = path.resolve(process.cwd(), 'data', 'laknes.db');
const db = new DatabaseSync(dbPath);

console.log('[Seed] Seeding canonical Elysium projects and quests...');

const now = new Date().toISOString();

// Check if admin user exists, or create one
let admin = db.prepare("SELECT id FROM users WHERE email = 'admin@elysium.org'").get() as { id: string } | undefined;
if (!admin) {
  const adminId = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = crypto.pbkdf2Sync('AdminElysium2026!', salt, 10000, 64, 'sha512').toString('hex');
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, salt, profile_image, bio, roles, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    adminId,
    'elysium_admin',
    'admin@elysium.org',
    passwordHash,
    salt,
    'https://lh3.googleusercontent.com/aida/AEtjO1V5cyyaQTFsv5FnNtyApKuUcWoOSBmKQpBBqqKlsisjUy2HBlwR_lSTNLyzJzm9QhyVvAx8Xq2ko76Al4Wsbz6iDzK8MWNRKxDpEbXYWPk-qXv3fK5Kg-2xj_4pGl4yXPOr4m93QMmT_ny1urp5u4UlKpNeS_aKY88fn7_DVV4X0fv4kRZhGxvmamNUmyaxGGBdKA8KSQ9OswtwOtBuDCGyvmYreRkbAoOvu84DmMod7KSwYQ1Uz-DNGh4IYYQfX9lv8kXkEtNlRg',
    'Elysium Foundation Core Ecosystem Maintainer',
    JSON.stringify(['USER', 'ADMIN']),
    now,
    now
  );
  admin = { id: adminId };
}

// Canonical Projects
const canonicalProjects = [
  {
    name: 'Chronos DEX',
    slug: 'chronos-dex',
    category: 'DEFI',
    shortDescription: 'Next-generation concentrated liquidity decentralized exchange and high-efficiency AMM natively built on Elysium.',
    description: 'Chronos is Elysium\'s premier concentrated liquidity automated market maker. Engineered for institutional capital efficiency and ultra-low slippage, Chronos powers seamless swaps, deep liquidity pools, and automated yield compounding strategies.',
    websiteUrl: 'https://chronos.elysium.org',
    documentationUrl: 'https://docs.chronos.elysium.org',
    bannerUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1622979135225-d2ba269bc1df?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/ChronosDEX',
      discord: 'https://discord.gg/chronos-elysium',
      telegram: 'https://t.me/chronos_dex'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium L1'
  },
  {
    name: 'Aethelgard Network',
    slug: 'aethelgard-network',
    category: 'INFRASTRUCTURE',
    shortDescription: 'Decentralized zero-knowledge rollup execution layer securing sub-second transaction finality on Elysium.',
    description: 'Aethelgard delivers hyperscaled modular execution with zero-knowledge validity proofs directly settled onto the Elysium consensus layer. It enables high-frequency applications, gasless account abstraction, and provable privacy.',
    websiteUrl: 'https://aethelgard.io',
    documentationUrl: 'https://docs.aethelgard.io',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/AethelgardNet',
      discord: 'https://discord.gg/aethelgard'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium Modular'
  },
  {
    name: 'Mythos Game Hub',
    slug: 'mythos-game-hub',
    category: 'GAMING',
    shortDescription: 'Massive multiplayer web3 gaming portal with sovereign cross-game assets and player-governed arenas.',
    description: 'Mythos is an open metaverse gaming ecosystem featuring interoperable NFT characters, tournament battlegrounds, and real-time guild battle arenas with zero-friction onboarding powered by Elysium session keys.',
    websiteUrl: 'https://mythos.game',
    documentationUrl: 'https://docs.mythos.game',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/MythosGaming',
      discord: 'https://discord.gg/mythos'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium Gaming'
  },
  {
    name: 'Vespera Oracle',
    slug: 'vespera-oracle',
    category: 'TOOLING',
    shortDescription: 'High-frequency verifiable cryptographic data feeds and decentralized compute nodes for smart contracts.',
    description: 'Vespera provides millisecond financial and real-world asset price feeds secured by cryptographic threshold signatures and native hardware enclaves, providing tamper-proof inputs for Elysium smart contracts.',
    websiteUrl: 'https://vespera.network',
    documentationUrl: 'https://docs.vespera.network',
    bannerUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/VesperaOracle',
      github: 'https://github.com/vespera-oracle'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium Data'
  },
  {
    name: 'Elysium Chronicle',
    slug: 'elysium-chronicle',
    category: 'SOCIAL',
    shortDescription: 'Censorship-resistant creator publishing network and decentralized identity graph powered by Elysium.',
    description: 'Elysium Chronicle empowers independent journalists, protocol researchers, and digital creators to tokenize written publications, curate decentralized newsletter feeds, and receive direct micropayments in ELYS.',
    websiteUrl: 'https://chronicle.elysium.org',
    documentationUrl: 'https://docs.chronicle.elysium.org',
    bannerUrl: 'https://images.unsplash.com/photo-1507842229451-7f01be7f0edb?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/ElysiumChronicle'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium Social'
  },
  {
    name: 'Hyperion Yield Vaults',
    slug: 'hyperion-yield',
    category: 'DEFI',
    shortDescription: 'Algorithmic yield optimizer and liquid staking vault system offering risk-adjusted returns on Elysium.',
    description: 'Hyperion automates yield rebalancing across leading liquidity pools, money markets, and validator staking contracts, giving users maximum APY with automated slippage protection and multi-sig security.',
    websiteUrl: 'https://hyperion.finance',
    documentationUrl: 'https://docs.hyperion.finance',
    bannerUrl: 'https://images.unsplash.com/photo-1642543492481-44e81e3914a7?auto=format&fit=crop&w=1200&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=200&q=80',
    socialLinks: {
      twitter: 'https://x.com/HyperionYield'
    },
    verificationStatus: 'VERIFIED',
    ecosystem: 'Elysium DeFi'
  }
];

const projectIds: Record<string, string> = {};

for (const p of canonicalProjects) {
  let existing = db.prepare('SELECT id FROM projects WHERE slug = ?').get(p.slug) as { id: string } | undefined;
  if (!existing) {
    const projId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO projects (
        id, name, slug, logo_url, banner_url, short_description, description,
        category, website_url, documentation_url, social_links, contract_addresses,
        representative_info, supporting_info, ecosystem, verification_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      projId,
      p.name,
      p.slug,
      p.logoUrl,
      p.bannerUrl,
      p.shortDescription,
      p.description,
      p.category,
      p.websiteUrl,
      p.documentationUrl,
      JSON.stringify(p.socialLinks),
      JSON.stringify(['0x429Elysium...71F9']),
      JSON.stringify({ lead: 'Foundation Core' }),
      'Verified via Elysium Genesis Consortium',
      p.ecosystem,
      p.verificationStatus,
      now,
      now
    );
    projectIds[p.slug] = projId;
    console.log(`[Seed] Created project: ${p.name}`);
  } else {
    projectIds[p.slug] = existing.id;
    // Update banner and details if missing
    db.prepare(`
      UPDATE projects SET
        banner_url = ?, logo_url = ?, short_description = ?, description = ?, verification_status = 'VERIFIED'
      WHERE id = ?
    `).run(p.bannerUrl, p.logoUrl, p.shortDescription, p.description, existing.id);
    console.log(`[Seed] Updated project: ${p.name}`);
  }
}

// Canonical Quests
const canonicalQuests = [
  {
    projectSlug: 'chronos-dex',
    title: 'Testnet Genesis Liquidity Provider',
    description: 'Provide initial liquidity on Chronos DEX testnet, bridge at least 100 testnet ELYS, and verify your LP position on-chain.',
    instructions: '1. Connect your wallet to Elysium Testnet.\n2. Swap testnet ELYS for USDC.\n3. Deposit into the ELYS/USDC 0.05% concentrated pool.\n4. Submit your transaction hash.',
    questType: 'ONCHAIN',
    rewardConfig: {
      rewardType: 'POINTS',
      amount: 500,
      rewardDetails: '500 Horizon XP + Genesis LP Badge'
    },
    completionCriteria: {
      requiresProof: true,
      proofType: 'TRANSACTION_HASH',
      verificationMethod: 'MANUAL_REVIEW'
    }
  },
  {
    projectSlug: 'mythos-game-hub',
    title: 'Guild Recruitment & Arena Pioneer',
    description: 'Join the Mythos Discord community, verify your player profile, and participate in the first realm multiplayer arena battle.',
    instructions: '1. Link your Discord in your user settings.\n2. Join the Mythos Discord.\n3. Enter the #arena-lobby and complete 1 casual match.\n4. Paste your match summary URL.',
    questType: 'COMMUNITY',
    rewardConfig: {
      rewardType: 'ROLE',
      amount: 250,
      rewardDetails: '250 Horizon XP + Guild Pioneer Discord Role'
    },
    completionCriteria: {
      requiresProof: true,
      proofType: 'URL',
      verificationMethod: 'MANUAL_REVIEW'
    }
  },
  {
    projectSlug: 'vespera-oracle',
    title: 'Oracle Feeder Validator Benchmark',
    description: 'Run the lightweight Vespera price feeder Docker container, submit 50 verifiable price attestations, and record your node latency.',
    instructions: '1. Clone the Vespera Feeder repository.\n2. Launch with `docker compose up -d`.\n3. Allow 50 consensus attestations to sync.\n4. Paste your node public address.',
    questType: 'DEVELOPER',
    rewardConfig: {
      rewardType: 'TOKEN',
      amount: 50,
      rewardDetails: '50 ELYS + 1,000 Horizon XP'
    },
    completionCriteria: {
      requiresProof: true,
      proofType: 'TEXT',
      verificationMethod: 'MANUAL_REVIEW'
    }
  },
  {
    projectSlug: 'elysium-chronicle',
    title: 'Editorial Governance Alpha Tester',
    description: 'Publish your first decentralized article draft on Chronicle, submit UX feedback on gasless publishing, and vote on community guidelines.',
    instructions: '1. Draft an article of at least 200 words on Elysium ecosystem development.\n2. Sign the publication transaction.\n3. Submit your published article link.',
    questType: 'FEEDBACK',
    rewardConfig: {
      rewardType: 'POINTS',
      amount: 300,
      rewardDetails: '300 Horizon XP'
    },
    completionCriteria: {
      requiresProof: true,
      proofType: 'URL',
      verificationMethod: 'MANUAL_REVIEW'
    }
  },
  {
    projectSlug: 'aethelgard-network',
    title: 'ZK-Prover Micro-Benchmark Challenge',
    description: 'Generate and submit a zero-knowledge validity proof using Aethelgard browser prover to test cryptographic client acceleration.',
    instructions: '1. Open the Aethelgard web prover interface.\n2. Run the WASM ZK benchmark.\n3. Submit the generated proof receipt hash.',
    questType: 'ONCHAIN',
    rewardConfig: {
      rewardType: 'BADGE',
      amount: 750,
      rewardDetails: '750 Horizon XP + Master Cryptographer Badge'
    },
    completionCriteria: {
      requiresProof: true,
      proofType: 'TRANSACTION_HASH',
      verificationMethod: 'MANUAL_REVIEW'
    }
  }
];

for (const q of canonicalQuests) {
  const projectId = projectIds[q.projectSlug];
  if (!projectId) continue;

  const existing = db.prepare('SELECT id FROM quests WHERE project_id = ? AND title = ?').get(projectId, q.title);
  if (!existing) {
    const questId = crypto.randomUUID();
    db.prepare(`
      INSERT INTO quests (
        id, project_id, title, description, instructions, quest_type,
        eligibility_rules, completion_criteria, start_at, deadline,
        reward_configuration, publication_status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      questId,
      projectId,
      q.title,
      q.description,
      q.instructions,
      q.questType,
      JSON.stringify({ minAccountAgeDays: 0 }),
      JSON.stringify(q.completionCriteria),
      now,
      null,
      JSON.stringify(q.rewardConfig),
      'PUBLISHED',
      now,
      now
    );
    console.log(`[Seed] Created quest: ${q.title}`);
  }
}

console.log('[Seed] Seeding completed successfully!');
