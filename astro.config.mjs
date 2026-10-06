// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import starlight from '@astrojs/starlight';
import tailwindcss from '@tailwindcss/vite';
import sitemap, { ChangeFreqEnum } from '@astrojs/sitemap';

// Canonical domain is env-driven so the later move to sportykore.com is a
// one-variable change (WEBSITE_BUILD_BRIEF.md §9).
const site = process.env.PUBLIC_SITE_URL ?? 'https://www.sportykore.com';

/** @param {string} pageUrl */
function pathnameOf(pageUrl) {
	return new URL(pageUrl).pathname.replace(/\/$/, '') || '/';
}

// https://astro.build/config
export default defineConfig({
	site,
	output: 'server',
	adapter: cloudflare(),
	integrations: [
		starlight({
			title: 'Sportykore Docs',
			description:
				'User guides for running grassroots football competitions with Sportykore.',
			favicon: '/favicon.ico',
			customCss: ['/src/styles/docs.css'],
			components: {
				Header: './src/components/docs/StarlightHeader.astro',
				PageTitle: './src/components/docs/StarlightPageTitle.astro',
			},
			social: [
				{
					icon: 'instagram',
					label: 'Instagram',
					href: 'https://www.instagram.com/sportykore',
				},
				{
					icon: 'x.com',
					label: 'X',
					href: 'https://x.com/sportykore',
				},
			],
			sidebar: [
				{
					label: 'Start here',
					items: [
						{ label: 'Documentation home', slug: 'docs' },
						{ label: 'Getting started', slug: 'docs/getting-started' },
						{ label: 'Sign in with email code', slug: 'docs/sign-in' },
						{ label: 'Create your first competition', slug: 'docs/first-competition' },
					],
				},
				{
					label: 'Manage competitions',
					items: [
						{ label: 'Run seasons', slug: 'docs/seasons' },
						{ label: 'Teams, rosters, and invites', slug: 'docs/teams-rosters-invites' },
						{ label: 'Venues', slug: 'docs/venues' },
					],
				},
				{
					label: 'Match day',
					items: [
						{ label: 'Fixtures and live match day', slug: 'docs/fixtures-match-day' },
						{ label: 'Lineups', slug: 'docs/lineups' },
						{ label: 'Standings', slug: 'docs/standings' },
						{ label: 'Knockout brackets', slug: 'docs/knockout-brackets' },
					],
				},
				{
					label: 'Players and discovery',
					items: [
						{ label: 'Player profiles and stats', slug: 'docs/player-profiles-stats' },
						{ label: 'Public discovery', slug: 'docs/public-discovery' },
						{ label: 'Offline and live updates', slug: 'docs/offline-live-updates' },
					],
				},
				{
					label: 'Reference',
					items: [
						{ label: 'Limits and roadmap', slug: 'docs/limits-roadmap' },
						{ label: 'Maintaining these docs', slug: 'docs/contributing' },
					],
				},
			],
			credits: false,
			lastUpdated: false,
			locales: {
				root: {
					label: 'English',
					lang: 'en-NG',
				},
			},
		}),
		sitemap({
			filter: (page) => {
				const path = pathnameOf(page);
				return path !== '/thanks' && !path.startsWith('/api');
			},
			serialize(item) {
				const path = pathnameOf(item.url);
				const lastmod = new Date().toISOString();
				item.lastmod = lastmod;

				if (path === '/') {
					item.priority = 1.0;
					item.changefreq = ChangeFreqEnum.WEEKLY;
					return item;
				}

				if (path === '/players' || path === '/organizers' || path === '/faq') {
					item.priority = 0.8;
					item.changefreq = ChangeFreqEnum.WEEKLY;
					return item;
				}

				if (path === '/privacy' || path === '/terms') {
					item.priority = 0.3;
					item.changefreq = ChangeFreqEnum.YEARLY;
					return item;
				}

				item.priority = 0.5;
				item.changefreq = ChangeFreqEnum.MONTHLY;
				return item;
			},
		}),
	],
	vite: {
		plugins: [tailwindcss()],
	},
});
