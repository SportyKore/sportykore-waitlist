export const COMMENTARY_PRIORITY = {
	kickoff: 10,
	near_miss: 10,
	goal_kick: 15,
	save: 20,
	goal: 30,
	owner_1: 40,
	owner_2: 50,
	owner_warn: 55,
	owner_vex: 60,
	time_low: 70,
	own_goal_player: 80,
	own_goal_cpu: 80,
	owner_collect: 90,
	full_time: 100,
};

export function commentaryPriority(eventName) {
	return COMMENTARY_PRIORITY[eventName] || 0;
}

export function shouldInterruptCommentary({ nextEvent, activePriority = 0, isActive = false }) {
	if (!isActive) return true;
	return commentaryPriority(nextEvent) > activePriority;
}
