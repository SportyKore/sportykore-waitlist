export const MODE_PROFILES = {
	football: {
		label: 'Football rules',
		matchSeconds: 90,
		goalTarget: 3,
		ownerRule: false,
		summary: 'Tactical play with throw-ins, corners, goal kicks and proper restarts.',
		help: 'Football rules use throw-ins, corners, goal kicks and full-ball-over-the-line scoring.',
		physics: {
			friction: 410,
			maxDrag: 125,
			powerScale: 7.6,
			cpuPowerScale: 6.6,
			restitution: 0.72,
			wallRestitution: 0.56,
			restSpeed: 10,
		},
		pacing: { cpuThinkDelay: 0.32, settleDelay: 0.24, goalPause: 0.65 },
	},
	street: {
		label: 'Street rules',
		matchSeconds: 60,
		goalTarget: 3,
		ownerRule: true,
		summary: 'Fast continuous play, stronger rebounds and the owner-of-the-ball challenge.',
		help: 'Street rules keep play moving off the walls. Avoid vexing the gold owner cap.',
		physics: {
			friction: 350,
			maxDrag: 125,
			powerScale: 8.25,
			cpuPowerScale: 7.2,
			restitution: 0.82,
			wallRestitution: 0.78,
			restSpeed: 11,
		},
		pacing: { cpuThinkDelay: 0.22, settleDelay: 0.18, goalPause: 0.55 },
	},
};

export function modeProfile(key) {
	return MODE_PROFILES[key] || MODE_PROFILES.football;
}
