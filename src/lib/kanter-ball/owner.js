export const OWNER_LIMITS = {
	calmMax: 2,
	warnStart: 3,
	vexStart: 5,
	collectAt: 7,
};

export const OWNER_COMMENTARY = {
	owner_1: 'Na him be the owner. No vex am.',
	owner_2: 'Owner dey warn you. Owner go soon collect e ball o.',
	owner_vex: 'Owner don dey vex o!',
	owner_warn: 'Owner don warn you o!',
	owner_collect: 'Owner don collect e ball!',
};

export function ownerReaction(hits) {
	const count = Math.max(0, Number.isFinite(hits) ? hits : 0);
	if (count >= OWNER_LIMITS.collectAt) return { stage: 'collect', tone: 'red', commentary: 'owner_collect' };
	if (count >= OWNER_LIMITS.vexStart) return { stage: 'vexed', tone: 'red', commentary: 'owner_vex' };
	if (count >= OWNER_LIMITS.warnStart) return { stage: 'warning', tone: 'yellow', commentary: 'owner_2' };
	if (count > 0) return { stage: 'alert', tone: 'yellow', commentary: 'owner_1' };
	return { stage: 'calm', tone: 'none', commentary: null };
}
